import * as cheerio from "cheerio";
import { runSEOChecks } from "./seo-checks";
import { runGEOChecks } from "./geo-checks";
import { runPlatformChecks } from "./platform-checks";
import { fetchRobotsTxt } from "./robots-parser";
import { validateStructuredData } from "./schema-validator";
import { generateLlmsTxt } from "./llms-txt-generator";
import { scoreParagraphs } from "./paragraph-scorer";
import type { AnalysisResult, CheckResult, PageContext } from "./types";

/**
 * Scan a URL and return a full AnalysisResult.
 * Extracted from /api/analyze for reuse across the codebase.
 */
export async function scanSite(url: string): Promise<AnalysisResult> {
  // Normalize
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  new URL(url); // validate

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const fetchStart = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LumoraBot/1.0; +https://lumora.dev)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
  const responseTimeMs = Date.now() - fetchStart;

  if (!response.ok) {
    throw new Error(`Site returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const ctx: PageContext = {
    $,
    url,
    html,
    headers,
    responseTimeMs,
    statusCode: response.status,
  };

  const seoChecks = runSEOChecks(ctx);
  const geoChecks = runGEOChecks(ctx);
  const allChecks = [...seoChecks, ...geoChecks];

  // Fetch robots.txt and run platform-specific checks
  const robotsTxt = await fetchRobotsTxt(url);
  const platformScores = runPlatformChecks(ctx, robotsTxt);

  // Deep structured data validation
  const schemaValidation = validateStructuredData($);

  // Generate llms.txt suggestion
  const llmsTxt = generateLlmsTxt($, url, html);

  // Per-paragraph citability scoring
  const paragraphScores = scoreParagraphs($);

  const seoScore = calcWeightedScore(seoChecks);
  const geoScore = calcWeightedScore(geoChecks);
  const overallScore = Math.round(seoScore * 0.55 + geoScore * 0.45);

  const pageTitle = $("title").first().text().trim() || "Untitled";
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || "";

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    url,
    timestamp: new Date().toISOString(),
    pageTitle,
    metaDescription,
    seoScore,
    geoScore,
    overallScore,
    seoChecks,
    geoChecks,
    platformScores,
    schemaValidation,
    llmsTxt: llmsTxt.content,
    paragraphScores: {
      avgScore: paragraphScores.avgScore,
      topParagraphs: paragraphScores.topParagraphs,
      weakParagraphs: paragraphScores.weakParagraphs,
      total: paragraphScores.paragraphs.length,
    },
    stats: {
      errors: allChecks.filter((c) => c.severity === "error" && c.status !== "pass").length,
      warnings: allChecks.filter((c) => c.severity === "warning" && c.status !== "pass").length,
      notices: allChecks.filter((c) => c.severity === "notice" && c.status !== "pass").length,
      passed: allChecks.filter((c) => c.status === "pass").length,
      total: allChecks.length,
      htmlSize: html.length,
      responseTimeMs,
      wordCount,
    },
  };
}

function calcWeightedScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const simpleRate = passCount / checks.length;

  let totalWeight = 0;
  let passedWeight = 0;
  for (const c of checks) {
    const weight = c.severity === "error" ? 3 : c.severity === "warning" ? 1.5 : 0.5;
    totalWeight += weight;
    if (c.status === "pass") passedWeight += weight;
  }
  const weightedRate = totalWeight > 0 ? passedWeight / totalWeight : 1;
  return Math.round((weightedRate * 0.6 + simpleRate * 0.4) * 100);
}
