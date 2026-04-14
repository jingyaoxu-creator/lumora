import type { CheerioAPI } from "cheerio";

/**
 * Generate an llms.txt file from a scanned page.
 *
 * llms.txt is an emerging standard (proposed by Jina AI, adopted by many sites)
 * that provides LLM-friendly structured content at /llms.txt.
 *
 * Format:
 *   # Site Name
 *   > Brief description
 *
 *   ## Section
 *   - [Page Title](url): Description
 */

export interface LlmsTxtResult {
  content: string;
  sections: LlmsTxtSection[];
  metadata: {
    siteName: string;
    description: string;
    url: string;
    pageCount: number;
  };
}

interface LlmsTxtSection {
  title: string;
  links: { title: string; url: string; description: string }[];
}

export function generateLlmsTxt(
  $: CheerioAPI,
  url: string,
  html: string,
): LlmsTxtResult {
  const origin = getOrigin(url);
  const siteName =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim().split(/[|\-–—]/).pop()?.trim() ||
    new URL(url).hostname.replace("www.", "");

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  // Collect all internal links with context
  const linkMap = new Map<string, { title: string; url: string; description: string }>();

  // Add current page
  const pageTitle = $("title").first().text().trim();
  const pageDesc = description || extractFirstParagraph($);
  linkMap.set(url, {
    title: pageTitle || "Home",
    url,
    description: pageDesc.slice(0, 150),
  });

  // Discover internal links from nav, main content, footer
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let resolved: string;
    try {
      resolved = new URL(href, origin).href;
    } catch {
      return;
    }

    // Only same-origin, no fragments, no assets
    if (!resolved.startsWith(origin)) return;
    if (resolved.includes("#") && resolved.split("#")[0] === url) return;
    if (/\.(pdf|jpg|png|gif|svg|css|js|xml|json|zip|mp4|mp3|ico|woff)$/i.test(resolved)) return;

    const cleanUrl = resolved.split("#")[0].split("?")[0];
    if (linkMap.has(cleanUrl)) return;
    if (linkMap.size >= 50) return; // Cap at 50 links

    const linkText = $(el).text().trim();
    if (!linkText || linkText.length < 2) return;

    // Try to get description from surrounding context
    const parentText = $(el).parent().text().trim();
    const desc = parentText.length > linkText.length + 10
      ? parentText.replace(linkText, "").trim().slice(0, 120)
      : "";

    linkMap.set(cleanUrl, {
      title: linkText,
      url: cleanUrl,
      description: desc,
    });
  });

  // Group links into sections by URL path pattern
  const sections = groupLinksIntoSections(Array.from(linkMap.values()), origin);

  // Build llms.txt content
  const lines: string[] = [];
  lines.push(`# ${siteName}`);
  lines.push("");
  if (description) {
    lines.push(`> ${description}`);
    lines.push("");
  }

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    for (const link of section.links) {
      if (link.description) {
        lines.push(`- [${link.title}](${link.url}): ${link.description}`);
      } else {
        lines.push(`- [${link.title}](${link.url})`);
      }
    }
    lines.push("");
  }

  // Add optional metadata
  lines.push("## Optional");
  lines.push("");
  lines.push(`- [llms-full.txt](${origin}/llms-full.txt): Full content for LLM consumption`);

  const content = lines.join("\n");

  return {
    content,
    sections,
    metadata: {
      siteName,
      description,
      url,
      pageCount: linkMap.size,
    },
  };
}

function extractFirstParagraph($: CheerioAPI): string {
  let text = "";
  $("main p, article p, .content p, #content p, body p").each((_, el) => {
    if (text) return;
    const t = $(el).text().trim();
    if (t.length > 50) text = t;
  });
  return text.slice(0, 200);
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function groupLinksIntoSections(
  links: { title: string; url: string; description: string }[],
  origin: string,
): LlmsTxtSection[] {
  const groups: Record<string, { title: string; url: string; description: string }[]> = {};

  for (const link of links) {
    const path = link.url.replace(origin, "");
    const parts = path.split("/").filter(Boolean);

    let section: string;
    if (parts.length === 0) {
      section = "Main";
    } else if (parts[0] === "blog" || parts[0] === "posts" || parts[0] === "articles") {
      section = "Blog";
    } else if (parts[0] === "docs" || parts[0] === "documentation" || parts[0] === "guide") {
      section = "Documentation";
    } else if (parts[0] === "api" || parts[0] === "reference") {
      section = "API Reference";
    } else if (parts[0] === "about" || parts[0] === "team" || parts[0] === "contact") {
      section = "About";
    } else if (parts[0] === "pricing" || parts[0] === "plans") {
      section = "Pricing";
    } else if (parts[0] === "products" || parts[0] === "features" || parts[0] === "solutions") {
      section = "Products";
    } else if (parts[0] === "help" || parts[0] === "support" || parts[0] === "faq") {
      section = "Support";
    } else if (parts[0] === "legal" || parts[0] === "privacy" || parts[0] === "terms") {
      section = "Legal";
    } else if (parts.length === 1) {
      section = "Pages";
    } else {
      // Use first path segment, capitalized
      section = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ");
    }

    if (!groups[section]) groups[section] = [];
    groups[section].push(link);
  }

  // Sort: Main first, then alphabetical
  const order = ["Main", "Products", "Documentation", "API Reference", "Blog", "About", "Pricing", "Support", "Pages", "Legal"];
  const sorted = Object.entries(groups).sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    const aIdx = ai === -1 ? 100 : ai;
    const bIdx = bi === -1 ? 100 : bi;
    return aIdx - bIdx;
  });

  return sorted.map(([title, sectionLinks]) => ({
    title,
    links: sectionLinks.slice(0, 15), // Max 15 per section
  }));
}
