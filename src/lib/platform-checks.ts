import type { CheerioAPI } from "cheerio";
import type { CheckResult, PageContext, PlatformScore } from "./types";
import { AI_BOTS, type PlatformKey, type RobotsTxtResult } from "./robots-parser";

/**
 * Platform-specific GEO checks for 10 major AI platforms.
 *
 * Each platform gets:
 *   1. Crawler access check (from robots.txt)
 *   2. 3-5 content optimization checks based on that platform's known citation preferences
 *
 * Research sources:
 *   - Google AI Overview: Schema.org (FAQ/HowTo/Article), E-E-A-T, 40-60 word answer capsules
 *   - ChatGPT/SearchGPT: llms.txt, 50-word H2 capsules, structured headings (40% lift)
 *   - Perplexity: freshness (indexes daily), citation chains, original data, 7.42 citations/response
 *   - Copilot: Bing index, OpenGraph, structured data
 *   - Claude: deep comprehensive content, logical structure, evidence chains
 *   - Apple Intelligence: mobile-first, performance, Applebot-Extended opt-in
 *   - Meta AI: OpenGraph perfection, social signals
 *   - 百度/文心: Baiduspider, Chinese content signals, mobile
 *   - 字节/豆包: Bytespider, short-form + long-form, mobile-first
 *   - DeepSeek: structured data, code-friendly, technical depth
 */
export function runPlatformChecks(
  ctx: PageContext,
  robotsTxt: RobotsTxtResult,
): PlatformScore[] {
  const { $, url, html, headers } = ctx;

  const platforms: PlatformScore[] = [];

  // ── Google AI Overview ──
  platforms.push(buildPlatformScore("google", robotsTxt, [
    checkGoogleSchema($),
    checkGoogleEEAT($),
    checkGoogleAnswerCapsule($),
    checkGoogleSpeakable($),
    checkGoogleKnowledgeGraph($),
  ]));

  // ── ChatGPT / SearchGPT ──
  platforms.push(buildPlatformScore("chatgpt", robotsTxt, [
    checkChatGPTLlmsTxt($, html),
    checkChatGPTAnswerCapsules($),
    checkChatGPTStructuredHeadings($),
    checkChatGPTDirectDefinitions($),
  ]));

  // ── Perplexity ──
  platforms.push(buildPlatformScore("perplexity", robotsTxt, [
    checkPerplexityFreshness($, headers),
    checkPerplexityCitationChains($),
    checkPerplexityOriginalData($),
    checkPerplexityAuthorCredentials($),
  ]));

  // ── Microsoft Copilot ──
  platforms.push(buildPlatformScore("copilot", robotsTxt, [
    checkCopilotOpenGraph($),
    checkCopilotBingSchema($),
    checkCopilotStructuredData($),
  ]));

  // ── Claude ──
  platforms.push(buildPlatformScore("claude", robotsTxt, [
    checkClaudeContentDepth($),
    checkClaudeLogicalStructure($),
    checkClaudeEvidenceChains($),
  ]));

  // ── Apple Intelligence ──
  platforms.push(buildPlatformScore("apple", robotsTxt, [
    checkAppleMobileOptimization($),
    checkApplePerformanceSignals($, html, headers),
    checkAppleStructuredContent($),
  ]));

  // ── Meta AI ──
  platforms.push(buildPlatformScore("meta", robotsTxt, [
    checkMetaOpenGraphComplete($),
    checkMetaSocialSignals($),
    checkMetaRichMedia($),
  ]));

  // ── 百度 / 文心一言 ──
  platforms.push(buildPlatformScore("baidu", robotsTxt, [
    checkBaiduMeta($),
    checkBaiduMobileReady($),
    checkBaiduContentSignals($),
  ]));

  // ── 字节 / 豆包 ──
  platforms.push(buildPlatformScore("bytedance", robotsTxt, [
    checkBytedanceMobileFirst($),
    checkBytedanceVideoSignals($),
    checkBytedanceContentFormat($),
  ]));

  // ── DeepSeek ──
  platforms.push(buildPlatformScore("deepseek", robotsTxt, [
    checkDeepSeekTechnicalDepth($),
    checkDeepSeekCodeContent($),
    checkDeepSeekStructuredReasoning($),
  ]));

  return platforms;
}

// ═══════════════════════════════════════════════════════════════
//  BUILDER
// ═══════════════════════════════════════════════════════════════

function buildPlatformScore(
  key: PlatformKey,
  robotsTxt: RobotsTxtResult,
  checks: CheckResult[],
): PlatformScore {
  const platform = AI_BOTS[key];
  const access = robotsTxt.platformAccess[key];

  // If blocked, cap score at 15 regardless of content quality
  const contentScore =
    checks.length > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)
      : 50;

  let finalScore: number;
  if (access === "blocked") {
    finalScore = Math.min(contentScore, 15);
  } else if (access === "restricted") {
    finalScore = Math.round(contentScore * 0.6);
  } else {
    finalScore = contentScore;
  }

  // Prepend crawler access check
  const accessCheck = crawlerAccessCheck(key, access);

  return {
    key,
    name: platform.name,
    icon: platform.icon,
    score: finalScore,
    crawlerAccess: access,
    checks: [accessCheck, ...checks],
  };
}

function crawlerAccessCheck(
  key: PlatformKey,
  access: "allowed" | "blocked" | "restricted" | "unknown",
): CheckResult {
  const platform = AI_BOTS[key];
  const agents = platform.agents.join(", ");

  if (access === "blocked")
    return cr(`${key}-access`, `${platform.name} Crawler Blocked`, `${platform.name}`,
      "fail", "error", 0,
      `Your robots.txt blocks ${agents}. This platform cannot crawl or cite your content.`,
      `Remove the Disallow rule for ${agents} in your robots.txt to allow ${platform.name} to discover and cite your content.`);

  if (access === "restricted")
    return cr(`${key}-access`, `${platform.name} Crawler Restricted`, `${platform.name}`,
      "warning", "warning", 40,
      `Your robots.txt partially restricts ${agents}. Some content may not be accessible.`,
      `Review your robots.txt rules for ${agents}. Consider allowing full access to content pages.`);

  return cr(`${key}-access`, `${platform.name} Crawler Allowed`, `${platform.name}`,
    "pass", "notice", 100,
    `${agents} can access your content. No robots.txt blocks detected.`);
}

function cr(
  id: string, name: string, category: string,
  status: CheckResult["status"], severity: CheckResult["severity"],
  score: number, details: string, suggestion?: string,
): CheckResult {
  return { id, name, category, status, severity, score, details, suggestion };
}

