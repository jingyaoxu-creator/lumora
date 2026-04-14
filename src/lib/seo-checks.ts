import type { CheerioAPI } from "cheerio";
import type { CheckResult, PageContext } from "./types";

/**
 * Professional SEO audit engine
 * 68 checks across 9 categories:
 *   Meta Tags, Content, Headings, Links, Technical, HTTPS & Security,
 *   Performance, Social & Markup, Accessibility
 */
export function runSEOChecks(ctx: PageContext): CheckResult[] {
  const { $, url, html, headers } = ctx;
  return [
    // ─── Meta Tags ───
    checkTitle($),
    checkTitleLength($),
    checkMetaDescription($),
    checkMetaDescriptionLength($),
    checkMetaKeywords($),
    checkMetaRobots($),
    checkMetaViewport($),
    checkCharacterEncoding($, html),
    checkDoctype(html),
    checkMetaRefresh($),

    // ─── Headings ───
    checkH1Presence($),
    checkMultipleH1($),
    checkH1TitleDuplicate($),
    checkHeadingHierarchy($),
    checkHeadingKeywordStuffing($),

    // ─── Content ───
    checkWordCount($),
    checkTextToHtmlRatio($, html),
    checkImageAlt($),
    checkImagesWithoutDimensions($),
    checkBrokenImageSrc($),
    checkLazyLoadingImages($),
    checkIframeUsage($),
    checkDeprecatedHtml($),
    checkInlineStyles($),

    // ─── Links ───
    checkInternalLinks($, url),
    checkExternalLinks($, url),
    checkTooManyLinks($),
    checkNofollowInternalLinks($, url),
    checkEmptyAnchorText($),
    checkGenericAnchorText($),
    checkBrokenAnchors($),
    checkUrlLength(url),
    checkUrlParameters(url),
    checkUrlUnderscores(url),
    checkUrlUppercase(url),

    // ─── Technical ───
    checkCanonical($),
    checkMultipleCanonicals($),
    checkLanguage($),
    checkHreflang($),
    checkStructuredData($),
    checkStructuredDataValidity($),
    checkUrlStructure(url),

    // ─── HTTPS & Security ───
    checkHTTPS(url),
    checkMixedContent($, url),
    checkHSTS(headers),
    checkXContentTypeOptions(headers),
    checkXFrameOptions(headers),
    checkContentSecurityPolicy(headers),

    // ─── Performance ───
    checkHtmlSize(html),
    checkCompression(headers),
    checkCacheControl(headers),
    checkResourceHints($),
    checkRenderBlockingResources($),
    checkResponseTime(ctx.responseTimeMs),

    // ─── Social & Open Graph ───
    checkOpenGraph($),
    checkTwitterCards($),
    checkFavicon($),
    checkSocialMetaCompleteness($),

    // ─── Accessibility ───
    checkFormLabels($),
    checkAriaLandmarks($),
    checkColorContrastHints($),
    checkSkipNavigation($),
    checkAltTextQuality($),
    checkFocusableElements($),
    checkLanguageDirection($),

    // ─── Additional Technical ───
    checkMobileFriendlyMeta($),
    checkPaginationLinks($),
    checkContentTypeHeader(headers),
  ];
}

// ═══════════════════════════════════════════════════════════════
//  META TAGS
// ═══════════════════════════════════════════════════════════════

function checkTitle($: CheerioAPI): CheckResult {
  const title = $("title").first().text().trim();
  if (!title) {
    return cr("seo-title", "Title Tag Missing", "Meta Tags", "fail", "error", 0,
      "No <title> tag found. This is critical — search engines use it as the main clickable link.",
      'Add a <title> tag with 50-60 chars: <title>Your Page Title | Brand</title>');
  }
  return cr("seo-title", "Title Tag Present", "Meta Tags", "pass", "notice", 100,
    `Title found: "${truncate(title, 60)}"`);
}

function checkTitleLength($: CheerioAPI): CheckResult {
  const title = $("title").first().text().trim();
  if (!title) return cr("seo-title-len", "Title Tag Length", "Meta Tags", "fail", "error", 0, "No title tag to measure.");
  const len = title.length;
  if (len >= 50 && len <= 60)
    return cr("seo-title-len", "Title Tag Length", "Meta Tags", "pass", "notice", 100,
      `Title length is ${len} chars (optimal: 50-60).`);
  if (len < 10)
    return cr("seo-title-len", "Title Tag Length", "Meta Tags", "fail", "warning", 20,
      `Title is only ${len} chars — too short for search results.`,
      "Expand the title to 50-60 characters with descriptive keywords.");
  if (len > 70)
    return cr("seo-title-len", "Title Tag Length", "Meta Tags", "warning", "warning", 50,
      `Title is ${len} chars — will be truncated in SERPs (max ~60).`,
      "Shorten the title to under 60 characters to avoid truncation.");
  return cr("seo-title-len", "Title Tag Length", "Meta Tags", "warning", "notice", 70,
    `Title is ${len} chars (optimal is 50-60).`,
    "Fine-tune the title to 50-60 characters for optimal display.");
}

function checkMetaDescription($: CheerioAPI): CheckResult {
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc)
    return cr("seo-meta-desc", "Meta Description Missing", "Meta Tags", "fail", "warning", 0,
      "No meta description found. Search engines may auto-generate one from page content.",
      'Add <meta name="description" content="150-160 char summary of the page.">');
  return cr("seo-meta-desc", "Meta Description Present", "Meta Tags", "pass", "notice", 100,
    `Meta description found (${desc.length} chars).`);
}

function checkMetaDescriptionLength($: CheerioAPI): CheckResult {
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc) return cr("seo-meta-desc-len", "Meta Description Length", "Meta Tags", "fail", "warning", 0, "No meta description to measure.");
  const len = desc.length;
  if (len >= 120 && len <= 160)
    return cr("seo-meta-desc-len", "Meta Description Length", "Meta Tags", "pass", "notice", 100,
      `Meta description is ${len} chars (optimal: 120-160).`);
  if (len < 70)
    return cr("seo-meta-desc-len", "Meta Description Length", "Meta Tags", "warning", "warning", 40,
      `Meta description is only ${len} chars — too short.`,
      "Expand to 120-160 characters for maximum SERP real estate.");
  if (len > 160)
    return cr("seo-meta-desc-len", "Meta Description Length", "Meta Tags", "warning", "warning", 60,
      `Meta description is ${len} chars — will be truncated (max ~160).`,
      "Shorten to under 160 characters to prevent truncation.");
  return cr("seo-meta-desc-len", "Meta Description Length", "Meta Tags", "warning", "notice", 75,
    `Meta description is ${len} chars (optimal is 120-160).`);
}

function checkMetaKeywords($: CheerioAPI): CheckResult {
  const keywords = $('meta[name="keywords"]').attr("content")?.trim();
  if (keywords)
    return cr("seo-meta-keywords", "Meta Keywords (Deprecated)", "Meta Tags", "warning", "notice", 80,
      `Meta keywords tag found ("${truncate(keywords, 40)}"). Most search engines ignore this tag.`,
      "Consider removing the meta keywords tag — it has no SEO value since 2009 and can reveal strategy to competitors.");
  return cr("seo-meta-keywords", "Meta Keywords (Deprecated)", "Meta Tags", "pass", "notice", 100,
    "No deprecated meta keywords tag (correct behavior).");
}

function checkMetaRobots($: CheerioAPI): CheckResult {
  const robots = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const googlebot = $('meta[name="googlebot"]').attr("content")?.toLowerCase() ?? "";
  const combined = `${robots} ${googlebot}`;
  if (combined.includes("noindex"))
    return cr("seo-robots", "Robots: Noindex Detected", "Meta Tags", "fail", "error", 0,
      `Page is blocked from indexing (robots: "${robots}"${googlebot ? `, googlebot: "${googlebot}"` : ""}).`,
      "Remove 'noindex' if this page should appear in search results.");
  if (combined.includes("nofollow"))
    return cr("seo-robots", "Robots: Nofollow Detected", "Meta Tags", "warning", "warning", 50,
      `Links on this page won't pass equity (${robots ? `robots: "${robots}"` : `googlebot: "${googlebot}"`}).`,
      "Remove 'nofollow' unless you intentionally want to block link equity flow.");
  if (robots)
    return cr("seo-robots", "Robots Meta", "Meta Tags", "pass", "notice", 100,
      `Robots directive: "${robots}".`);
  return cr("seo-robots", "Robots Meta", "Meta Tags", "pass", "notice", 90,
    "No robots meta tag (defaults to index, follow).");
}

function checkMetaViewport($: CheerioAPI): CheckResult {
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport)
    return cr("seo-viewport", "Viewport Meta Missing", "Meta Tags", "fail", "error", 0,
      "No viewport meta tag found. Page won't render correctly on mobile.",
      '<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (!viewport.includes("width=device-width"))
    return cr("seo-viewport", "Viewport Configuration", "Meta Tags", "warning", "warning", 60,
      `Viewport found but missing 'width=device-width': "${viewport}".`,
      'Add width=device-width for proper mobile rendering.');
  return cr("seo-viewport", "Viewport Meta", "Meta Tags", "pass", "notice", 100,
    `Viewport correctly configured: "${viewport}".`);
}

