import type { CheerioAPI } from "cheerio";
import type { CheckResult } from "./types";

export function runSEOChecks(
  $: CheerioAPI,
  url: string,
  headers: Record<string, string>
): CheckResult[] {
  return [
    checkTitle($),
    checkMetaDescription($),
    checkHeadings($),
    checkImageAlt($),
    checkCanonical($),
    checkRobotsMeta($),
    checkHTTPS(url),
    checkViewport($),
    checkOpenGraph($),
    checkTwitterCards($),
    checkStructuredData($),
    checkInternalLinks($, url),
    checkURLStructure(url),
    checkLanguage($),
  ];
}

function checkTitle($: CheerioAPI): CheckResult {
  const title = $("title").first().text().trim();
  if (!title) {
    return {
      id: "seo-title",
      name: "Title Tag",
      category: "Meta",
      status: "fail",
      score: 0,
      details: "No title tag found on the page.",
      suggestion: "Add a descriptive <title> tag between 50-60 characters.",
    };
  }
  const len = title.length;
  if (len >= 50 && len <= 60) {
    return {
      id: "seo-title",
      name: "Title Tag",
      category: "Meta",
      status: "pass",
      score: 100,
      details: `Title found: "${title}" (${len} chars — optimal length).`,
    };
  }
  if (len >= 30 && len <= 70) {
    return {
      id: "seo-title",
      name: "Title Tag",
      category: "Meta",
      status: "warning",
      score: 70,
      details: `Title found: "${title}" (${len} chars). Ideal is 50-60 characters.`,
      suggestion: `Adjust title length to 50-60 characters for optimal display in search results.`,
    };
  }
  return {
    id: "seo-title",
    name: "Title Tag",
    category: "Meta",
    status: "warning",
    score: 40,
    details: `Title found: "${title}" (${len} chars). ${len < 30 ? "Too short" : "Too long"} for search results.`,
    suggestion: `Rewrite the title to be 50-60 characters. ${len > 70 ? "Search engines will truncate it." : "Add more descriptive keywords."}`,
  };
}

function checkMetaDescription($: CheerioAPI): CheckResult {
  const desc =
    $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc) {
    return {
      id: "seo-meta-desc",
      name: "Meta Description",
      category: "Meta",
      status: "fail",
      score: 0,
      details: "No meta description found.",
      suggestion:
        'Add a <meta name="description" content="..."> tag with 150-160 characters summarizing the page.',
    };
  }
  const len = desc.length;
  if (len >= 120 && len <= 160) {
    return {
      id: "seo-meta-desc",
      name: "Meta Description",
      category: "Meta",
      status: "pass",
      score: 100,
      details: `Meta description found (${len} chars — optimal length).`,
    };
  }
  return {
    id: "seo-meta-desc",
    name: "Meta Description",
    category: "Meta",
    status: "warning",
    score: 60,
    details: `Meta description found (${len} chars). Ideal is 120-160 characters.`,
    suggestion: `Adjust the meta description to 120-160 characters for optimal search display.`,
  };
}

function checkHeadings($: CheerioAPI): CheckResult {
  const h1s = $("h1");
  const h2s = $("h2");
  const h3s = $("h3");

  if (h1s.length === 0) {
    return {
      id: "seo-headings",
      name: "Heading Hierarchy",
      category: "Content",
      status: "fail",
      score: 20,
      details: "No H1 heading found on the page.",
      suggestion: "Add exactly one H1 heading that describes the main topic of the page.",
    };
  }
  if (h1s.length > 1) {
    return {
      id: "seo-headings",
      name: "Heading Hierarchy",
      category: "Content",
      status: "warning",
      score: 60,
      details: `Found ${h1s.length} H1 headings. Best practice is exactly one H1 per page.`,
      suggestion: "Use a single H1 for the main heading. Demote extras to H2.",
    };
  }
  const hasH2 = h2s.length > 0;
  const hasH3 = h3s.length > 0;
  const score = 80 + (hasH2 ? 10 : 0) + (hasH3 ? 10 : 0);
  return {
    id: "seo-headings",
    name: "Heading Hierarchy",
    category: "Content",
    status: score >= 90 ? "pass" : "warning",
    score,
    details: `H1: ${h1s.length}, H2: ${h2s.length}, H3: ${h3s.length}. ${hasH2 && hasH3 ? "Good hierarchy." : "Could use more sub-headings."}`,
    suggestion:
      score < 90
        ? "Add H2 and H3 sub-headings to create a clear content hierarchy."
        : undefined,
  };
}