function getBodyText($: CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, nav, footer, header").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

// ═══════════════════════════════════════════════════════════════
//  GOOGLE AI OVERVIEW
//  Key factors: Schema.org, E-E-A-T, featured snippet format,
//  Speakable schema, Knowledge Graph entities
//  Citation avg: 2-4 sources, only top-5 organic pages
// ═══════════════════════════════════════════════════════════════

function checkGoogleSchema($: CheerioAPI): CheckResult {
  const ldScripts = $('script[type="application/ld+json"]').toArray();
  const types = new Set<string>();
  const highValueTypes = ["FAQPage", "HowTo", "Article", "NewsArticle", "BlogPosting", "Product", "Review", "Recipe", "Event"];
  let highValueCount = 0;

  ldScripts.forEach((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const addType = (t: string) => {
        types.add(t);
        if (highValueTypes.includes(t)) highValueCount++;
      };
      if (data["@type"]) addType(data["@type"]);
      if (data["@graph"]) (data["@graph"] as { "@type"?: string }[]).forEach((i) => { if (i["@type"]) addType(i["@type"]); });
    } catch { /* skip */ }
  });

  // FAQPage schema = 30% more AI Overview citations
  const hasFaq = types.has("FAQPage");
  const hasHowTo = types.has("HowTo");
  const hasArticle = types.has("Article") || types.has("NewsArticle") || types.has("BlogPosting");

  let score = 0;
  const factors: string[] = [];
  if (hasFaq) { score += 30; factors.push("FAQPage (+30% citation rate)"); }
  if (hasHowTo) { score += 25; factors.push("HowTo schema"); }
  if (hasArticle) { score += 20; factors.push("Article schema"); }
  if (highValueCount >= 3) { score += 15; factors.push(`${highValueCount} high-value types`); }
  else if (types.size >= 1) { score += 10; factors.push(`${types.size} schema type(s)`); }

  score = Math.min(score, 100);

  return cr("google-schema", "Google AI Schema Markup", "Google AI Overview",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    score >= 20 ? "notice" : "warning", score,
    factors.length ? `Google AI schema signals: ${factors.join(", ")}.` : "No high-value schema types for Google AI Overview.",
    score < 50 ? "Add FAQPage, HowTo, and Article JSON-LD schema. FAQPage alone boosts AI Overview citations by ~30%. Google AI heavily relies on structured data." : undefined);
}

function checkGoogleEEAT($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // Author info
  const authorMeta = $('meta[name="author"]').attr("content");
  const authorBio = $('[class*="author" i], [class*="byline" i], [class*="bio" i]').length;
  const authorSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try { return JSON.parse($(el).html() ?? "").author; } catch { return false; }
  });

  if (authorMeta) { score += 15; factors.push(`author: ${authorMeta}`); }
  if (authorBio > 0) { score += 15; factors.push("author bio"); }
  if (authorSchema) { score += 15; factors.push("author in schema"); }

  // Dates
  const pubDate = $('meta[property="article:published_time"]').length > 0 || $("time[datetime]").length > 0;
  const modDate = $('meta[property="article:modified_time"]').length > 0;
  if (pubDate) { score += 10; factors.push("publish date"); }
  if (modDate) { score += 10; factors.push("modified date"); }

  // Expertise signals
  const bodyText = getBodyText($);
  const expertise = bodyText.match(/\b(expert|certified|years of experience|PhD|MD|professor|researcher|specialist|professional|founder|CEO|CTO)\b/gi);
  if (expertise && expertise.length >= 3) { score += 15; factors.push(`${expertise.length} expertise signals`); }
  else if (expertise && expertise.length >= 1) { score += 8; factors.push(`${expertise.length} expertise signal(s)`); }

  // About/Team links
  const aboutLinks = $('a[href*="about"], a[href*="team"]').length > 0;
  if (aboutLinks) { score += 10; factors.push("about/team links"); }

  score = Math.min(score, 100);

  return cr("google-eeat", "Google E-E-A-T Signals", "Google AI Overview",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning", score,
    factors.length ? `E-E-A-T for Google: ${factors.join(", ")}.` : "Weak E-E-A-T signals for Google AI Overview.",
    score < 50 ? "Google AI Overview heavily weighs E-E-A-T. Add author name, bio, credentials, publish/modified dates, and about page links." : undefined);
}

function checkGoogleAnswerCapsule($: CheerioAPI): CheckResult {
  // Google wants 40-60 word concise answers directly after H2 headings
  let capsuleCount = 0;
  let totalH2 = 0;

  $("h2").each((_, h2) => {
    totalH2++;
    const nextP = $(h2).next("p");
    if (nextP.length) {
      const words = nextP.text().trim().split(/\s+/).length;
      if (words >= 30 && words <= 70) capsuleCount++;
    }
  });

  if (totalH2 === 0)
    return cr("google-capsule", "Answer Capsules for Google", "Google AI Overview",
      "warning", "notice", 35,
      "No H2 headings found. Google AI Overview extracts answers from structured heading+paragraph pairs.",
      "Add H2 headings followed by 40-60 word concise answer paragraphs. These are the primary extraction target for AI Overviews.");

  const ratio = capsuleCount / totalH2;
  const score = Math.round(ratio * 100);

  return cr("google-capsule", "Answer Capsules for Google", "Google AI Overview",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", Math.max(score, 10),
    `${capsuleCount}/${totalH2} H2 headings followed by optimal-length answer paragraphs (40-60 words).`,
    score < 50 ? "After each H2, place a 40-60 word paragraph that directly answers the heading's question. Google AI Overview extracts these 'answer capsules' word-for-word." : undefined);
}

function checkGoogleSpeakable($: CheerioAPI): CheckResult {
  const hasSpeakable = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const text = $(el).html() ?? "";
      return text.includes('"speakable"') || text.includes('"Speakable"');
    } catch { return false; }
  });

  const hasArticleSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return ["Article", "NewsArticle", "BlogPosting"].includes(data["@type"]);
    } catch { return false; }
  });

  if (hasSpeakable)
    return cr("google-speakable", "Speakable Schema", "Google AI Overview", "pass", "notice", 100,
      "Speakable schema found — Google Assistant and AI can read your key content aloud.");

  if (hasArticleSchema)
    return cr("google-speakable", "Speakable Schema Missing", "Google AI Overview", "warning", "notice", 45,
      "Article schema exists but no Speakable property. Google AI and voice assistants benefit from Speakable markup.",
      'Add "speakable" to your Article schema to mark which sections are suitable for text-to-speech and AI reading.');

  return cr("google-speakable", "Speakable Schema", "Google AI Overview", "warning", "notice", 50,
    "No Speakable schema. This is optional but helps Google AI and voice assistants identify key content.",
    "Add Article schema with a speakable property pointing to your summary/key paragraphs via CSS selector.");
}