function checkCharacterEncoding($: CheerioAPI, html: string): CheckResult {
  const charset = $('meta[charset]').attr("charset") ??
    $('meta[http-equiv="Content-Type"]').attr("content");
  if (!charset && !html.toLowerCase().includes("charset"))
    return cr("seo-charset", "Character Encoding Missing", "Meta Tags", "warning", "warning", 40,
      "No character encoding declared. Browsers may misinterpret special characters.",
      'Add <meta charset="utf-8"> as the first element in <head>.');
  return cr("seo-charset", "Character Encoding", "Meta Tags", "pass", "notice", 100,
    `Character encoding declared${charset ? `: ${charset}` : ""}.`);
}

function checkDoctype(html: string): CheckResult {
  const hasDoctype = /^\s*<!doctype\s+html/i.test(html);
  if (!hasDoctype)
    return cr("seo-doctype", "DOCTYPE Missing", "Meta Tags", "warning", "warning", 40,
      "No <!DOCTYPE html> found. Browser may render in quirks mode.",
      "Add <!DOCTYPE html> as the very first line of the HTML document.");
  return cr("seo-doctype", "DOCTYPE Declaration", "Meta Tags", "pass", "notice", 100,
    "<!DOCTYPE html> correctly declared.");
}

function checkMetaRefresh($: CheerioAPI): CheckResult {
  const refresh = $('meta[http-equiv="refresh"]').attr("content");
  if (refresh)
    return cr("seo-meta-refresh", "Meta Refresh Redirect", "Meta Tags", "fail", "error", 10,
      `Meta refresh detected: "${truncate(refresh, 50)}". This is bad for SEO.`,
      "Replace meta refresh with a proper 301 server-side redirect.");
  return cr("seo-meta-refresh", "No Meta Refresh", "Meta Tags", "pass", "notice", 100,
    "No deprecated meta refresh redirects found.");
}

// ═══════════════════════════════════════════════════════════════
//  HEADINGS
// ═══════════════════════════════════════════════════════════════

function checkH1Presence($: CheerioAPI): CheckResult {
  const h1s = $("h1");
  if (h1s.length === 0)
    return cr("seo-h1", "H1 Heading Missing", "Headings", "fail", "warning", 0,
      "No H1 heading found. This is the most important on-page heading for SEO.",
      "Add a single H1 heading that clearly describes the page's main topic.");
  return cr("seo-h1", "H1 Heading Present", "Headings", "pass", "notice", 100,
    `H1 found: "${truncate($("h1").first().text().trim(), 60)}".`);
}

function checkMultipleH1($: CheerioAPI): CheckResult {
  const h1s = $("h1");
  if (h1s.length > 1)
    return cr("seo-multiple-h1", "Multiple H1 Tags", "Headings", "warning", "warning", 50,
      `Found ${h1s.length} H1 headings. Best practice is exactly one H1 per page.`,
      "Keep only one H1 for the main heading. Convert extras to H2 tags.");
  if (h1s.length === 0)
    return cr("seo-multiple-h1", "H1 Count", "Headings", "fail", "warning", 0, "No H1 found.");
  return cr("seo-multiple-h1", "Single H1", "Headings", "pass", "notice", 100,
    "Exactly one H1 heading (correct).");
}

function checkH1TitleDuplicate($: CheerioAPI): CheckResult {
  const title = $("title").first().text().trim().toLowerCase();
  const h1 = $("h1").first().text().trim().toLowerCase();
  if (!title || !h1)
    return cr("seo-h1-title-dup", "H1/Title Duplicate", "Headings", "pass", "notice", 80,
      "Could not compare — title or H1 missing.");
  if (title === h1)
    return cr("seo-h1-title-dup", "H1 Identical to Title", "Headings", "warning", "warning", 50,
      "H1 text is identical to the title tag. This wastes an opportunity for keyword variation.",
      "Differentiate the H1 from the title tag — use synonyms or expand on the topic.");
  return cr("seo-h1-title-dup", "H1/Title Differentiated", "Headings", "pass", "notice", 100,
    "H1 and title tag use different text (good for keyword variety).");
}

function checkHeadingHierarchy($: CheerioAPI): CheckResult {
  const levels: number[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    levels.push(parseInt(el.tagName.replace("h", "")));
  });
  if (levels.length === 0)
    return cr("seo-heading-hierarchy", "Heading Hierarchy", "Headings", "fail", "warning", 0,
      "No headings found at all.", "Add a structured heading hierarchy: H1 → H2 → H3.");
  const skips: string[] = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1)
      skips.push(`H${levels[i - 1]} → H${levels[i]}`);
  }
  const h2Count = levels.filter(l => l === 2).length;
  const h3Count = levels.filter(l => l === 3).length;
  if (skips.length > 0)
    return cr("seo-heading-hierarchy", "Heading Levels Skipped", "Headings", "warning", "warning",
      Math.max(30, 80 - skips.length * 15),
      `Heading hierarchy skips detected: ${skips.join(", ")}. Total: H1:${levels.filter(l => l === 1).length} H2:${h2Count} H3:${h3Count}.`,
      "Don't skip heading levels (e.g., H1 → H3). Use H1 → H2 → H3 in order.");
  const score = 70 + (h2Count >= 2 ? 15 : 0) + (h3Count >= 1 ? 15 : 0);
  return cr("seo-heading-hierarchy", "Heading Hierarchy", "Headings",
    score >= 90 ? "pass" : "warning", "notice", Math.min(score, 100),
    `Good hierarchy. H1:${levels.filter(l => l === 1).length} H2:${h2Count} H3:${h3Count} H4+:${levels.filter(l => l >= 4).length}.`,
    score < 90 ? "Add more H2/H3 sub-headings for a richer content structure." : undefined);
}

function checkHeadingKeywordStuffing($: CheerioAPI): CheckResult {
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => { headings.push($(el).text().trim().toLowerCase()); });
  if (headings.length < 3)
    return cr("seo-heading-stuffing", "Heading Diversity", "Headings", "pass", "notice", 85,
      `${headings.length} headings found — too few to assess diversity.`);
  // Check for repeated words across headings
  const wordCounts: Record<string, number> = {};
  headings.forEach(h => h.split(/\s+/).filter(w => w.length > 3).forEach(w => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }));
  const stuffed = Object.entries(wordCounts).filter(([, c]) => c >= headings.length * 0.7 && c >= 3);
  if (stuffed.length > 0)
    return cr("seo-heading-stuffing", "Keyword Stuffing in Headings", "Headings", "warning", "warning", 40,
      `Repeated words across headings: ${stuffed.map(([w, c]) => `"${w}" (${c}x)`).join(", ")}.`,
      "Vary your heading text. Repeating the same keywords looks spammy to search engines.");
  return cr("seo-heading-stuffing", "Heading Diversity", "Headings", "pass", "notice", 100,
    "Headings use varied, natural language.");
}

// ═══════════════════════════════════════════════════════════════
//  CONTENT
// ═══════════════════════════════════════════════════════════════

function checkWordCount($: CheerioAPI): CheckResult {
  const text = getBodyText($);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 100)
    return cr("seo-word-count", "Thin Content", "Content", "fail", "warning", 15,
      `Only ${words} words — extremely thin content. Search engines may not index this.`,
      "Add at least 300 words of unique, valuable content. Aim for 800+ for competitive topics.");
  if (words < 300)
    return cr("seo-word-count", "Low Word Count", "Content", "warning", "warning", 40,
      `${words} words — below the 300-word minimum for meaningful content.`,
      "Expand content to at least 300 words with useful information.");
  if (words >= 800)
    return cr("seo-word-count", "Word Count", "Content", "pass", "notice", 100,
      `${words.toLocaleString()} words — comprehensive content depth.`);
  return cr("seo-word-count", "Word Count", "Content", "pass", "notice", 80,
    `${words} words — adequate content.`,
    "Consider expanding to 800+ words for more competitive ranking potential.");
}

function checkTextToHtmlRatio($: CheerioAPI, html: string): CheckResult {
  const text = getBodyText($);
  const textLen = text.length;
  const htmlLen = html.length;
  if (htmlLen === 0)
    return cr("seo-text-ratio", "Text-to-HTML Ratio", "Content", "fail", "warning", 0, "Empty HTML.");
  const ratio = (textLen / htmlLen) * 100;
  if (ratio >= 25)
    return cr("seo-text-ratio", "Text-to-HTML Ratio", "Content", "pass", "notice", 100,
      `Text-to-HTML ratio is ${ratio.toFixed(1)}% (good — above 25%).`);
  if (ratio >= 10)
    return cr("seo-text-ratio", "Text-to-HTML Ratio", "Content", "warning", "notice", 65,
      `Text-to-HTML ratio is ${ratio.toFixed(1)}% (acceptable but could improve).`,
      "Reduce unnecessary HTML/CSS/JS bloat or add more text content. Aim for >25%.");
  return cr("seo-text-ratio", "Low Text-to-HTML Ratio", "Content", "warning", "warning", 30,
    `Text-to-HTML ratio is only ${ratio.toFixed(1)}% (very low — lots of code, little text).`,
    "Page has excessive code relative to content. Clean up inline styles/scripts and add more text.");
}

