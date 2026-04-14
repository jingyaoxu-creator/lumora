import * as cheerio from "cheerio";
import { scanSite } from "./scan-site";
import type { AnalysisResult } from "./types";

/**
 * Light site crawl: fetch sitemap.xml, pick top N URLs, scan each.
 * Falls back to discovering internal links from the homepage if no sitemap.
 */

export interface SiteCrawlResult {
  pages: PageScanResult[];
  aggregate: {
    avgOverall: number;
    avgSeo: number;
    avgGeo: number;
    totalErrors: number;
    totalWarnings: number;
    bestPage: string;
    worstPage: string;
  };
  sitemapFound: boolean;
  pagesScanned: number;
  pagesDiscovered: number;
}

export interface PageScanResult {
  url: string;
  pageTitle: string;
  overallScore: number;
  seoScore: number;
  geoScore: number;
  errors: number;
  warnings: number;
  /** Full analysis is available but not included to save payload size */
}

const MAX_PAGES = 20;
const CONCURRENT = 5;

export async function crawlSite(
  siteUrl: string,
  maxPages = MAX_PAGES,
): Promise<SiteCrawlResult> {
  // Normalize
  if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
    siteUrl = `https://${siteUrl}`;
  }
  const origin = new URL(siteUrl).origin;

  // 1. Try to find URLs from sitemap
  let urls: string[] = [];
  let sitemapFound = false;

  try {
    urls = await fetchSitemapUrls(origin);
    sitemapFound = urls.length > 0;
  } catch {
    // No sitemap
  }

  // 2. If no sitemap, discover internal links from homepage
  if (urls.length === 0) {
    urls = await discoverLinks(siteUrl, origin);
  }

  // Always include the homepage
  if (!urls.includes(siteUrl) && !urls.includes(origin) && !urls.includes(origin + "/")) {
    urls.unshift(siteUrl);
  }

  const discovered = urls.length;

  // Limit to maxPages
  urls = urls.slice(0, maxPages);

  // 3. Scan pages in batches
  const pages: PageScanResult[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENT) {
    const batch = urls.slice(i, i + CONCURRENT);
    const results = await Promise.allSettled(
      batch.map((u) => scanSinglePage(u)),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        pages.push(result.value);
      }
    }
  }

  if (pages.length === 0) {
    return {
      pages: [],
      aggregate: {
        avgOverall: 0,
        avgSeo: 0,
        avgGeo: 0,
        totalErrors: 0,
        totalWarnings: 0,
        bestPage: siteUrl,
        worstPage: siteUrl,
      },
      sitemapFound,
      pagesScanned: 0,
      pagesDiscovered: discovered,
    };
  }

  // 4. Aggregate
  const avgOverall = Math.round(
    pages.reduce((s, p) => s + p.overallScore, 0) / pages.length,
  );
  const avgSeo = Math.round(
    pages.reduce((s, p) => s + p.seoScore, 0) / pages.length,
  );
  const avgGeo = Math.round(
    pages.reduce((s, p) => s + p.geoScore, 0) / pages.length,
  );
  const totalErrors = pages.reduce((s, p) => s + p.errors, 0);
  const totalWarnings = pages.reduce((s, p) => s + p.warnings, 0);

  const sorted = [...pages].sort((a, b) => b.overallScore - a.overallScore);
  const bestPage = sorted[0].url;
  const worstPage = sorted[sorted.length - 1].url;

  return {
    pages,
    aggregate: {
      avgOverall,
      avgSeo,
      avgGeo,
      totalErrors,
      totalWarnings,
      bestPage,
      worstPage,
    },
    sitemapFound,
    pagesScanned: pages.length,
    pagesDiscovered: discovered,
  };
}

async function scanSinglePage(url: string): Promise<PageScanResult | null> {
  try {
    const analysis = await scanSite(url);
    return {
      url: analysis.url,
      pageTitle: analysis.pageTitle,
      overallScore: analysis.overallScore,
      seoScore: analysis.seoScore,
      geoScore: analysis.geoScore,
      errors: analysis.stats.errors,
      warnings: analysis.stats.warnings,
    };
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const urls: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // Try common sitemap locations
    const sitemapUrls = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const res = await fetch(sitemapUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LumoraBot/1.0)" },
        });
        if (!res.ok) continue;

        const xml = await res.text();
        if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) continue;

        const $ = cheerio.load(xml, { xml: true });

        // If sitemap index, get first sitemap
        const sitemapLinks = $("sitemap > loc")
          .map((_, el) => $(el).text().trim())
          .get();

        if (sitemapLinks.length > 0) {
          // Fetch first sub-sitemap
          try {
            const subRes = await fetch(sitemapLinks[0], {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0 (compatible; LumoraBot/1.0)" },
            });
            if (subRes.ok) {
              const subXml = await subRes.text();
              const $sub = cheerio.load(subXml, { xml: true });
              $sub("url > loc").each((_, el) => {
                const loc = $sub(el).text().trim();
                if (loc && loc.startsWith("http")) urls.push(loc);
              });
            }
          } catch {
            // Sub-sitemap fetch failed
          }
        } else {
          // Direct urlset
          $("url > loc").each((_, el) => {
            const loc = $(el).text().trim();
            if (loc && loc.startsWith("http")) urls.push(loc);
          });
        }

        if (urls.length > 0) break;
      } catch {
        continue;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  return urls;
}

async function discoverLinks(
  startUrl: string,
  origin: string,
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(startUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LumoraBot/1.0)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [startUrl];

    const html = await res.text();
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      if (!href) return;

      // Resolve relative URLs
      try {
        const resolved = new URL(href, origin).href;
        // Only same-origin, no fragments, no query params, no file extensions
        if (
          resolved.startsWith(origin) &&
          !resolved.includes("#") &&
          !resolved.match(/\.(pdf|jpg|png|gif|svg|css|js|xml|json|zip|mp4|mp3)$/i)
        ) {
          links.add(resolved.split("?")[0]); // Strip query params
        }
      } catch {
        // Invalid URL
      }
    });

    return Array.from(links);
  } catch {
    return [startUrl];
  }
}