function checkGoogleKnowledgeGraph($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Named entities (Knowledge Graph entries)
  const properNouns = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g);
  const stops = new Set(["The New", "New York", "How To", "What Is"]);
  const entities = [...new Set(properNouns ?? [])].filter((e) => !stops.has(e) && e.length > 4);
  if (entities.length >= 10) { score += 30; factors.push(`${entities.length} named entities`); }
  else if (entities.length >= 5) { score += 20; factors.push(`${entities.length} entities`); }
  else if (entities.length >= 2) { score += 10; factors.push(`${entities.length} entities`); }

  // sameAs links (connect to Knowledge Graph)
  const sameAs = $('script[type="application/ld+json"]').toArray().some((el) => {
    try { return JSON.stringify(JSON.parse($(el).html() ?? "")).includes('"sameAs"'); } catch { return false; }
  });
  if (sameAs) { score += 25; factors.push("sameAs links (Knowledge Graph)"); }

  // Wikipedia/Wikidata references
  const wikiLinks = $('a[href*="wikipedia.org"], a[href*="wikidata.org"]').length;
  if (wikiLinks > 0) { score += 20; factors.push(`${wikiLinks} Wikipedia/Wikidata links`); }

  // Organization schema
  const hasOrg = $('script[type="application/ld+json"]').toArray().some((el) => {
    try { return JSON.parse($(el).html() ?? "")["@type"] === "Organization"; } catch { return false; }
  });
  if (hasOrg) { score += 15; factors.push("Organization schema"); }

  score = Math.min(score, 100);

  return cr("google-kg", "Knowledge Graph Signals", "Google AI Overview",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Knowledge Graph: ${factors.join(", ")}.` : "Weak Knowledge Graph signals.",
    score < 45 ? "Add sameAs links to Wikipedia/social profiles in schema, reference named entities, and add Organization schema. Google AI uses Knowledge Graph for verification." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  CHATGPT / SEARCHGPT
//  Key factors: llms.txt, answer capsules after H2 (50 words),
//  structured headings (40% more citations), direct definitions
//  Citation avg: 3.86 sources per response
// ═══════════════════════════════════════════════════════════════

function checkChatGPTLlmsTxt($: CheerioAPI, html: string): CheckResult {
  const hasLink = $('a[href*="llms.txt"], link[href*="llms.txt"]').length > 0;
  const htmlRef = /llms\.txt/i.test(html);
  const hasFullVersion = $('a[href*="llms-full.txt"]').length > 0;

  if (hasLink || htmlRef) {
    let score = 75;
    const factors = ["llms.txt referenced"];
    if (hasFullVersion) { score = 100; factors.push("llms-full.txt available"); }
    return cr("chatgpt-llmstxt", "llms.txt for ChatGPT", "ChatGPT / SearchGPT", "pass", "notice", score,
      `ChatGPT llms.txt signals: ${factors.join(", ")}.`);
  }

  return cr("chatgpt-llmstxt", "llms.txt Missing", "ChatGPT / SearchGPT", "warning", "notice", 30,
    "No llms.txt file detected. ChatGPT and other LLMs use this to understand your site structure.",
    "Create /llms.txt with a Markdown summary of your site content, key pages, and documentation. See llmstxt.org for the specification.");
}

function checkChatGPTAnswerCapsules($: CheerioAPI): CheckResult {
  // ChatGPT prefers 50-word self-contained answer blocks after H2
  let goodCapsules = 0;
  let totalSections = 0;

  $("h2, h3").each((_, heading) => {
    totalSections++;
    const nextP = $(heading).next("p");
    if (nextP.length) {
      const text = nextP.text().trim();
      const words = text.split(/\s+/).length;
      // Self-contained: starts with a definitive statement
      const isDefinitive = /^(the |a |an |this |it |[A-Z])/i.test(text);
      if (words >= 25 && words <= 70 && isDefinitive) goodCapsules++;
    }
  });

  const score = totalSections > 0 ? Math.min(Math.round((goodCapsules / totalSections) * 120), 100) : 20;

  return cr("chatgpt-capsules", "Answer Capsules for ChatGPT", "ChatGPT / SearchGPT",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    `${goodCapsules}/${totalSections} sections have extractable answer capsules (25-70 words, definitive opening).`,
    score < 50 ? "After each H2/H3, write a self-contained 50-word paragraph starting with a definitive statement. ChatGPT extracts these capsules directly into its conversational responses." : undefined);
}

function checkChatGPTStructuredHeadings($: CheerioAPI): CheckResult {
  const h2s = $("h2").length;
  const h3s = $("h3").length;
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  let score = 0;
  const factors: string[] = [];

  // Structured headings = 40% more ChatGPT citations
  if (h2s >= 5) { score += 40; factors.push(`${h2s} H2 sections (excellent)`); }
  else if (h2s >= 3) { score += 25; factors.push(`${h2s} H2 sections`); }
  else if (h2s >= 1) { score += 12; factors.push(`${h2s} H2 section(s)`); }

  if (h3s >= 3) { score += 20; factors.push(`${h3s} H3 sub-sections`); }
  else if (h3s >= 1) { score += 10; factors.push(`${h3s} H3 sub-section(s)`); }

  // Heading density relative to content
  const idealDensity = wordCount > 300 ? Math.floor(wordCount / 250) : 1;
  if (h2s >= idealDensity) { score += 20; factors.push("good heading density"); }

  // Question-format headings (ChatGPT loves Q&A)
  const questionHeadings = $("h2, h3").filter((_, el) => /\?$/.test($(el).text().trim())).length;
  if (questionHeadings >= 2) { score += 15; factors.push(`${questionHeadings} question headings`); }

  score = Math.min(score, 100);

  return cr("chatgpt-headings", "Structured Headings for ChatGPT", "ChatGPT / SearchGPT",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `ChatGPT heading structure: ${factors.join(", ")}.` : "Weak heading structure for ChatGPT extraction.",
    score < 50 ? "Add more H2/H3 headings, especially question-format ones. Structured content with clear headings gets 40% more ChatGPT citations." : undefined);
}

function checkChatGPTDirectDefinitions($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // "X is..." pattern — ChatGPT's favorite citation format
  const isDefinitions = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Za-z]+){0,3}\s(?:is|are|refers to|means|is defined as)\s[^.]{15,}\./g);
  const defCount = isDefinitions?.length ?? 0;

  // Wikipedia-style opening (first paragraph = comprehensive definition)
  const firstP = $("main p, article p, .content p, body p").first().text().trim();
  const hasStrongOpening = firstP.length > 50 && /\b(is|are|refers|means)\b/.test(firstP.substring(0, 150));

  let score = 0;
  const factors: string[] = [];

  if (defCount >= 5) { score += 50; factors.push(`${defCount} direct definitions`); }
  else if (defCount >= 3) { score += 35; factors.push(`${defCount} definitions`); }
  else if (defCount >= 1) { score += 18; factors.push(`${defCount} definition(s)`); }

  if (hasStrongOpening) { score += 30; factors.push("Wikipedia-style opening definition"); }

  // Bullet-point definitions
  const defLists = $("dl dt").length;
  if (defLists > 0) { score += 20; factors.push(`${defLists} definition list entries`); }

  score = Math.min(score, 100);

  return cr("chatgpt-definitions", "Direct Definitions for ChatGPT", "ChatGPT / SearchGPT",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `ChatGPT definitions: ${factors.join(", ")}.` : "No direct 'X is...' definitions found.",
    score < 45 ? "Add clear 'X is...' definitions. ChatGPT favors Wikipedia-style content where the first paragraph defines the topic. Use definition lists for terminology." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  PERPLEXITY
//  Key factors: freshness (24-48h), citation chains, original data,
//  author credentials, 7.42 citations/response (most citation-heavy)
// ═══════════════════════════════════════════════════════════════

function checkPerplexityFreshness($: CheerioAPI, headers: Record<string, string>): CheckResult {
  let score = 0;
  const factors: string[] = [];

  const modMeta = $('meta[property="article:modified_time"]').attr("content") ?? "";
  const pubMeta = $('meta[property="article:published_time"]').attr("content") ?? "";
  const lastMod = headers["last-modified"] ?? "";
  const timeTags = $("time[datetime]").toArray().map((t) => $(t).attr("datetime") ?? "");

  const dates = [modMeta, pubMeta, lastMod, ...timeTags].filter(Boolean);
  let mostRecent: Date | null = null;

  for (const d of dates) {
    try {
      const parsed = new Date(d);
      if (!mostRecent || parsed > mostRecent) mostRecent = parsed;
    } catch { /* skip */ }
  }

  if (mostRecent) {
    const daysAgo = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo <= 7) { score += 50; factors.push(`updated ${Math.round(daysAgo)}d ago (excellent for Perplexity)`); }
    else if (daysAgo <= 30) { score += 35; factors.push(`updated ${Math.round(daysAgo)}d ago`); }
    else if (daysAgo <= 90) { score += 20; factors.push(`updated ${Math.round(daysAgo)}d ago`); }
    else { score += 5; factors.push(`last update ${Math.round(daysAgo)}d ago (stale)`); }
  }

  if (modMeta) { score += 20; factors.push("article:modified_time"); }
  if (pubMeta) { score += 15; factors.push("article:published_time"); }
  if (lastMod) { score += 10; factors.push("Last-Modified header"); }

  score = Math.min(score, 100);

  return cr("perplexity-fresh", "Freshness for Perplexity", "Perplexity",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning", score,
    factors.length ? `Perplexity freshness: ${factors.join(", ")}.` : "No date signals found. Perplexity strongly penalizes stale content.",
    score < 50 ? "Perplexity indexes daily and favors recently updated content (24-48h impact). Add article:modified_time meta and Last-Modified header. Update content regularly." : undefined);
}

function checkPerplexityCitationChains($: CheerioAPI): CheckResult {
  // Perplexity follows citation chains — it trusts pages that link to primary sources
  const externalLinks = $('a[href^="http"]').toArray();
  const domains = new Set<string>();
  let academicSources = 0;
  let dataSources = 0;

  externalLinks.forEach((el) => {
    try {
      const href = $(el).attr("href") ?? "";
      const domain = new URL(href).hostname;
      domains.add(domain);
      if (/\.edu$|\.gov$|arxiv|pubmed|scholar\.google|nature\.com|science\.org|springer/i.test(domain)) academicSources++;
      if (/statista|census|worldbank|data\.|dataset|kaggle/i.test(domain)) dataSources++;
    } catch { /* skip */ }
  });

  const bodyText = getBodyText($);
  const citationPhrases = bodyText.match(/\b(according to|research from|study by|data from|published in|report by|survey by)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (domains.size >= 10) { score += 30; factors.push(`${domains.size} unique external domains`); }
  else if (domains.size >= 5) { score += 20; factors.push(`${domains.size} external domains`); }
  else if (domains.size >= 2) { score += 10; factors.push(`${domains.size} domains`); }

  if (academicSources >= 3) { score += 25; factors.push(`${academicSources} academic/gov sources`); }
  else if (academicSources >= 1) { score += 12; factors.push(`${academicSources} academic source(s)`); }

  if (dataSources >= 1) { score += 15; factors.push(`${dataSources} data source(s)`); }

  if (citationPhrases && citationPhrases.length >= 3) { score += 20; factors.push(`${citationPhrases.length} citation phrases`); }
  else if (citationPhrases && citationPhrases.length >= 1) { score += 10; factors.push(`${citationPhrases.length} citation phrase(s)`); }

  score = Math.min(score, 100);

  return cr("perplexity-citations", "Citation Chains for Perplexity", "Perplexity",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Citation chains: ${factors.join(", ")}.` : "No citation chain signals found.",
    score < 45 ? "Link to primary sources (.edu, .gov, research papers). Perplexity follows citation chains and assigns higher trust to content referencing credible primary sources." : undefined);
}