function checkImageAlt($: CheerioAPI): CheckResult {
  const images = $("img");
  const total = images.length;
  if (total === 0)
    return cr("seo-img-alt", "Image Alt Text", "Content", "pass", "notice", 100,
      "No images found (N/A).");
  let withAlt = 0;
  images.each((_, el) => { if ($(el).attr("alt")?.trim()) withAlt++; });
  const missing = total - withAlt;
  const ratio = withAlt / total;
  if (ratio === 1)
    return cr("seo-img-alt", "Image Alt Text", "Content", "pass", "notice", 100,
      `All ${total} images have alt text.`);
  return cr("seo-img-alt", "Images Without Alt Text", "Content",
    ratio >= 0.7 ? "warning" : "fail", ratio >= 0.7 ? "warning" : "error",
    Math.round(ratio * 100),
    `${missing} of ${total} images missing alt text (${Math.round((1 - ratio) * 100)}%).`,
    `Add descriptive alt text to ${missing} images for accessibility and SEO.`);
}

function checkImagesWithoutDimensions($: CheerioAPI): CheckResult {
  const images = $("img");
  const total = images.length;
  if (total === 0)
    return cr("seo-img-dims", "Image Dimensions", "Content", "pass", "notice", 100, "No images found.");
  let missing = 0;
  images.each((_, el) => {
    const $el = $(el);
    if (!$el.attr("width") && !$el.attr("height") && !$el.attr("style")?.includes("width"))
      missing++;
  });
  if (missing === 0)
    return cr("seo-img-dims", "Image Dimensions", "Content", "pass", "notice", 100,
      `All ${total} images have explicit dimensions.`);
  return cr("seo-img-dims", "Images Without Dimensions", "Content", "warning", "warning",
    Math.round((1 - missing / total) * 100),
    `${missing} of ${total} images missing width/height attributes. Causes layout shifts (CLS).`,
    "Add width and height attributes to all <img> tags to prevent Cumulative Layout Shift.");
}

function checkBrokenImageSrc($: CheerioAPI): CheckResult {
  const images = $("img");
  let broken = 0;
  const issues: string[] = [];
  images.each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!src || src === "#" || src === "about:blank") { broken++; issues.push(src || "(empty)"); }
  });
  if (broken === 0)
    return cr("seo-img-src", "Image Sources", "Content", "pass", "notice", 100,
      `All ${images.length} image sources appear valid.`);
  return cr("seo-img-src", "Broken Image Sources", "Content", "fail", "error",
    Math.max(0, 100 - broken * 20),
    `${broken} image(s) with empty or invalid src: ${issues.slice(0, 3).join(", ")}${issues.length > 3 ? "..." : ""}.`,
    "Fix or remove images with empty/broken src attributes.");
}

function checkLazyLoadingImages($: CheerioAPI): CheckResult {
  const images = $("img");
  const total = images.length;
  if (total <= 3)
    return cr("seo-lazy-load", "Image Lazy Loading", "Content", "pass", "notice", 100,
      `${total} images — too few to need lazy loading.`);
  let lazy = 0;
  images.each((_, el) => {
    const $el = $(el);
    if ($el.attr("loading") === "lazy" || $el.attr("data-src") || $el.attr("data-lazy"))
      lazy++;
  });
  const ratio = lazy / total;
  if (ratio >= 0.5)
    return cr("seo-lazy-load", "Image Lazy Loading", "Content", "pass", "notice", 100,
      `${lazy}/${total} images use lazy loading.`);
  return cr("seo-lazy-load", "Missing Lazy Loading", "Content", "warning", "notice",
    Math.round(40 + ratio * 60),
    `Only ${lazy}/${total} images use lazy loading. The rest load eagerly.`,
    'Add loading="lazy" to below-the-fold images to improve page load speed.');
}

function checkIframeUsage($: CheerioAPI): CheckResult {
  const iframes = $("iframe");
  if (iframes.length === 0)
    return cr("seo-iframes", "IFrame Usage", "Content", "pass", "notice", 100, "No iframes found.");
  const titles = iframes.toArray().filter(el => !$(el).attr("title")).length;
  return cr("seo-iframes", "IFrame Usage", "Content", "warning", "notice",
    Math.max(60, 100 - iframes.length * 10),
    `${iframes.length} iframe(s) found${titles > 0 ? `, ${titles} without title attribute` : ""}.`,
    "Iframes can slow page loads and are not indexed by search engines. Ensure all have title attributes for accessibility.");
}

function checkDeprecatedHtml($: CheerioAPI): CheckResult {
  const deprecated = $("font, center, marquee, blink, big, strike, applet, frame, frameset, basefont");
  if (deprecated.length === 0)
    return cr("seo-deprecated", "Deprecated HTML", "Content", "pass", "notice", 100,
      "No deprecated HTML elements found.");
  const tags = [...new Set(deprecated.toArray().map(el => el.tagName))];
  return cr("seo-deprecated", "Deprecated HTML Elements", "Content", "warning", "warning",
    Math.max(30, 100 - deprecated.length * 15),
    `Found deprecated elements: <${tags.join(">, <")}>. These trigger quirks mode.`,
    "Replace deprecated HTML elements with modern CSS alternatives.");
}

function checkInlineStyles($: CheerioAPI): CheckResult {
  const styled = $("[style]");
  const total = styled.length;
  if (total <= 5)
    return cr("seo-inline-styles", "Inline Styles", "Content", "pass", "notice", 100,
      `${total} inline styles (acceptable).`);
  if (total <= 20)
    return cr("seo-inline-styles", "Excessive Inline Styles", "Content", "warning", "notice", 70,
      `${total} elements with inline styles. Consider using CSS classes.`,
      "Move inline styles to external CSS for better maintainability and caching.");
  return cr("seo-inline-styles", "Excessive Inline Styles", "Content", "warning", "warning", 40,
    `${total} elements with inline styles — very bloated.`,
    "Extract inline styles into CSS classes. This reduces HTML size and improves caching.");
}

// ═══════════════════════════════════════════════════════════════
//  LINKS
// ═══════════════════════════════════════════════════════════════

function checkInternalLinks($: CheerioAPI, url: string): CheckResult {
  const hostname = safeHostname(url);
  let internal = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (isInternal(href, hostname)) internal++;
  });
  if (internal === 0)
    return cr("seo-internal-links", "No Internal Links", "Links", "fail", "warning", 10,
      "No internal links found. This hurts crawlability and page discovery.",
      "Add internal links to related pages to help search engines crawl your site.");
  if (internal < 3)
    return cr("seo-internal-links", "Few Internal Links", "Links", "warning", "warning", 50,
      `Only ${internal} internal links. Pages need more for proper link equity distribution.`,
      "Add at least 3-5 internal links pointing to relevant pages on your site.");
  return cr("seo-internal-links", "Internal Links", "Links", "pass", "notice", 100,
    `${internal} internal links found — good for crawlability.`);
}

function checkExternalLinks($: CheerioAPI, url: string): CheckResult {
  const hostname = safeHostname(url);
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("http") && !isInternal(href, hostname)) external++;
  });
  if (external === 0)
    return cr("seo-external-links", "No External Links", "Links", "warning", "notice", 70,
      "No external links. Linking to authoritative sources can boost credibility.",
      "Add links to reputable external sources to support your content claims.");
  return cr("seo-external-links", "External Links", "Links", "pass", "notice", 100,
    `${external} external links found.`);
}

function checkTooManyLinks($: CheerioAPI): CheckResult {
  const total = $("a[href]").length;
  if (total > 3000)
    return cr("seo-too-many-links", "Excessive Links", "Links", "fail", "error", 10,
      `${total} links on page — exceeds 3,000 limit. Google may not follow all of them.`,
      "Reduce links to under 3,000. Consider pagination or removing non-essential links.");
  if (total > 500)
    return cr("seo-too-many-links", "Many Links", "Links", "warning", "warning", 60,
      `${total} links on page. Very high link count dilutes link equity.`,
      "Review and reduce unnecessary links to improve link equity distribution.");
  if (total > 200)
    return cr("seo-too-many-links", "Link Count", "Links", "pass", "notice", 85,
      `${total} links on page — above average but acceptable.`);
  return cr("seo-too-many-links", "Link Count", "Links", "pass", "notice", 100,
    `${total} links on page (healthy).`);
}