function checkImageAlt($: CheerioAPI): CheckResult {
  const images = $("img");
  const total = images.length;
  if (total === 0) {
    return {
      id: "seo-img-alt",
      name: "Image Alt Text",
      category: "Content",
      status: "pass",
      score: 100,
      details: "No images found on the page (not applicable).",
    };
  }
  let withAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) withAlt++;
  });
  const ratio = withAlt / total;
  const score = Math.round(ratio * 100);
  if (ratio === 1) {
    return {
      id: "seo-img-alt",
      name: "Image Alt Text",
      category: "Content",
      status: "pass",
      score: 100,
      details: `All ${total} images have alt text.`,
    };
  }
  return {
    id: "seo-img-alt",
    name: "Image Alt Text",
    category: "Content",
    status: ratio >= 0.8 ? "warning" : "fail",
    score,
    details: `${withAlt}/${total} images have alt text (${Math.round(ratio * 100)}%).`,
    suggestion: `Add descriptive alt text to the ${total - withAlt} images missing it for accessibility and SEO.`,
  };
}

function checkCanonical($: CheerioAPI): CheckResult {
  const canonical = $('link[rel="canonical"]').attr("href");
  if (canonical) {
    return {
      id: "seo-canonical",
      name: "Canonical URL",
      category: "Technical",
      status: "pass",
      score: 100,
      details: `Canonical URL set to: ${canonical}`,
    };
  }
  return {
    id: "seo-canonical",
    name: "Canonical URL",
    category: "Technical",
    status: "warning",
    score: 40,
    details: "No canonical URL found.",
    suggestion: 'Add a <link rel="canonical" href="..."> tag to prevent duplicate content issues.',
  };
}

function checkRobotsMeta($: CheerioAPI): CheckResult {
  const robots = $('meta[name="robots"]').attr("content") ?? "";
  if (robots.includes("noindex")) {
    return {
      id: "seo-robots",
      name: "Robots Meta",
      category: "Technical",
      status: "fail",
      score: 0,
      details: `Robots meta is set to "${robots}" — page is blocked from indexing.`,
      suggestion: "Remove 'noindex' if you want this page to appear in search results.",
    };
  }
  if (robots) {
    return {
      id: "seo-robots",
      name: "Robots Meta",
      category: "Technical",
      status: "pass",
      score: 100,
      details: `Robots meta: "${robots}".`,
    };
  }
  return {
    id: "seo-robots",
    name: "Robots Meta",
    category: "Technical",
    status: "pass",
    score: 85,
    details: "No robots meta tag found (defaults to index, follow).",
  };
}

function checkHTTPS(url: string): CheckResult {
  const isHTTPS = url.startsWith("https://");
  return {
    id: "seo-https",
    name: "HTTPS Security",
    category: "Technical",
    status: isHTTPS ? "pass" : "fail",
    score: isHTTPS ? 100 : 0,
    details: isHTTPS
      ? "Site is served over HTTPS."
      : "Site is NOT served over HTTPS.",
    suggestion: isHTTPS
      ? undefined
      : "Migrate to HTTPS. It's a ranking factor and required for user trust.",
  };
}

function checkViewport($: CheerioAPI): CheckResult {
  const viewport = $('meta[name="viewport"]').attr("content");
  if (viewport) {
    return {
      id: "seo-viewport",
      name: "Mobile Viewport",
      category: "Technical",
      status: "pass",
      score: 100,
      details: `Viewport meta tag found: "${viewport}".`,
    };
  }
  return {
    id: "seo-viewport",
    name: "Mobile Viewport",
    category: "Technical",
    status: "fail",
    score: 0,
    details: "No viewport meta tag found.",
    suggestion:
      'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile responsiveness.',
  };
}

function checkOpenGraph($: CheerioAPI): CheckResult {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogUrl = $('meta[property="og:url"]').attr("content");

  const found = [ogTitle, ogDesc, ogImage, ogUrl].filter(Boolean);
  const score = Math.round((found.length / 4) * 100);

  if (found.length === 4) {
    return {
      id: "seo-og",
      name: "Open Graph Tags",
      category: "Social",
      status: "pass",
      score: 100,
      details: "All essential Open Graph tags present (title, description, image, url).",
    };
  }
  const missing: string[] = [];
  if (!ogTitle) missing.push("og:title");
  if (!ogDesc) missing.push("og:description");
  if (!ogImage) missing.push("og:image");
  if (!ogUrl) missing.push("og:url");
  return {
    id: "seo-og",
    name: "Open Graph Tags",
    category: "Social",
    status: found.length >= 2 ? "warning" : "fail",
    score,
    details: `${found.length}/4 Open Graph tags found. Missing: ${missing.join(", ")}.`,
    suggestion: `Add the missing Open Graph tags: ${missing.join(", ")} for better social media sharing.`,
  };
}