function checkPerplexityOriginalData($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  const percentages = (bodyText.match(/\d+(\.\d+)?%/g) ?? []).length;
  const currencies = (bodyText.match(/\$\d[\d,]*|\€\d[\d,]*|\£\d[\d,]*/g) ?? []).length;
  const originalClaims = (bodyText.match(/\b(we found|our research|our data|our analysis|we discovered|we tested|we surveyed|our study|our findings)\b/gi) ?? []).length;
  const specificNumbers = (bodyText.match(/\b\d{1,3}(,\d{3})+\b/g) ?? []).length;

  let score = 0;
  const factors: string[] = [];

  if (originalClaims >= 3) { score += 40; factors.push(`${originalClaims} original research claims`); }
  else if (originalClaims >= 1) { score += 20; factors.push(`${originalClaims} original claim(s)`); }

  if (percentages >= 5) { score += 25; factors.push(`${percentages} statistics`); }
  else if (percentages >= 2) { score += 12; factors.push(`${percentages} statistics`); }

  if (currencies >= 2) { score += 10; factors.push(`${currencies} price/financial data`); }
  if (specificNumbers >= 3) { score += 15; factors.push(`${specificNumbers} specific numbers`); }

  score = Math.min(score, 100);

  return cr("perplexity-data", "Original Data for Perplexity", "Perplexity",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Original data: ${factors.join(", ")}.` : "No unique data points or original research found.",
    score < 45 ? "Include original statistics, research findings, and specific numbers. Perplexity strongly favors content with unique, verifiable data it can cite with confidence." : undefined);
}

function checkPerplexityAuthorCredentials($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  const authorMeta = $('meta[name="author"]').attr("content");
  if (authorMeta) { score += 25; factors.push(`author: ${authorMeta}`); }

  const authorBio = $('[class*="author" i], [class*="bio" i], [class*="byline" i]').length;
  if (authorBio > 0) { score += 25; factors.push("visible author bio"); }

  const aboutPage = $('a[href*="/about"], a[href*="/author/"]').length;
  if (aboutPage > 0) { score += 15; factors.push("author/about page links"); }

  const bodyText = getBodyText($);
  const credentials = bodyText.match(/\b(PhD|MD|MBA|CPA|JD|Professor|Dr\.|certified|years of experience)\b/gi);
  if (credentials && credentials.length >= 2) { score += 25; factors.push(`${credentials.length} credential mentions`); }
  else if (credentials && credentials.length >= 1) { score += 12; factors.push("1 credential"); }

  score = Math.min(score, 100);

  return cr("perplexity-author", "Author Credentials for Perplexity", "Perplexity",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Author signals: ${factors.join(", ")}.` : "No author credentials found.",
    score < 45 ? "Add clear author attribution with credentials and a bio section. Perplexity's trust evaluation weighs author expertise heavily." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  MICROSOFT COPILOT
//  Key factors: Bing index, OpenGraph, structured data
// ═══════════════════════════════════════════════════════════════

function checkCopilotOpenGraph($: CheerioAPI): CheckResult {
  const tags = {
    title: $('meta[property="og:title"]').attr("content"),
    desc: $('meta[property="og:description"]').attr("content"),
    image: $('meta[property="og:image"]').attr("content"),
    url: $('meta[property="og:url"]').attr("content"),
    type: $('meta[property="og:type"]').attr("content"),
    siteName: $('meta[property="og:site_name"]').attr("content"),
  };

  const present = Object.entries(tags).filter(([, v]) => v);
  const score = Math.round((present.length / 6) * 100);

  return cr("copilot-og", "OpenGraph for Copilot", "Microsoft Copilot",
    score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
    "notice", score,
    `OpenGraph completeness: ${present.length}/6 tags (${present.map(([k]) => k).join(", ")}).`,
    score < 70 ? "Complete your OpenGraph tags (og:title, og:description, og:image, og:url, og:type, og:site_name). Copilot uses Bing which indexes OG metadata heavily." : undefined);
}

function checkCopilotBingSchema($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // SearchAction schema (Bing sitelinks search box)
  const hasSearchAction = $('script[type="application/ld+json"]').toArray().some((el) => {
    try { return JSON.stringify(JSON.parse($(el).html() ?? "")).includes("SearchAction"); } catch { return false; }
  });
  if (hasSearchAction) { score += 30; factors.push("SearchAction schema"); }

  // WebSite schema
  const hasWebSite = $('script[type="application/ld+json"]').toArray().some((el) => {
    try { return JSON.parse($(el).html() ?? "")["@type"] === "WebSite"; } catch { return false; }
  });
  if (hasWebSite) { score += 20; factors.push("WebSite schema"); }

  // Breadcrumb
  const hasBreadcrumb = $('[class*="breadcrumb" i], [itemtype*="BreadcrumbList"]').length > 0;
  if (hasBreadcrumb) { score += 20; factors.push("breadcrumb navigation"); }

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href");
  if (canonical) { score += 15; factors.push("canonical URL"); }

  // Hreflang
  const hreflang = $('link[rel="alternate"][hreflang]').length;
  if (hreflang > 0) { score += 15; factors.push(`${hreflang} hreflang tag(s)`); }

  score = Math.min(score, 100);

  return cr("copilot-bing", "Bing-Specific Schema for Copilot", "Microsoft Copilot",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Bing signals: ${factors.join(", ")}.` : "No Bing-specific optimization signals.",
    score < 45 ? "Add WebSite + SearchAction schema, breadcrumbs, canonical URL, and hreflang tags. Copilot uses Bing's index which values these signals." : undefined);
}

function checkCopilotStructuredData($: CheerioAPI): CheckResult {
  const ldScripts = $('script[type="application/ld+json"]').length;
  const microdata = $("[itemscope]").length;
  const rdfa = $("[typeof]").length;
  const total = ldScripts + microdata + rdfa;

  let score = 0;
  if (ldScripts >= 2) score += 50;
  else if (ldScripts >= 1) score += 30;
  if (microdata > 0) score += 25;
  if (rdfa > 0) score += 15;

  score = Math.min(score, 100);

  return cr("copilot-structured", "Structured Data Volume for Copilot", "Microsoft Copilot",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    `Structured data: ${ldScripts} JSON-LD, ${microdata} microdata, ${rdfa} RDFa blocks.`,
    score < 45 ? "Add more structured data. Copilot/Bing heavily uses structured data to understand page content and extract answers." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  CLAUDE
//  Key factors: comprehensive depth, logical structure,
//  evidence chains, well-reasoned arguments
// ═══════════════════════════════════════════════════════════════

function checkClaudeContentDepth($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const lists = $("ul, ol").length;
  const tables = $("table").length;
  const codeBlocks = $("pre code, .highlight").length;

  let score = 0;
  const factors: string[] = [];

  // Claude processes long context well — reward comprehensive content
  if (wordCount >= 3000) { score += 30; factors.push(`${wordCount.toLocaleString()} words (comprehensive)`); }
  else if (wordCount >= 1500) { score += 20; factors.push(`${wordCount.toLocaleString()} words`); }
  else if (wordCount >= 500) { score += 10; factors.push(`${wordCount} words`); }
  else { factors.push(`only ${wordCount} words (shallow)`); }

  if (h2Count + h3Count >= 8) { score += 20; factors.push(`${h2Count + h3Count} sections`); }
  else if (h2Count >= 3) { score += 12; factors.push(`${h2Count} sections`); }

  if (lists >= 3) { score += 15; factors.push(`${lists} lists`); }
  if (tables >= 1) { score += 10; factors.push(`${tables} table(s)`); }
  if (codeBlocks >= 1) { score += 10; factors.push(`${codeBlocks} code block(s)`); }

  score = Math.min(score, 100);

  return cr("claude-depth", "Content Depth for Claude", "Claude",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Claude depth: ${factors.join(", ")}.` : "Shallow content for Claude's processing capabilities.",
    score < 50 ? "Claude excels with comprehensive, in-depth content. Aim for 1500+ words with detailed sections, lists, tables, and code examples." : undefined);
}

function checkClaudeLogicalStructure($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Logical connectors (Claude values well-reasoned arguments)
  const logical = bodyText.match(/\b(therefore|because|consequently|however|furthermore|moreover|in contrast|as a result|specifically|for instance|in addition|on the other hand|nevertheless|thus|hence)\b/gi);
  if (logical && logical.length >= 10) { score += 35; factors.push(`${logical.length} logical connectors`); }
  else if (logical && logical.length >= 5) { score += 22; factors.push(`${logical.length} connectors`); }
  else if (logical && logical.length >= 2) { score += 10; factors.push(`${logical.length} connector(s)`); }

  // Premise-conclusion patterns
  const premises = bodyText.match(/\b(given that|assuming|if we consider|since|considering that)\b/gi);
  if (premises && premises.length >= 2) { score += 20; factors.push("premise-conclusion structure"); }

  // Section progression (intro → body → conclusion)
  const headings = $("h2").toArray().map((h) => $(h).text().toLowerCase());
  const hasIntro = headings.some((h) => /intro|overview|background|context/i.test(h));
  const hasConclusion = headings.some((h) => /conclusion|summary|takeaway|result/i.test(h));
  if (hasIntro && hasConclusion) { score += 25; factors.push("clear intro → conclusion arc"); }
  else if (hasConclusion) { score += 12; factors.push("conclusion section"); }

  // Numbered/structured arguments
  const numberedArgs = bodyText.match(/\b(first|second|third|finally|point \d|reason \d)\b/gi);
  if (numberedArgs && numberedArgs.length >= 3) { score += 15; factors.push("numbered argument structure"); }

  score = Math.min(score, 100);

  return cr("claude-logic", "Logical Structure for Claude", "Claude",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Logical structure: ${factors.join(", ")}.` : "Weak logical structure for Claude.",
    score < 45 ? "Use logical connectors (therefore, because, however), premise-conclusion patterns, and numbered arguments. Claude values well-reasoned, logically structured content." : undefined);
}

function checkClaudeEvidenceChains($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Evidence patterns
  const evidence = bodyText.match(/\b(evidence shows|research indicates|studies demonstrate|data suggests|experiments reveal|analysis confirms|findings show)\b/gi);
  if (evidence && evidence.length >= 3) { score += 30; factors.push(`${evidence.length} evidence claims`); }
  else if (evidence && evidence.length >= 1) { score += 15; factors.push(`${evidence.length} evidence claim(s)`); }

  // Specific citations
  const citations = bodyText.match(/\b(according to \w+|(\w+ et al\.)|([\d]{4}) study)\b/gi);
  if (citations && citations.length >= 2) { score += 25; factors.push(`${citations.length} specific citations`); }
  else if (citations && citations.length >= 1) { score += 12; factors.push("1 citation"); }

  // Counterarguments (Claude respects nuanced thinking)
  const counterArgs = bodyText.match(/\b(however|on the other hand|critics argue|some may argue|alternatively|despite this|counterpoint)\b/gi);
  if (counterArgs && counterArgs.length >= 2) { score += 25; factors.push("presents counterarguments"); }
  else if (counterArgs && counterArgs.length >= 1) { score += 12; factors.push("1 counterargument"); }

  // External source links
  const externalLinks = $('a[href^="http"]').length;
  if (externalLinks >= 5) { score += 15; factors.push(`${externalLinks} external references`); }

  score = Math.min(score, 100);

  return cr("claude-evidence", "Evidence Chains for Claude", "Claude",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Evidence quality: ${factors.join(", ")}.` : "No evidence chains found.",
    score < 45 ? "Add evidence claims, specific citations, and counterarguments. Claude values nuanced, well-evidenced content over one-sided assertions." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  APPLE INTELLIGENCE
//  Key factors: mobile-first, performance, Applebot-Extended opt-in
// ═══════════════════════════════════════════════════════════════

function checkAppleMobileOptimization($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  if (/width=device-width/.test(viewport)) { score += 25; factors.push("responsive viewport"); }

  const themeColor = $('meta[name="theme-color"]').attr("content");
  if (themeColor) { score += 15; factors.push(`theme-color: ${themeColor}`); }

  const appleMeta = $('meta[name="apple-mobile-web-app-capable"]').length > 0;
  if (appleMeta) { score += 15; factors.push("apple-mobile-web-app-capable"); }

  const touchIcon = $('link[rel="apple-touch-icon"]').length > 0;
  if (touchIcon) { score += 15; factors.push("apple-touch-icon"); }

  const appleBanner = $('meta[name="apple-itunes-app"]').attr("content");
  if (appleBanner) { score += 10; factors.push("Smart App Banner"); }

  // No user-scalable=no penalty
  if (!/user-scalable=no/i.test(viewport)) { score += 10; factors.push("zoom allowed"); }

  score = Math.min(score, 100);

  return cr("apple-mobile", "Mobile Optimization for Apple", "Apple Intelligence",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Apple mobile: ${factors.join(", ")}.` : "No Apple-specific mobile optimization.",
    score < 50 ? "Add responsive viewport, theme-color, apple-touch-icon, and apple-mobile-web-app-capable meta. Apple Intelligence prioritizes mobile-optimized content from Safari." : undefined);
}

function checkApplePerformanceSignals($: CheerioAPI, html: string, headers: Record<string, string>): CheckResult {
  let score = 50; // Baseline — we can't measure real performance via HTML alone
  const factors: string[] = [];

  // HTML size (Apple cares about fast loading)
  const htmlKB = Math.round(html.length / 1024);
  if (htmlKB < 100) { score += 15; factors.push(`${htmlKB}KB HTML (light)`); }
  else if (htmlKB < 300) { score += 5; factors.push(`${htmlKB}KB HTML`); }
  else { score -= 10; factors.push(`${htmlKB}KB HTML (heavy)`); }

  // Resource hints
  const preconnects = $('link[rel="preconnect"]').length;
  const preloads = $('link[rel="preload"]').length;
  if (preconnects > 0) { score += 10; factors.push(`${preconnects} preconnect(s)`); }
  if (preloads > 0) { score += 10; factors.push(`${preloads} preload(s)`); }

  // Cache headers
  const cacheControl = headers["cache-control"] ?? "";
  if (cacheControl && !cacheControl.includes("no-cache")) { score += 10; factors.push("cache-control set"); }

  score = Math.max(0, Math.min(score, 100));

  return cr("apple-perf", "Performance Signals for Apple", "Apple Intelligence",
    score >= 55 ? "pass" : score >= 35 ? "warning" : "fail",
    "notice", score,
    `Performance: ${factors.join(", ")}. (Full CWV assessment requires browser-based audit.)`,
    score < 55 ? "Optimize page weight, add resource hints (preconnect/preload), and configure cache headers. Apple Intelligence prioritizes fast-loading pages." : undefined);
}

function checkAppleStructuredContent($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // Apple News format compatibility signals
  const article = $("article").length;
  const sections = $("section").length;
  const figure = $("figure").length;

  if (article > 0) { score += 25; factors.push("<article> element"); }
  if (sections >= 3) { score += 20; factors.push(`${sections} <section> elements`); }
  if (figure > 0) { score += 15; factors.push(`${figure} <figure> element(s)`); }

  // Clear heading hierarchy
  const h1 = $("h1").length;
  const h2 = $("h2").length;
  if (h1 === 1 && h2 >= 2) { score += 20; factors.push("clean heading hierarchy"); }

  // Time elements (Apple indexes publication dates)
  const timeEls = $("time[datetime]").length;
  if (timeEls > 0) { score += 15; factors.push(`${timeEls} <time> elements`); }

  score = Math.min(score, 100);

  return cr("apple-structure", "Content Structure for Apple", "Apple Intelligence",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Apple structure: ${factors.join(", ")}.` : "Weak semantic structure for Apple.",
    score < 45 ? "Use <article>, <section>, <figure>, <time> semantic elements. Apple Intelligence and Siri rely on clean semantic HTML for content extraction." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  META AI
//  Key factors: OpenGraph perfection (Meta invented it),
//  social signals, rich media
// ═══════════════════════════════════════════════════════════════

function checkMetaOpenGraphComplete($: CheerioAPI): CheckResult {
  const required = ["og:title", "og:description", "og:image", "og:url", "og:type"];
  const extra = ["og:site_name", "og:locale", "og:image:width", "og:image:height", "og:image:alt"];

  let requiredCount = 0;
  let extraCount = 0;

  for (const tag of required) {
    if ($(`meta[property="${tag}"]`).attr("content")) requiredCount++;
  }
  for (const tag of extra) {
    if ($(`meta[property="${tag}"]`).attr("content")) extraCount++;
  }

  const score = Math.min(Math.round((requiredCount / 5) * 70 + (extraCount / 5) * 30), 100);

  return cr("meta-og", "OpenGraph for Meta AI", "Meta AI",
    score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
    score >= 40 ? "notice" : "warning", score,
    `Meta OpenGraph: ${requiredCount}/5 required + ${extraCount}/5 enhanced tags.`,
    score < 70 ? "Meta literally invented OpenGraph. Complete all og:* tags including og:image dimensions and og:locale. Meta AI prioritizes content with rich OG metadata." : undefined);
}

function checkMetaSocialSignals($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // Share buttons/links
  const shareElements = $('[class*="share" i], [class*="social" i], a[href*="facebook.com/share"], a[href*="twitter.com/intent"], a[href*="linkedin.com/share"]');
  if (shareElements.length >= 3) { score += 30; factors.push(`${shareElements.length} social share elements`); }
  else if (shareElements.length >= 1) { score += 15; factors.push(`${shareElements.length} share element(s)`); }

  // Comment sections (engagement signals)
  const comments = $('[class*="comment" i], [id*="comment" i], #disqus_thread, [class*="discussion" i]');
  if (comments.length > 0) { score += 20; factors.push("comment section"); }

  // Social proof
  const bodyText = getBodyText($);
  const socialProof = bodyText.match(/\b(\d+[\s,]*(?:shares|likes|followers|subscribers|users|customers|reviews|ratings))\b/gi);
  if (socialProof && socialProof.length >= 2) { score += 25; factors.push(`${socialProof.length} social proof signals`); }

  // Engagement-friendly content length (not too long for social)
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 300 && wordCount <= 2000) { score += 15; factors.push("social-friendly length"); }

  score = Math.min(score, 100);

  return cr("meta-social", "Social Signals for Meta AI", "Meta AI",
    score >= 40 ? "pass" : score >= 15 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Social signals: ${factors.join(", ")}.` : "No social engagement signals found.",
    score < 40 ? "Add social share buttons, comment sections, and social proof (user counts, reviews). Meta AI weights social engagement signals when selecting sources." : undefined);
}

function checkMetaRichMedia($: CheerioAPI): CheckResult {
  const images = $("img").length;
  const videos = $("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='facebook']").length;
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogVideo = $('meta[property="og:video"]').attr("content");

  let score = 0;
  const factors: string[] = [];

  if (ogImage) { score += 25; factors.push("og:image set"); }
  if (ogVideo) { score += 20; factors.push("og:video set"); }
  if (images >= 3) { score += 20; factors.push(`${images} images`); }
  else if (images >= 1) { score += 10; factors.push(`${images} image(s)`); }
  if (videos >= 1) { score += 20; factors.push(`${videos} video(s)`); }

  // Image dimensions in OG
  const ogWidth = $('meta[property="og:image:width"]').attr("content");
  const ogHeight = $('meta[property="og:image:height"]').attr("content");
  if (ogWidth && ogHeight) { score += 10; factors.push("og:image dimensions specified"); }

  score = Math.min(score, 100);

  return cr("meta-media", "Rich Media for Meta AI", "Meta AI",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Rich media: ${factors.join(", ")}.` : "No rich media optimization for Meta AI.",
    score < 45 ? "Set og:image (1200x630px recommended) and og:video. Add multiple images. Meta AI heavily favors visually rich content for its social-integrated responses." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  百度 / 文心一言
//  Key factors: Baiduspider access, Chinese content signals, mobile
// ═══════════════════════════════════════════════════════════════

function checkBaiduMeta($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // Baidu-specific meta tags
  const baiduVerify = $('meta[name="baidu-site-verification"]').attr("content");
  if (baiduVerify) { score += 25; factors.push("百度站点验证"); }

  // Language signals for Chinese content
  const lang = $("html").attr("lang") ?? "";
  const hreflangZh = $('link[rel="alternate"][hreflang*="zh"]').length;
  if (/^zh/.test(lang)) { score += 20; factors.push(`lang="${lang}"`); }
  if (hreflangZh > 0) { score += 15; factors.push(`${hreflangZh} 中文 hreflang`); }

  // Content language meta
  const contentLang = $('meta[http-equiv="content-language"]').attr("content") ?? "";
  if (/zh/i.test(contentLang)) { score += 10; factors.push("Content-Language: zh"); }

  // Charset
  const charset = $('meta[charset]').attr("charset") ?? "";
  if (/utf-8/i.test(charset)) { score += 15; factors.push("UTF-8 charset"); }

  // Description meta (Baidu uses it heavily)
  const desc = $('meta[name="description"]').attr("content") ?? "";
  if (desc.length >= 50) { score += 15; factors.push("detailed meta description"); }

  score = Math.min(score, 100);

  return cr("baidu-meta", "百度/文心 Meta 优化", "百度 / 文心一言",
    score >= 40 ? "pass" : score >= 15 ? "warning" : "fail",
    "notice", score,
    factors.length ? `百度信号: ${factors.join(", ")}.` : "未检测到百度优化信号。",
    score < 40 ? "添加百度站点验证、中文 hreflang 标签、lang=\"zh-CN\"。百度/文心一言需要明确的中文内容信号来优先引用。" : undefined);
}

function checkBaiduMobileReady($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  // Mobile is critical for Chinese market (95%+ mobile internet)
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  if (/width=device-width/.test(viewport)) { score += 30; factors.push("响应式 viewport"); }

  // MIP (Mobile Instant Pages) or AMP equivalents
  const ampLink = $('link[rel="amphtml"]').attr("href");
  if (ampLink) { score += 15; factors.push("AMP 版本"); }

  // Adaptive serving
  const vary = $('meta[http-equiv="Vary"]').attr("content") ?? "";
  if (/user-agent/i.test(vary)) { score += 10; factors.push("Vary: User-Agent"); }

  // Touch-friendly
  const touchIcons = $('link[rel*="icon"]').length;
  if (touchIcons > 0) { score += 15; factors.push(`${touchIcons} 图标`); }

  // No user-scalable=no
  if (viewport && !/user-scalable=no/i.test(viewport)) { score += 15; factors.push("允许缩放"); }

  // Fast loading signals
  const lazyImages = $("img[loading='lazy']").length;
  if (lazyImages > 0) { score += 15; factors.push(`${lazyImages} 懒加载图片`); }

  score = Math.min(score, 100);

  return cr("baidu-mobile", "移动端优化 (百度)", "百度 / 文心一言",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `移动端: ${factors.join(", ")}.` : "移动端优化不足。",
    score < 45 ? "中国 95% 以上互联网用户使用移动端。确保响应式设计、允许缩放、图片懒加载。百度移动端索引优先。" : undefined);
}

function checkBaiduContentSignals($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Chinese character detection
  const chineseChars = bodyText.match(/[\u4e00-\u9fff]/g);
  const chineseRatio = chineseChars ? chineseChars.length / bodyText.length : 0;

  if (chineseRatio > 0.3) { score += 35; factors.push(`${Math.round(chineseRatio * 100)}% 中文内容`); }
  else if (chineseRatio > 0.1) { score += 20; factors.push(`${Math.round(chineseRatio * 100)}% 中文`); }
  else if (chineseRatio > 0) { score += 5; factors.push("少量中文"); }
  else { score += 30; factors.push("非中文内容 (仍可被百度索引)"); }

  // Content depth
  const wordCount = bodyText.length;
  if (wordCount >= 3000) { score += 20; factors.push("内容丰富"); }
  else if (wordCount >= 1000) { score += 12; factors.push("中等内容量"); }

  // Structured content (Baidu extracts featured snippets too)
  const h2Count = $("h2").length;
  if (h2Count >= 3) { score += 20; factors.push(`${h2Count} 个 H2 标题`); }

  // Keywords meta (Baidu still uses it, unlike Google)
  const keywords = $('meta[name="keywords"]').attr("content");
  if (keywords) { score += 15; factors.push("keywords meta (百度仍在使用)"); }

  score = Math.min(score, 100);

  return cr("baidu-content", "内容信号 (百度/文心)", "百度 / 文心一言",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `内容: ${factors.join(", ")}.` : "未检测到百度优化内容信号。",
    score < 45 ? "百度/文心一言偏好结构化的中文内容，使用 meta keywords（百度仍在使用）、H2 标题分段。非中文内容也可被索引但引用优先级较低。" : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  字节 / 豆包
//  Key factors: Bytespider, short+long form, mobile-first, video
// ═══════════════════════════════════════════════════════════════

function checkBytedanceMobileFirst($: CheerioAPI): CheckResult {
  let score = 0;
  const factors: string[] = [];

  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  if (/width=device-width/.test(viewport)) { score += 30; factors.push("响应式"); }

  // Touch targets (ByteDance apps are mobile-native)
  const links = $("a").length;
  const buttons = $("button").length;
  if (links + buttons > 0) { score += 15; factors.push(`${links + buttons} 交互元素`); }

  // Fast rendering signals
  const inlineStyles = $("[style]").length;
  if (inlineStyles < 10) { score += 15; factors.push("少量内联样式"); }

  // Image optimization
  const images = $("img");
  const lazyLoaded = images.filter("[loading='lazy']").length;
  const withSrcset = images.filter("[srcset]").length;
  if (lazyLoaded > 0) { score += 15; factors.push(`${lazyLoaded} 懒加载`); }
  if (withSrcset > 0) { score += 15; factors.push(`${withSrcset} 响应式图片`); }

  score = Math.min(score, 100);

  return cr("bytedance-mobile", "移动优先 (豆包)", "字节 / 豆包",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `移动优化: ${factors.join(", ")}.` : "移动端优化不足。",
    score < 45 ? "字节系产品（豆包、抖音）完全以移动端为中心。确保响应式设计、图片懒加载和 srcset 响应式图片。" : undefined);
}

function checkBytedanceVideoSignals($: CheerioAPI): CheckResult {
  const videos = $("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='bilibili'], iframe[src*='douyin']").length;
  const videoSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["@type"] === "VideoObject";
    } catch { return false; }
  });
  const ogVideo = $('meta[property="og:video"]').attr("content");

  let score = 0;
  const factors: string[] = [];

  if (videos >= 2) { score += 35; factors.push(`${videos} 个视频`); }
  else if (videos >= 1) { score += 25; factors.push("1 个视频"); }

  if (videoSchema) { score += 25; factors.push("VideoObject schema"); }
  if (ogVideo) { score += 20; factors.push("og:video"); }

  // Images as fallback for visual content
  const images = $("img").length;
  if (images >= 5) { score += 15; factors.push(`${images} 张图片`); }

  score = Math.min(score, 100);

  if (score === 0)
    return cr("bytedance-video", "视频内容 (豆包)", "字节 / 豆包", "warning", "notice", 35,
      "未检测到视频内容。字节跳动（豆包/抖音）以视频为核心生态。",
      "添加视频内容并使用 VideoObject schema。字节系 AI 优先引用包含多媒体（特别是视频）的内容。");

  return cr("bytedance-video", "视频内容 (豆包)", "字节 / 豆包",
    score >= 45 ? "pass" : "warning", "notice", score,
    `视频信号: ${factors.join(", ")}.`);
}

function checkBytedanceContentFormat($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  let score = 0;
  const factors: string[] = [];

  // ByteDance supports both short-form and long-form
  // Short-form: extractable snippets under 300 chars
  const h2s = $("h2");
  let shortSnippets = 0;
  h2s.each((_, h2) => {
    const nextP = $(h2).next("p");
    if (nextP.length && nextP.text().trim().length <= 300 && nextP.text().trim().length >= 30) shortSnippets++;
  });
  if (shortSnippets >= 3) { score += 30; factors.push(`${shortSnippets} 短摘要段落`); }
  else if (shortSnippets >= 1) { score += 15; factors.push(`${shortSnippets} 短摘要`); }

  // Lists (highly extractable)
  const lists = $("ul, ol").length;
  if (lists >= 3) { score += 20; factors.push(`${lists} 列表`); }

  // Bold/highlighted key points
  const boldCount = $("strong, b").length;
  if (boldCount >= 5) { score += 20; factors.push(`${boldCount} 加粗关键词`); }

  // Content breadth
  if (wordCount >= 500) { score += 15; factors.push("内容充实"); }

  score = Math.min(score, 100);

  return cr("bytedance-format", "内容格式 (豆包)", "字节 / 豆包",
    score >= 40 ? "pass" : score >= 15 ? "warning" : "fail",
    "notice", score,
    factors.length ? `格式: ${factors.join(", ")}.` : "内容格式不利于豆包提取。",
    score < 40 ? "使用短段落 (300 字以内)、列表、加粗关键词。豆包既提取短摘要也引用长文，但偏好易于截取的格式化内容。" : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  DEEPSEEK
//  Key factors: technical depth, code content, structured reasoning
// ═══════════════════════════════════════════════════════════════

function checkDeepSeekTechnicalDepth($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Technical vocabulary density
  const technicalTerms = bodyText.match(/\b(algorithm|API|architecture|benchmark|compile|database|deploy|framework|infrastructure|latency|microservice|optimization|parameter|protocol|runtime|scalab|throughput|virtualization|container|kubernetes|docker|neural|transformer|embedding|tokeniz)\b/gi);
  if (technicalTerms && technicalTerms.length >= 15) { score += 35; factors.push(`${technicalTerms.length} 技术术语`); }
  else if (technicalTerms && technicalTerms.length >= 5) { score += 20; factors.push(`${technicalTerms.length} 技术术语`); }
  else if (technicalTerms && technicalTerms.length >= 1) { score += 8; factors.push(`${technicalTerms.length} 技术术语`); }

  // Detailed explanations
  const explanations = bodyText.match(/\b(this means|in other words|specifically|the reason|under the hood|implementation|how it works)\b/gi);
  if (explanations && explanations.length >= 5) { score += 25; factors.push("深度技术解释"); }
  else if (explanations && explanations.length >= 2) { score += 12; factors.push("部分技术解释"); }

  // Mathematical or formula content
  const mathContent = $("math, .math, .katex, .MathJax, code:contains('=')").length;
  if (mathContent > 0) { score += 15; factors.push(`${mathContent} 数学/公式元素`); }

  // Version numbers and specific configs
  const versions = bodyText.match(/v\d+\.\d+|version \d+/gi);
  if (versions && versions.length >= 2) { score += 15; factors.push("具体版本号"); }

  score = Math.min(score, 100);

  return cr("deepseek-tech", "技术深度 (DeepSeek)", "DeepSeek",
    score >= 40 ? "pass" : score >= 15 ? "warning" : "fail",
    "notice", score,
    factors.length ? `技术深度: ${factors.join(", ")}.` : "技术内容不足。",
    score < 40 ? "DeepSeek 擅长技术和编程领域。增加技术术语、实现细节、版本号和具体配置信息，提高被 DeepSeek 引用的概率。" : undefined);
}

function checkDeepSeekCodeContent($: CheerioAPI): CheckResult {
  const codeBlocks = $("pre code, .highlight, .code-block, pre.language-");
  const inlineCode = $("code").not("pre code").length;
  let score = 0;
  const factors: string[] = [];

  if (codeBlocks.length >= 5) { score += 40; factors.push(`${codeBlocks.length} 代码块`); }
  else if (codeBlocks.length >= 2) { score += 25; factors.push(`${codeBlocks.length} 代码块`); }
  else if (codeBlocks.length >= 1) { score += 12; factors.push("1 代码块"); }

  if (inlineCode >= 10) { score += 20; factors.push(`${inlineCode} 内联代码`); }
  else if (inlineCode >= 3) { score += 10; factors.push(`${inlineCode} 内联代码`); }

  // Code with language specification
  const langSpecified = $("pre code[class*='language-'], pre[class*='language-']").length;
  if (langSpecified > 0) { score += 15; factors.push(`${langSpecified} 语言标注`); }

  // CLI/command examples
  const bodyText = getBodyText($);
  const commands = bodyText.match(/\$ [a-z]/g);
  if (commands && commands.length >= 2) { score += 15; factors.push("CLI 命令示例"); }

  score = Math.min(score, 100);

  if (score === 0)
    return cr("deepseek-code", "代码内容 (DeepSeek)", "DeepSeek", "pass", "notice", 50,
      "无代码内容 — 非技术页面无需代码。DeepSeek 也处理非代码内容。");

  return cr("deepseek-code", "代码内容 (DeepSeek)", "DeepSeek",
    score >= 40 ? "pass" : "warning", "notice", score,
    `代码: ${factors.join(", ")}.`,
    score < 40 ? "添加带语言标注的代码块、CLI 命令示例。DeepSeek 是代码能力最强的 AI 之一，优先引用包含高质量代码示例的内容。" : undefined);
}

function checkDeepSeekStructuredReasoning($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  let score = 0;
  const factors: string[] = [];

  // Step-by-step reasoning (DeepSeek-R1 is reasoning-focused)
  const steps = bodyText.match(/\b(step \d|first|second|third|finally|therefore|thus|hence|consequently|it follows)\b/gi);
  if (steps && steps.length >= 5) { score += 30; factors.push(`${steps.length} 推理步骤`); }
  else if (steps && steps.length >= 2) { score += 15; factors.push(`${steps.length} 推理步骤`); }

  // Pros/cons or trade-off analysis
  const tradeoffs = bodyText.match(/\b(pros?|cons?|trade-?off|advantage|disadvantage|benefit|drawback|limitation|caveat)\b/gi);
  if (tradeoffs && tradeoffs.length >= 4) { score += 25; factors.push("利弊分析"); }
  else if (tradeoffs && tradeoffs.length >= 2) { score += 12; factors.push("部分利弊分析"); }

  // Comparison structures
  const comparisons = bodyText.match(/\b(compared to|versus|vs\.?|unlike|better than|worse than|faster than|slower than)\b/gi);
  if (comparisons && comparisons.length >= 3) { score += 25; factors.push(`${comparisons.length} 对比分析`); }
  else if (comparisons && comparisons.length >= 1) { score += 10; factors.push("对比分析"); }

  // Quantitative reasoning
  const quantitative = bodyText.match(/\b(\d+x faster|\d+% (?:better|worse|faster|slower)|outperforms|benchmarks? show)\b/gi);
  if (quantitative && quantitative.length >= 2) { score += 20; factors.push("量化推理"); }

  score = Math.min(score, 100);

  return cr("deepseek-reasoning", "结构化推理 (DeepSeek)", "DeepSeek",
    score >= 40 ? "pass" : score >= 15 ? "warning" : "fail",
    "notice", score,
    factors.length ? `推理结构: ${factors.join(", ")}.` : "缺乏结构化推理内容。",
    score < 40 ? "添加步骤推理、利弊分析、量化对比。DeepSeek-R1 以深度推理见长，偏好结构化的分析型内容。" : undefined);
}