function checkNofollowInternalLinks($: CheerioAPI, url: string): CheckResult {
  const hostname = safeHostname(url);
  let nofollowed = 0;
  let totalInternal = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (isInternal(href, hostname)) {
      totalInternal++;
      const rel = $(el).attr("rel")?.toLowerCase() ?? "";
      if (rel.includes("nofollow")) nofollowed++;
    }
  });
  if (nofollowed === 0)
    return cr("seo-nofollow-internal", "Internal Nofollow Links", "Links", "pass", "notice", 100,
      "No internal links have nofollow (correct — link equity flows freely).");
  return cr("seo-nofollow-internal", "Internal Links With Nofollow", "Links", "warning", "warning",
    Math.max(30, 100 - nofollowed * 15),
    `${nofollowed} of ${totalInternal} internal links have rel="nofollow". This blocks link equity flow.`,
    "Remove nofollow from internal links so search engines can follow and index those pages.");
}

function checkEmptyAnchorText($: CheerioAPI): CheckResult {
  let empty = 0;
  $("a[href]").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const img = $el.find("img");
    const aria = $el.attr("aria-label");
    if (!text && img.length === 0 && !aria) empty++;
  });
  if (empty === 0)
    return cr("seo-empty-anchor", "Empty Anchor Text", "Links", "pass", "notice", 100,
      "All links have anchor text or accessible labels.");
  return cr("seo-empty-anchor", "Links With Empty Anchor Text", "Links", "warning", "warning",
    Math.max(40, 100 - empty * 10),
    `${empty} link(s) have no anchor text, image, or aria-label.`,
    "Add descriptive text or aria-label to all links for accessibility and SEO.");
}

function checkGenericAnchorText($: CheerioAPI): CheckResult {
  const generic = /^(click here|read more|learn more|here|link|more|this|page|go|see more)$/i;
  let count = 0;
  $("a[href]").each((_, el) => {
    if (generic.test($(el).text().trim())) count++;
  });
  if (count === 0)
    return cr("seo-generic-anchor", "Descriptive Anchor Text", "Links", "pass", "notice", 100,
      "All links use descriptive anchor text.");
  return cr("seo-generic-anchor", "Generic Anchor Text", "Links", "warning", "notice",
    Math.max(50, 100 - count * 8),
    `${count} link(s) use generic text like "click here" or "read more".`,
    "Replace generic anchor text with descriptive keywords that tell users and search engines what the linked page is about.");
}

function checkBrokenAnchors($: CheerioAPI): CheckResult {
  let broken = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href === "#" || href === "" || href === "javascript:void(0)" || href === "javascript:;") broken++;
  });
  if (broken === 0)
    return cr("seo-broken-anchors", "Anchor Destinations", "Links", "pass", "notice", 100,
      "All links have valid destinations.");
  return cr("seo-broken-anchors", "Empty/Dead Links", "Links", "warning", "warning",
    Math.max(40, 100 - broken * 8),
    `${broken} link(s) point to "#", empty string, or javascript:void(0).`,
    "Fix or remove dead links. Use <button> for interactive elements that don't navigate.");
}

function checkUrlLength(url: string): CheckResult {
  const len = url.length;
  if (len > 2000)
    return cr("seo-url-length", "URL Too Long", "Links", "fail", "error", 10,
      `URL is ${len} chars — exceeds 2,000 char browser limit.`,
      "Shorten the URL. Some browsers and servers can't handle URLs over 2,000 characters.");
  if (len > 200)
    return cr("seo-url-length", "Long URL", "Links", "warning", "notice", 65,
      `URL is ${len} chars — longer than recommended 200 chars.`,
      "Shorter URLs are easier to share and tend to rank better.");
  return cr("seo-url-length", "URL Length", "Links", "pass", "notice", 100,
    `URL length is ${len} chars (good).`);
}

function checkUrlParameters(url: string): CheckResult {
  try {
    const parsed = new URL(url);
    const params = [...parsed.searchParams].length;
    if (params > 4)
      return cr("seo-url-params", "Too Many URL Parameters", "Links", "warning", "warning", 40,
        `URL has ${params} query parameters. Excessive parameters hurt crawl efficiency.`,
        "Reduce URL parameters to 4 or fewer. Use URL rewriting for cleaner URLs.");
    if (params > 0)
      return cr("seo-url-params", "URL Parameters", "Links", "pass", "notice", 85,
        `URL has ${params} query parameter(s).`);
    return cr("seo-url-params", "Clean URL (No Parameters)", "Links", "pass", "notice", 100,
      "URL has no query parameters (clean).");
  } catch {
    return cr("seo-url-params", "URL Parameters", "Links", "pass", "notice", 80, "Could not parse URL.");
  }
}

function checkUrlUnderscores(url: string): CheckResult {
  try {
    const path = new URL(url).pathname;
    if (path.includes("_"))
      return cr("seo-url-underscores", "Underscores in URL", "Links", "warning", "warning", 60,
        "URL contains underscores. Google treats underscores as joiners, not separators.",
        "Replace underscores with hyphens in URLs. Google reads 'seo-tips' as two words but 'seo_tips' as one.");
    return cr("seo-url-underscores", "URL Word Separators", "Links", "pass", "notice", 100,
      "URL uses hyphens (not underscores) for word separation.");
  } catch {
    return cr("seo-url-underscores", "URL Word Separators", "Links", "pass", "notice", 80, "Could not parse URL.");
  }
}

function checkUrlUppercase(url: string): CheckResult {
  try {
    const path = new URL(url).pathname;
    if (/[A-Z]/.test(path))
      return cr("seo-url-case", "Uppercase in URL", "Links", "warning", "notice", 70,
        "URL path contains uppercase letters. This can cause duplicate content issues.",
        "Use lowercase URLs. Some servers treat /Page and /page as different URLs.");
    return cr("seo-url-case", "URL Casing", "Links", "pass", "notice", 100,
      "URL is all lowercase (correct).");
  } catch {
    return cr("seo-url-case", "URL Casing", "Links", "pass", "notice", 80, "Could not parse URL.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  TECHNICAL
// ═══════════════════════════════════════════════════════════════

function checkCanonical($: CheerioAPI): CheckResult {
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical)
    return cr("seo-canonical", "Canonical URL Missing", "Technical", "warning", "warning", 30,
      "No canonical URL declared. This can lead to duplicate content issues.",
      'Add <link rel="canonical" href="https://example.com/your-page"> to specify the preferred URL.');
  try {
    new URL(canonical.startsWith("http") ? canonical : `https://example.com${canonical}`);
    return cr("seo-canonical", "Canonical URL", "Technical", "pass", "notice", 100,
      `Canonical URL: ${canonical}`);
  } catch {
    return cr("seo-canonical", "Invalid Canonical URL", "Technical", "fail", "error", 20,
      `Canonical URL is malformed: "${truncate(canonical, 60)}".`,
      "Fix the canonical URL to be a valid, absolute URL.");
  }
}

function checkMultipleCanonicals($: CheerioAPI): CheckResult {
  const canonicals = $('link[rel="canonical"]');
  if (canonicals.length > 1)
    return cr("seo-multi-canonical", "Multiple Canonical URLs", "Technical", "fail", "error", 10,
      `${canonicals.length} canonical tags found. Only one is allowed per page.`,
      "Remove duplicate canonical tags. Keep only one that points to the preferred URL.");
  return cr("seo-multi-canonical", "Single Canonical", "Technical", "pass", "notice", 100,
    canonicals.length === 1 ? "One canonical tag (correct)." : "No canonical tag found.");
}

function checkLanguage($: CheerioAPI): CheckResult {
  const lang = $("html").attr("lang");
  if (!lang)
    return cr("seo-lang", "Language Declaration Missing", "Technical", "warning", "warning", 30,
      "No lang attribute on <html>. Screen readers and search engines can't determine the page language.",
      'Add lang attribute: <html lang="en"> (or appropriate language code).');
  if (!/^[a-z]{2}(-[A-Za-z]{2,})?$/.test(lang))
    return cr("seo-lang", "Invalid Language Code", "Technical", "warning", "warning", 50,
      `Language code "${lang}" doesn't match ISO 639 format.`,
      'Use a valid ISO 639-1 code like "en", "es", "zh-CN".');
  return cr("seo-lang", "Language Declaration", "Technical", "pass", "notice", 100,
    `Language set to "${lang}".`);
}

function checkHreflang($: CheerioAPI): CheckResult {
  const hreflangs = $('link[rel="alternate"][hreflang]');
  if (hreflangs.length === 0)
    return cr("seo-hreflang", "Hreflang Tags", "Technical", "pass", "notice", 80,
      "No hreflang tags (single-language site or not configured).",
      "If your site serves multiple languages, add hreflang tags to help search engines serve the right version.");
  let issues = 0;
  const langs: string[] = [];
  hreflangs.each((_, el) => {
    const code = $(el).attr("hreflang") ?? "";
    const href = $(el).attr("href") ?? "";
    langs.push(code);
    if (!href.startsWith("http")) issues++;
    if (!/^[a-z]{2}(-[a-z]{2})?$/i.test(code) && code !== "x-default") issues++;
  });
  const hasXDefault = langs.includes("x-default");
  if (issues > 0)
    return cr("seo-hreflang", "Hreflang Issues", "Technical", "warning", "warning",
      Math.max(30, 80 - issues * 15),
      `${hreflangs.length} hreflang tags with ${issues} issue(s). Languages: ${langs.join(", ")}.`,
      "Fix hreflang: use absolute URLs, valid ISO 639 codes, and include x-default.");
  return cr("seo-hreflang", "Hreflang Tags", "Technical", "pass", "notice", hasXDefault ? 100 : 85,
    `${hreflangs.length} hreflang tags configured. Languages: ${langs.join(", ")}${hasXDefault ? " (includes x-default)" : ""}.`,
    !hasXDefault ? 'Add hreflang="x-default" for the default/fallback language version.' : undefined);
}

function checkStructuredData($: CheerioAPI): CheckResult {
  const jsonLd = $('script[type="application/ld+json"]');
  const microdata = $("[itemtype]");
  if (jsonLd.length === 0 && microdata.length === 0)
    return cr("seo-structured", "No Structured Data", "Technical", "warning", "warning", 20,
      "No structured data found (JSON-LD or Microdata). Missing rich result opportunities.",
      "Add JSON-LD structured data for your content type (Article, Product, FAQ, etc.).");
  const types: string[] = [];
  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      if (data["@type"]) types.push(data["@type"]);
      if (Array.isArray(data["@graph"]))
        data["@graph"].forEach((i: { "@type"?: string }) => { if (i["@type"]) types.push(i["@type"]); });
    } catch { /* ignore */ }
  });
  microdata.each((_, el) => {
    const type = $(el).attr("itemtype");
    if (type) types.push(type.split("/").pop() ?? type);
  });
  return cr("seo-structured", "Structured Data", "Technical", "pass", "notice", 100,
    `${jsonLd.length} JSON-LD + ${microdata.length} Microdata blocks. Types: ${types.join(", ") || "detected"}.`);
}