function checkTwitterCards($: CheerioAPI): CheckResult {
  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content");

  const found = [twitterCard, twitterTitle, twitterDesc].filter(Boolean);
  const score = Math.round((found.length / 3) * 100);

  if (found.length === 3) {
    return {
      id: "seo-twitter",
      name: "Twitter Cards",
      category: "Social",
      status: "pass",
      score: 100,
      details: `Twitter Card configured: type="${twitterCard}".`,
    };
  }
  const missing: string[] = [];
  if (!twitterCard) missing.push("twitter:card");
  if (!twitterTitle) missing.push("twitter:title");
  if (!twitterDesc) missing.push("twitter:description");
  return {
    id: "seo-twitter",
    name: "Twitter Cards",
    category: "Social",
    status: found.length >= 1 ? "warning" : "fail",
    score,
    details: `${found.length}/3 Twitter Card tags found. Missing: ${missing.join(", ")}.`,
    suggestion: `Add the missing Twitter Card tags: ${missing.join(", ")}.`,
  };
}

function checkStructuredData($: CheerioAPI): CheckResult {
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length > 0) {
    let types: string[] = [];
    jsonLd.each((_, el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        if (data["@type"]) types.push(data["@type"]);
        if (Array.isArray(data["@graph"])) {
          for (const item of data["@graph"]) {
            if (item["@type"]) types.push(item["@type"]);
          }
        }
      } catch {
        /* ignore parse errors */
      }
    });
    return {
      id: "seo-structured",
      name: "Structured Data",
      category: "Technical",
      status: "pass",
      score: 100,
      details: `${jsonLd.length} JSON-LD block(s) found${types.length ? `. Types: ${types.join(", ")}` : ""}.`,
    };
  }
  return {
    id: "seo-structured",
    name: "Structured Data",
    category: "Technical",
    status: "warning",
    score: 30,
    details: "No structured data (JSON-LD) found.",
    suggestion:
      "Add JSON-LD structured data to help search engines understand your content and enable rich results.",
  };
}

function checkInternalLinks($: CheerioAPI, url: string): CheckResult {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = "";
  }
  const links = $("a[href]");
  let internal = 0;
  let external = 0;
  links.each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("/") || href.startsWith("#")) {
      internal++;
    } else {
      try {
        const linkHost = new URL(href).hostname;
        if (linkHost === hostname) internal++;
        else external++;
      } catch {
        internal++;
      }
    }
  });
  const total = internal + external;
  if (total === 0) {
    return {
      id: "seo-links",
      name: "Internal Links",
      category: "Content",
      status: "warning",
      score: 30,
      details: "No links found on the page.",
      suggestion: "Add internal links to help search engines discover and crawl your content.",
    };
  }
  const score = internal >= 3 ? 100 : internal >= 1 ? 70 : 40;
  return {
    id: "seo-links",
    name: "Internal Links",
    category: "Content",
    status: score >= 80 ? "pass" : "warning",
    score,
    details: `Found ${internal} internal and ${external} external links.`,
    suggestion:
      score < 80
        ? "Add more internal links to improve site structure and help crawlers discover content."
        : undefined,
  };
}

function checkURLStructure(url: string): CheckResult {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const issues: string[] = [];

    if (path.includes("_")) issues.push("underscores (use hyphens instead)");
    if (/[A-Z]/.test(path)) issues.push("uppercase characters");
    if (path.includes("//")) issues.push("double slashes");
    if (path.split("/").some((s) => s.length > 60))
      issues.push("segments over 60 characters");

    if (issues.length === 0) {
      return {
        id: "seo-url",
        name: "URL Structure",
        category: "Technical",
        status: "pass",
        score: 100,
        details: `Clean URL structure: ${parsed.pathname || "/"}`,
      };
    }
    return {
      id: "seo-url",
      name: "URL Structure",
      category: "Technical",
      status: "warning",
      score: Math.max(40, 100 - issues.length * 20),
      details: `URL issues: ${issues.join(", ")}.`,
      suggestion: `Fix URL issues: ${issues.join("; ")}. Use short, lowercase, hyphen-separated paths.`,
    };
  } catch {
    return {
      id: "seo-url",
      name: "URL Structure",
      category: "Technical",
      status: "fail",
      score: 0,
      details: "Could not parse the URL.",
    };
  }
}

function checkLanguage($: CheerioAPI): CheckResult {
  const lang = $("html").attr("lang");
  if (lang) {
    return {
      id: "seo-lang",
      name: "Language Declaration",
      category: "Technical",
      status: "pass",
      score: 100,
      details: `Language attribute set to "${lang}".`,
    };
  }
  return {
    id: "seo-lang",
    name: "Language Declaration",
    category: "Technical",
    status: "warning",
    score: 40,
    details: "No lang attribute on the <html> element.",
    suggestion:
      'Add a lang attribute to the <html> tag (e.g., <html lang="en">) for accessibility and SEO.',
  };
}