function checkStructuredDataValidity($: CheerioAPI): CheckResult {
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length === 0)
    return cr("seo-structured-valid", "Structured Data Validity", "Technical", "pass", "notice", 80,
      "No JSON-LD to validate.");
  let errors = 0;
  const issues: string[] = [];
  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      if (!data["@context"]) { errors++; issues.push("missing @context"); }
      if (!data["@type"] && !data["@graph"]) { errors++; issues.push("missing @type"); }
    } catch {
      errors++;
      issues.push("invalid JSON");
    }
  });
  if (errors === 0)
    return cr("seo-structured-valid", "Structured Data Validity", "Technical", "pass", "notice", 100,
      `${jsonLd.length} JSON-LD blocks parsed successfully with valid structure.`);
  return cr("seo-structured-valid", "Structured Data Errors", "Technical", "fail", "error",
    Math.max(10, 100 - errors * 30),
    `${errors} structured data issue(s): ${issues.join(", ")}.`,
    "Fix JSON-LD errors: ensure valid JSON, @context, and @type are present.");
}

function checkUrlStructure(url: string): CheckResult {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const issues: string[] = [];
    if (path.includes("//")) issues.push("double slashes");
    if (path.split("/").some(s => s.length > 60)) issues.push("URL segments over 60 chars");
    if (path.split("/").filter(Boolean).length > 5) issues.push("deep nesting (>5 levels)");
    if (/\.(php|asp|aspx|jsp|cgi)$/i.test(path)) issues.push("exposes server technology");
    if (issues.length === 0)
      return cr("seo-url-structure", "URL Structure", "Technical", "pass", "notice", 100,
        `Clean URL structure: ${path || "/"}`);
    return cr("seo-url-structure", "URL Structure Issues", "Technical", "warning", "warning",
      Math.max(40, 100 - issues.length * 15),
      `URL issues: ${issues.join(", ")}.`,
      "Use short, flat, descriptive URL paths. Avoid deep nesting and technology extensions.");
  } catch {
    return cr("seo-url-structure", "URL Structure", "Technical", "fail", "error", 0, "Invalid URL.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  HTTPS & SECURITY
// ═══════════════════════════════════════════════════════════════

function checkHTTPS(url: string): CheckResult {
  if (url.startsWith("https://"))
    return cr("seo-https", "HTTPS", "HTTPS & Security", "pass", "notice", 100, "Site served over HTTPS.");
  return cr("seo-https", "Not Using HTTPS", "HTTPS & Security", "fail", "error", 0,
    "Site is NOT using HTTPS. This is a ranking factor and critical for user trust.",
    "Migrate to HTTPS immediately. It's required for modern SEO and browser security.");
}

function checkMixedContent($: CheerioAPI, url: string): CheckResult {
  if (!url.startsWith("https://"))
    return cr("seo-mixed", "Mixed Content", "HTTPS & Security", "pass", "notice", 50,
      "Site not on HTTPS — mixed content check N/A.");
  let mixed = 0;
  $("img[src], script[src], link[href], iframe[src], video[src], audio[src], source[src]").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("href") || "";
    if (src.startsWith("http://")) mixed++;
  });
  if (mixed === 0)
    return cr("seo-mixed", "No Mixed Content", "HTTPS & Security", "pass", "notice", 100,
      "No HTTP resources loaded on this HTTPS page.");
  return cr("seo-mixed", "Mixed Content Detected", "HTTPS & Security", "fail", "error",
    Math.max(10, 100 - mixed * 15),
    `${mixed} resource(s) loaded over HTTP on this HTTPS page. Browsers may block them.`,
    "Update all resource URLs to use HTTPS to prevent browser warnings and content blocking.");
}

function checkHSTS(headers: Record<string, string>): CheckResult {
  const hsts = headers["strict-transport-security"];
  if (!hsts)
    return cr("seo-hsts", "HSTS Not Configured", "HTTPS & Security", "warning", "notice", 50,
      "No Strict-Transport-Security header. Browsers can still access HTTP version.",
      "Add HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains");
  const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0");
  if (maxAge < 31536000)
    return cr("seo-hsts", "HSTS max-age Too Short", "HTTPS & Security", "warning", "notice", 70,
      `HSTS max-age is ${maxAge}s (recommended: 31536000 = 1 year).`,
      "Increase HSTS max-age to at least 31536000 (1 year).");
  return cr("seo-hsts", "HSTS Configured", "HTTPS & Security", "pass", "notice", 100,
    `HSTS enabled: ${truncate(hsts, 60)}`);
}

function checkXContentTypeOptions(headers: Record<string, string>): CheckResult {
  if (headers["x-content-type-options"]?.includes("nosniff"))
    return cr("seo-xcto", "X-Content-Type-Options", "HTTPS & Security", "pass", "notice", 100,
      "X-Content-Type-Options: nosniff is set.");
  return cr("seo-xcto", "X-Content-Type-Options Missing", "HTTPS & Security", "warning", "notice", 60,
    "X-Content-Type-Options header not set. Browsers may MIME-sniff content.",
    "Add header: X-Content-Type-Options: nosniff");
}

function checkXFrameOptions(headers: Record<string, string>): CheckResult {
  const xfo = headers["x-frame-options"];
  const csp = headers["content-security-policy"] ?? "";
  if (xfo || csp.includes("frame-ancestors"))
    return cr("seo-xfo", "Clickjacking Protection", "HTTPS & Security", "pass", "notice", 100,
      `Clickjacking protection via ${xfo ? `X-Frame-Options: ${xfo}` : "CSP frame-ancestors"}.`);
  return cr("seo-xfo", "No Clickjacking Protection", "HTTPS & Security", "warning", "notice", 60,
    "No X-Frame-Options or CSP frame-ancestors header. Page can be embedded in iframes.",
    "Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking.");
}

function checkContentSecurityPolicy(headers: Record<string, string>): CheckResult {
  if (headers["content-security-policy"])
    return cr("seo-csp", "Content Security Policy", "HTTPS & Security", "pass", "notice", 100,
      "Content-Security-Policy header is configured.");
  return cr("seo-csp", "No Content Security Policy", "HTTPS & Security", "warning", "notice", 55,
    "No Content-Security-Policy header. Page is more vulnerable to XSS attacks.",
    "Add a Content-Security-Policy header to restrict resource loading sources.");
}

// ═══════════════════════════════════════════════════════════════
//  PERFORMANCE
// ═══════════════════════════════════════════════════════════════

function checkHtmlSize(html: string): CheckResult {
  const sizeKB = html.length / 1024;
  if (sizeKB > 2048)
    return cr("seo-html-size", "HTML Too Large", "Performance", "fail", "error", 10,
      `HTML is ${(sizeKB / 1024).toFixed(1)} MB — exceeds 2MB limit. Very slow to parse.`,
      "Reduce HTML size: remove inline data, defer content loading, paginate large pages.");
  if (sizeKB > 500)
    return cr("seo-html-size", "Large HTML", "Performance", "warning", "warning", 45,
      `HTML is ${Math.round(sizeKB)} KB — larger than recommended (under 500KB).`,
      "Reduce HTML payload by removing inline styles/scripts and unnecessary markup.");
  if (sizeKB > 200)
    return cr("seo-html-size", "HTML Size", "Performance", "pass", "notice", 80,
      `HTML is ${Math.round(sizeKB)} KB — moderate.`);
  return cr("seo-html-size", "HTML Size", "Performance", "pass", "notice", 100,
    `HTML is ${Math.round(sizeKB)} KB — lightweight.`);
}

function checkCompression(headers: Record<string, string>): CheckResult {
  const encoding = headers["content-encoding"]?.toLowerCase() ?? "";
  if (encoding.includes("br"))
    return cr("seo-compression", "Brotli Compression", "Performance", "pass", "notice", 100,
      "Brotli compression enabled (optimal).");
  if (encoding.includes("gzip"))
    return cr("seo-compression", "Gzip Compression", "Performance", "pass", "notice", 90,
      "Gzip compression enabled. Consider upgrading to Brotli for ~20% smaller transfers.",
      "Enable Brotli compression for better performance than gzip.");
  return cr("seo-compression", "No Compression", "Performance", "warning", "warning", 20,
    "No content compression detected (no gzip or brotli). Page transfers are uncompressed.",
    "Enable gzip or Brotli compression on your server to reduce transfer size by 60-80%.");
}

function checkCacheControl(headers: Record<string, string>): CheckResult {
  const cc = headers["cache-control"] ?? "";
  if (!cc)
    return cr("seo-cache", "No Cache-Control Header", "Performance", "warning", "notice", 50,
      "No Cache-Control header. Browser must re-download resources every visit.",
      "Add Cache-Control headers: public, max-age=31536000 for static assets.");
  if (cc.includes("no-store") || cc.includes("no-cache"))
    return cr("seo-cache", "Cache-Control", "Performance", "pass", "notice", 75,
      `Cache-Control: ${cc} (dynamic page — caching intentionally limited).`);
  return cr("seo-cache", "Cache-Control", "Performance", "pass", "notice", 100,
    `Cache-Control configured: ${truncate(cc, 60)}`);
}

function checkResourceHints($: CheerioAPI): CheckResult {
  const preconnect = $('link[rel="preconnect"]').length;
  const prefetch = $('link[rel="dns-prefetch"]').length;
  const preload = $('link[rel="preload"]').length;
  const total = preconnect + prefetch + preload;
  if (total === 0)
    return cr("seo-resource-hints", "No Resource Hints", "Performance", "warning", "notice", 55,
      "No preconnect, dns-prefetch, or preload hints found.",
      'Add <link rel="preconnect" href="https://fonts.googleapis.com"> for critical third-party domains.');
  return cr("seo-resource-hints", "Resource Hints", "Performance", "pass", "notice", 100,
    `Resource hints: ${preconnect} preconnect, ${prefetch} dns-prefetch, ${preload} preload.`);
}

function checkRenderBlockingResources($: CheerioAPI): CheckResult {
  const blockingCSS = $('link[rel="stylesheet"]').filter((_, el) => !$(el).attr("media") || $(el).attr("media") === "all");
  const blockingJS = $("script[src]").filter((_, el) => !$(el).attr("async") && !$(el).attr("defer") && !$(el).attr("type")?.includes("module"));
  const total = blockingCSS.length + blockingJS.length;
  if (total === 0)
    return cr("seo-render-blocking", "Render-Blocking Resources", "Performance", "pass", "notice", 100,
      "No render-blocking CSS or JS detected.");
  if (total <= 3)
    return cr("seo-render-blocking", "Render-Blocking Resources", "Performance", "pass", "notice", 85,
      `${total} render-blocking resource(s): ${blockingCSS.length} CSS, ${blockingJS.length} JS.`);
  return cr("seo-render-blocking", "Render-Blocking Resources", "Performance", "warning", "warning",
    Math.max(30, 100 - total * 8),
    `${total} render-blocking resources: ${blockingCSS.length} CSS, ${blockingJS.length} JS. Delays first paint.`,
    "Add async/defer to scripts and use media queries or preload for CSS to reduce render-blocking.");
}

function checkResponseTime(ms: number): CheckResult {
  if (ms > 5000)
    return cr("seo-response-time", "Slow Server Response", "Performance", "fail", "error", 10,
      `Server responded in ${(ms / 1000).toFixed(1)}s — extremely slow (should be under 1s).`,
      "Investigate server performance: check hosting, database queries, caching, and CDN usage.");
  if (ms > 2000)
    return cr("seo-response-time", "Slow Response Time", "Performance", "warning", "warning", 40,
      `Server responded in ${(ms / 1000).toFixed(1)}s — over 2s threshold.`,
      "Optimize server response time. Use caching, CDN, and faster hosting.");
  if (ms > 1000)
    return cr("seo-response-time", "Response Time", "Performance", "warning", "notice", 70,
      `Server responded in ${ms}ms — acceptable but above 1s target.`,
      "Target under 1 second server response time for best user experience.");
  return cr("seo-response-time", "Response Time", "Performance", "pass", "notice", 100,
    `Server responded in ${ms}ms (fast).`);
}

// ═══════════════════════════════════════════════════════════════
//  SOCIAL & OPEN GRAPH
// ═══════════════════════════════════════════════════════════════

function checkOpenGraph($: CheerioAPI): CheckResult {
  const tags = {
    "og:title": $('meta[property="og:title"]').attr("content"),
    "og:description": $('meta[property="og:description"]').attr("content"),
    "og:image": $('meta[property="og:image"]').attr("content"),
    "og:url": $('meta[property="og:url"]').attr("content"),
    "og:type": $('meta[property="og:type"]').attr("content"),
  };
  const found = Object.entries(tags).filter(([, v]) => v);
  const missing = Object.entries(tags).filter(([, v]) => !v).map(([k]) => k);
  if (found.length === 5)
    return cr("seo-og", "Open Graph Tags", "Social", "pass", "notice", 100,
      "All 5 essential Open Graph tags present.");
  if (found.length >= 3)
    return cr("seo-og", "Open Graph Tags", "Social", "warning", "notice",
      Math.round((found.length / 5) * 100),
      `${found.length}/5 OG tags. Missing: ${missing.join(", ")}.`,
      `Add missing OG tags: ${missing.join(", ")} for better social sharing.`);
  return cr("seo-og", "Open Graph Tags Missing", "Social", "fail", "warning",
    Math.round((found.length / 5) * 100),
    `Only ${found.length}/5 OG tags found. Missing: ${missing.join(", ")}.`,
    "Add all Open Graph tags for rich social media previews: og:title, og:description, og:image, og:url, og:type.");
}

function checkTwitterCards($: CheerioAPI): CheckResult {
  const card = $('meta[name="twitter:card"]').attr("content");
  const title = $('meta[name="twitter:title"]').attr("content");
  const desc = $('meta[name="twitter:description"]').attr("content");
  const image = $('meta[name="twitter:image"]').attr("content");
  const found = [card, title, desc, image].filter(Boolean).length;
  if (found >= 3)
    return cr("seo-twitter", "Twitter Cards", "Social", "pass", "notice", 100,
      `Twitter Card configured: ${card ? `type="${card}"` : "tags present"}.`);
  if (found >= 1)
    return cr("seo-twitter", "Incomplete Twitter Cards", "Social", "warning", "notice", 60,
      `${found}/4 Twitter Card tags. Add twitter:card, twitter:title, twitter:description, twitter:image.`,
      "Complete Twitter Card tags for rich previews when shared on X/Twitter.");
  return cr("seo-twitter", "No Twitter Cards", "Social", "warning", "notice", 30,
    "No Twitter Card meta tags found.",
    'Add <meta name="twitter:card" content="summary_large_image"> and related tags.');
}

function checkFavicon($: CheerioAPI): CheckResult {
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  if (favicon.length === 0)
    return cr("seo-favicon", "Favicon Missing", "Social", "warning", "notice", 50,
      "No favicon declared. Browsers show a default icon in tabs and bookmarks.",
      'Add <link rel="icon" href="/favicon.ico"> to your <head>.');
  const apple = $('link[rel="apple-touch-icon"]').length;
  return cr("seo-favicon", "Favicon", "Social", "pass", "notice", apple > 0 ? 100 : 85,
    `Favicon found${apple ? " (with Apple touch icon)" : ""}.`,
    !apple ? 'Also add <link rel="apple-touch-icon"> for iOS home screen bookmarks.' : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  SOCIAL (continued)
// ═══════════════════════════════════════════════════════════════

function checkSocialMetaCompleteness($: CheerioAPI): CheckResult {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogUrl = $('meta[property="og:url"]').attr("content");
  const ogType = $('meta[property="og:type"]').attr("content");
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");
  const twTitle = $('meta[name="twitter:title"]').attr("content");
  const twDesc = $('meta[name="twitter:description"]').attr("content");
  const twImage = $('meta[name="twitter:image"]').attr("content");

  let score = 0;
  const present: string[] = [];
  const missing: string[] = [];

  if (ogTitle) { score += 12; present.push("og:title"); } else missing.push("og:title");
  if (ogDesc) { score += 12; present.push("og:description"); } else missing.push("og:description");
  if (ogImage) { score += 15; present.push("og:image"); } else missing.push("og:image");
  if (ogUrl) { score += 8; present.push("og:url"); } else missing.push("og:url");
  if (ogType) { score += 8; present.push("og:type"); } else missing.push("og:type");
  if (ogSiteName) { score += 5; present.push("og:site_name"); }
  if (twTitle) { score += 12; present.push("twitter:title"); } else missing.push("twitter:title");
  if (twDesc) { score += 12; present.push("twitter:description"); } else missing.push("twitter:description");
  if (twImage) { score += 12; present.push("twitter:image"); } else missing.push("twitter:image");

  score = Math.min(score, 100);

  if (missing.length === 0)
    return cr("seo-social-complete", "Social Meta Completeness", "Social & Open Graph", "pass", "notice", 100,
      `All social meta tags present: ${present.join(", ")}.`);

  return cr("seo-social-complete", "Social Meta Completeness", "Social & Open Graph",
    score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score >= 30 ? "notice" : "warning",
    score,
    `Social meta: ${present.length} present, ${missing.length} missing (${missing.join(", ")}).`,
    `Add missing social tags: ${missing.join(", ")}. These control how your page appears when shared on social media.`);
}

// ═══════════════════════════════════════════════════════════════
//  ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════

function checkFormLabels($: CheerioAPI): CheckResult {
  const inputs = $("input, select, textarea").not('[type="hidden"], [type="submit"], [type="button"]');
  if (inputs.length === 0)
    return cr("seo-form-labels", "Form Labels", "Accessibility", "pass", "notice", 100,
      "No form inputs found — check not applicable.");

  let labeled = 0;
  inputs.each((_, el) => {
    const id = $(el).attr("id");
    const ariaLabel = $(el).attr("aria-label");
    const ariaLabelledBy = $(el).attr("aria-labelledby");
    const title = $(el).attr("title");
    const placeholder = $(el).attr("placeholder");
    const parentLabel = $(el).closest("label").length > 0;
    const associatedLabel = id ? $(`label[for="${id}"]`).length > 0 : false;

    if (ariaLabel || ariaLabelledBy || parentLabel || associatedLabel || title) labeled++;
    else if (placeholder) labeled += 0.5; // Placeholder alone is weak
  });

  const ratio = inputs.length > 0 ? labeled / inputs.length : 1;
  const score = Math.round(ratio * 100);

  return cr("seo-form-labels", "Form Labels", "Accessibility",
    score >= 90 ? "pass" : score >= 60 ? "warning" : "fail",
    score >= 60 ? "notice" : "warning",
    score,
    `${Math.round(labeled)}/${inputs.length} form inputs have proper labels (${score}%).`,
    score < 90 ? "Add <label for=\"id\">, aria-label, or aria-labelledby to every form input. Screen readers and search engines need labels to understand form purpose." : undefined);
}

function checkAriaLandmarks($: CheerioAPI): CheckResult {
  const landmarks = {
    main: $('main, [role="main"]').length,
    nav: $('nav, [role="navigation"]').length,
    banner: $('header, [role="banner"]').length,
    contentinfo: $('footer, [role="contentinfo"]').length,
    complementary: $('aside, [role="complementary"]').length,
    search: $('[role="search"]').length,
  };

  const present = Object.entries(landmarks).filter(([, c]) => c > 0);
  let score = 0;

  if (landmarks.main > 0) score += 30;
  if (landmarks.nav > 0) score += 20;
  if (landmarks.banner > 0) score += 15;
  if (landmarks.contentinfo > 0) score += 15;
  if (landmarks.complementary > 0) score += 10;
  if (landmarks.search > 0) score += 10;

  score = Math.min(score, 100);

  return cr("seo-aria-landmarks", "ARIA Landmarks", "Accessibility",
    score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    "notice", score,
    present.length ? `Landmarks: ${present.map(([k, v]) => `${k}(${v})`).join(", ")}.` : "No ARIA landmarks found.",
    score < 60 ? "Add <main>, <nav>, <header>, <footer>, and <aside> landmarks. These help screen readers and signal page structure to search engines." : undefined);
}

function checkColorContrastHints($: CheerioAPI): CheckResult {
  // We can't compute actual contrast ratios from HTML alone, but we can check for indicators
  let score = 60; // Neutral starting score since we can't fully verify
  const factors: string[] = [];

  // Check for forced colors / high contrast media query support
  const stylesheets = $("style").text();
  if (/prefers-contrast|forced-colors/i.test(stylesheets)) {
    score += 20; factors.push("contrast media query support");
  }

  // Check for very small font sizes (likely low contrast issues)
  const smallFonts = $('[style*="font-size"]').filter((_, el) => {
    const style = $(el).attr("style") ?? "";
    const match = style.match(/font-size:\s*(\d+)/);
    return !!(match && parseInt(match[1]) < 12);
  }).length;
  if (smallFonts > 0) { score -= 15; factors.push(`${smallFonts} very small font element(s)`); }

  // Check for text on images without overlays
  const textOverImages = $('[style*="background-image"]').filter((_, el) => {
    return $(el).text().trim().length > 20;
  }).length;
  if (textOverImages > 0) { score -= 10; factors.push(`${textOverImages} text-over-image element(s)`); }

  // Positive: using CSS custom properties for colors (systematic theming)
  if (/--[a-z-]*(color|foreground|background)/i.test(stylesheets)) {
    score += 10; factors.push("CSS color variables (consistent theming)");
  }

  score = Math.max(0, Math.min(score, 100));

  return cr("seo-contrast-hints", "Color Contrast Hints", "Accessibility",
    score >= 60 ? "pass" : score >= 40 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Contrast hints: ${factors.join(", ")}. Note: full contrast testing requires browser rendering.` : "No contrast issues detected in HTML. Full testing requires a browser-based audit.",
    score < 60 ? "Ensure text meets WCAG 2.1 contrast ratios (4.5:1 for normal text, 3:1 for large text). Use a tool like Lighthouse or axe for full auditing." : undefined);
}

function checkSkipNavigation($: CheerioAPI): CheckResult {
  const skipLinks = $('a[href="#main"], a[href="#content"], a[href="#main-content"], a[class*="skip" i], a[id*="skip" i]');
  const mainLandmark = $('main, [role="main"], #main, #content, #main-content').length > 0;

  if (skipLinks.length > 0 && mainLandmark)
    return cr("seo-skip-nav", "Skip Navigation", "Accessibility", "pass", "notice", 100,
      "Skip navigation link found with corresponding landmark. Keyboard users can skip repetitive nav.");
  if (skipLinks.length > 0)
    return cr("seo-skip-nav", "Skip Navigation (Partial)", "Accessibility", "pass", "notice", 75,
      "Skip link found but target landmark may be missing.",
      "Ensure the skip link target (#main or #content) exists as an id on the main content area.");
  if (mainLandmark)
    return cr("seo-skip-nav", "Skip Navigation Missing", "Accessibility", "warning", "notice", 50,
      "Main landmark exists but no skip-to-content link for keyboard navigation.",
      'Add a visually hidden skip link: <a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>');

  return cr("seo-skip-nav", "Skip Navigation Missing", "Accessibility", "warning", "notice", 35,
    "No skip navigation link or main content landmark found.",
    'Add a <main> element and a skip link for keyboard accessibility. This also signals the primary content area to crawlers.');
}

function checkAltTextQuality($: CheerioAPI): CheckResult {
  const images = $("img");
  if (images.length === 0)
    return cr("seo-alt-quality", "Alt Text Quality", "Accessibility", "pass", "notice", 100,
      "No images found — check not applicable.");

  let good = 0, empty = 0, generic = 0, tooLong = 0, decorative = 0;
  const genericWords = /^(image|photo|picture|img|icon|logo|banner|screenshot|untitled|placeholder|alt)$/i;

  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined) { empty++; return; }
    if (alt === "") { decorative++; return; } // Empty alt is valid for decorative images
    const trimmed = alt.trim();
    if (genericWords.test(trimmed) || /^img_?\d+|^DSC_?\d+|^IMG_?\d+/i.test(trimmed)) { generic++; return; }
    if (trimmed.split(/\s+/).length > 25) { tooLong++; return; }
    good++;
  });

  const total = images.length;
  const score = total > 0 ? Math.round(((good + decorative * 0.8) / total) * 100) : 100;

  const factors: string[] = [];
  if (good > 0) factors.push(`${good} descriptive`);
  if (decorative > 0) factors.push(`${decorative} decorative (alt="")`);
  if (empty > 0) factors.push(`${empty} missing alt`);
  if (generic > 0) factors.push(`${generic} generic alt`);
  if (tooLong > 0) factors.push(`${tooLong} overly long alt`);

  return cr("seo-alt-quality", "Alt Text Quality", "Accessibility",
    score >= 80 ? "pass" : score >= 50 ? "warning" : "fail",
    score >= 50 ? "notice" : "warning",
    score,
    `Alt text quality (${total} images): ${factors.join(", ")}.`,
    score < 80 ? "Write descriptive, concise alt text (5-15 words). Avoid generic text like 'image' or 'photo'. Use alt=\"\" only for decorative images." : undefined);
}

function checkFocusableElements($: CheerioAPI): CheckResult {
  // Check for tabindex misuse and keyboard accessibility
  const negativeTabindex = $('[tabindex="-1"]').not('div, span, [role="dialog"], [role="tooltip"]');
  const highTabindex = $('[tabindex]').filter((_, el) => {
    const val = parseInt($(el).attr("tabindex") ?? "0");
    return val > 0;
  });

  const interactiveElements = $("a[href], button, input, select, textarea, [role='button'], [role='link']");
  const outlineNone = $('[style*="outline: none"], [style*="outline:none"], [style*="outline:0"]');

  let score = 80;
  const factors: string[] = [];

  if (highTabindex.length > 0) {
    score -= 20;
    factors.push(`${highTabindex.length} positive tabindex (anti-pattern)`);
  }
  if (negativeTabindex.length > 3) {
    score -= 10;
    factors.push(`${negativeTabindex.length} elements removed from tab order`);
  }
  if (outlineNone.length > 0) {
    score -= 15;
    factors.push(`${outlineNone.length} elements with outline:none (hides focus)`);
  }
  if (interactiveElements.length > 0) {
    score += 10;
    factors.push(`${interactiveElements.length} interactive elements`);
  }

  score = Math.max(0, Math.min(score, 100));

  return cr("seo-focusable", "Focus & Keyboard Accessibility", "Accessibility",
    score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Keyboard access: ${factors.join(", ")}.` : "No keyboard accessibility issues detected.",
    score < 70 ? "Avoid positive tabindex values and outline:none. Ensure all interactive elements are keyboard-accessible with visible focus indicators." : undefined);
}

function checkLanguageDirection($: CheerioAPI): CheckResult {
  const lang = $("html").attr("lang");
  const dir = $("html").attr("dir");
  const contentLang = $('meta[http-equiv="content-language"]').attr("content");

  let score = 0;
  const factors: string[] = [];

  if (lang) {
    score += 50;
    factors.push(`lang="${lang}"`);
    // Check lang format validity (xx or xx-XX)
    if (/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) { score += 10; factors.push("valid format"); }
    else if (/^[a-z]{2}/.test(lang)) { score += 5; factors.push("partially valid format"); }
  }
  if (dir) { score += 15; factors.push(`dir="${dir}"`); }
  if (contentLang) { score += 15; factors.push(`content-language: ${contentLang}`); }

  // Check for mixed direction content support
  const bdiElements = $("bdi").length;
  const dirAttrs = $("[dir]").length;
  if (bdiElements > 0 || dirAttrs > 1) { score += 10; factors.push("bidirectional support"); }

  score = Math.min(score, 100);

  if (!lang)
    return cr("seo-lang-dir", "Language & Direction", "Accessibility", "fail", "warning", 15,
      "No lang attribute on <html>. Screen readers and search engines need this to determine content language.",
      'Add lang attribute: <html lang="en">. For RTL languages, also add dir="rtl".');

  return cr("seo-lang-dir", "Language & Direction", "Accessibility",
    score >= 60 ? "pass" : "warning", "notice", score,
    `Language/direction: ${factors.join(", ")}.`);
}

// ═══════════════════════════════════════════════════════════════
//  ADDITIONAL TECHNICAL
// ═══════════════════════════════════════════════════════════════

function checkMobileFriendlyMeta($: CheerioAPI): CheckResult {
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  const hasWidthDevice = /width=device-width/i.test(viewport);
  const hasInitialScale = /initial-scale=1/i.test(viewport);
  const hasMaxScale = /maximum-scale=1/i.test(viewport);
  const hasUserScalable = /user-scalable=no/i.test(viewport);
  const themeColor = $('meta[name="theme-color"]').attr("content");
  const mobileWebApp = $('meta[name="mobile-web-app-capable"]').length > 0 ||
    $('meta[name="apple-mobile-web-app-capable"]').length > 0;

  let score = 0;
  const factors: string[] = [];

  if (hasWidthDevice) { score += 30; factors.push("width=device-width"); }
  if (hasInitialScale) { score += 20; factors.push("initial-scale=1"); }
  if (themeColor) { score += 15; factors.push(`theme-color: ${themeColor}`); }
  if (mobileWebApp) { score += 10; factors.push("web-app capable"); }

  // Penalties
  if (hasUserScalable) { score -= 15; factors.push("user-scalable=no (blocks zoom)"); }
  if (hasMaxScale) { score -= 10; factors.push("maximum-scale restricted"); }

  score = Math.max(0, Math.min(score, 100));

  return cr("seo-mobile-meta", "Mobile-Friendly Meta", "Technical",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `Mobile meta: ${factors.join(", ")}.` : "No mobile-specific meta tags found.",
    score < 50 ? 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and <meta name="theme-color">. Don\'t block user zoom.' : undefined);
}

function checkPaginationLinks($: CheerioAPI): CheckResult {
  const prevLink = $('link[rel="prev"]').attr("href");
  const nextLink = $('link[rel="next"]').attr("href");
  const paginationNav = $('nav[aria-label*="pagination" i], [class*="pagination" i], [class*="pager" i]');

  // Check for infinite scroll signals
  const infiniteScroll = $('[class*="infinite" i], [data-infinite], [class*="load-more" i]');

  if (!prevLink && !nextLink && paginationNav.length === 0 && infiniteScroll.length === 0)
    return cr("seo-pagination", "Pagination Links", "Technical", "pass", "notice", 80,
      "No pagination detected — page appears to be standalone content.");

  let score = 60;
  const factors: string[] = [];

  if (prevLink) { score += 15; factors.push(`rel="prev": ${prevLink}`); }
  if (nextLink) { score += 15; factors.push(`rel="next": ${nextLink}`); }
  if (paginationNav.length > 0) { score += 10; factors.push("pagination navigation"); }
  if (infiniteScroll.length > 0) {
    score -= 10;
    factors.push("infinite scroll detected (may hurt crawlability)");
  }

  score = Math.max(0, Math.min(score, 100));

  return cr("seo-pagination", "Pagination Links", "Technical",
    score >= 70 ? "pass" : "warning",
    "notice", score,
    `Pagination: ${factors.join(", ")}.`,
    score < 70 ? 'Add <link rel="prev"> and <link rel="next"> for paginated content. If using infinite scroll, provide a paginated fallback for crawlers.' : undefined);
}

function checkContentTypeHeader(headers: Record<string, string>): CheckResult {
  const contentType = headers["content-type"] ?? headers["Content-Type"] ?? "";

  if (!contentType)
    return cr("seo-content-type", "Content-Type Header", "Technical", "warning", "warning", 40,
      "No Content-Type header found. Browsers may misinterpret the page encoding.",
      "Set Content-Type: text/html; charset=utf-8 in your server response headers.");

  const hasCharset = /charset=utf-8/i.test(contentType);
  const isHtml = /text\/html/i.test(contentType);

  if (isHtml && hasCharset)
    return cr("seo-content-type", "Content-Type Header", "Technical", "pass", "notice", 100,
      `Content-Type: ${contentType} — correct HTML with UTF-8 charset.`);

  if (isHtml)
    return cr("seo-content-type", "Content-Type Header", "Technical", "pass", "notice", 75,
      `Content-Type: ${contentType} — HTML but charset not explicitly set to UTF-8.`,
      "Add charset=utf-8 to your Content-Type header for consistent encoding.");

  return cr("seo-content-type", "Content-Type Header", "Technical", "warning", "notice", 50,
    `Content-Type: ${contentType} — unexpected type for a web page.`,
    "Ensure HTML pages return Content-Type: text/html; charset=utf-8.");
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function cr(
  id: string, name: string, category: string,
  status: CheckResult["status"], severity: CheckResult["severity"],
  score: number, details: string, suggestion?: string
): CheckResult {
  return { id, name, category, status, severity, score, details, suggestion };
}

function getBodyText($: CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, nav, footer, header").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function isInternal(href: string, hostname: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try { return new URL(href).hostname === hostname; } catch { return true; }
}
