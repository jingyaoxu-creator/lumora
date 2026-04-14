import type { CheerioAPI } from "cheerio";
import type { CheckResult, PageContext } from "./types";

/**
 * Professional GEO (Generative Engine Optimization) audit engine
 * 35 checks across 6 categories:
 *   Structure, AI Readability, Authority, AI Access,
 *   AI Snippet Optimization, AI Citation Readiness
 */
export function runGEOChecks(ctx: PageContext): CheckResult[] {
  const { $, url, html, headers } = ctx;
  return [
    // ─── Structure (4) ───
    checkContentStructure($),
    checkSemanticHtml($),
    checkContentDepth($),
    checkTableOfContents($),

    // ─── AI Readability (5) ───
    checkFAQPresence($),
    checkConversationalReadiness($),
    checkDefinitionPatterns($),
    checkReadabilityScore($),
    checkContentOrganization($),

    // ─── Authority (5) ───
    checkEntityCoverage($),
    checkCitationSignals($),
    checkAuthorEEAT($),
    checkContentFreshness($),
    checkSourceAttribution($),

    // ─── AI Access (5) ───
    checkAIBotAccess($, url, headers),
    checkLLMsTxt($, html),
    checkLastModifiedHeader(headers),
    checkContentLengthForAI($),
    checkSitemapReference($, html),

    // ─── AI Snippet Optimization (8) ───
    checkFeaturedSnippetFormat($),
    checkDirectAnswerPresence($),
    checkListOptimization($),
    checkComparisonTables($),
    checkHowToFormat($),
    checkNumberedSteps($),
    checkSummaryPresence($),
    checkAnswerBoxReadiness($),

    // ─── AI Citation Readiness (8) ───
    checkSchemaCompleteness($),
    checkUniqueDataPoints($),
    checkExpertQuotes($),
    checkFactualDensity($),
    checkSourceDiversity($),
    checkMultimodalContent($),
    checkTopicClusterSignals($),
    checkNaturalLanguageTargeting($),
  ];
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function getBodyText($: CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, nav, footer, header").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

function cr(
  id: string, name: string, category: string,
  status: CheckResult["status"], severity: CheckResult["severity"],
  score: number, details: string, suggestion?: string
): CheckResult {
  return { id, name, category, status, severity, score, details, suggestion };
}

// ═══════════════════════════════════════════════════════════════
//  STRUCTURE
// ═══════════════════════════════════════════════════════════════

function checkContentStructure($: CheerioAPI): CheckResult {
  const headings = $("h1, h2, h3, h4, h5, h6").length;
  const paragraphs = $("p").length;
  const lists = $("ul, ol").length;
  const tables = $("table").length;
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  let score = 0;
  const factors: string[] = [];

  // Headings: AI models use them as section anchors
  if (headings >= 5) { score += 20; factors.push(`${headings} headings (excellent structure)`); }
  else if (headings >= 3) { score += 15; factors.push(`${headings} headings`); }
  else if (headings >= 1) { score += 8; factors.push(`only ${headings} heading(s)`); }
  else factors.push("no headings");

  // Paragraphs: natural content flow
  if (paragraphs >= 8) { score += 20; factors.push(`${paragraphs} paragraphs`); }
  else if (paragraphs >= 4) { score += 12; factors.push(`${paragraphs} paragraphs`); }
  else if (paragraphs >= 1) { score += 5; factors.push(`${paragraphs} paragraph(s)`); }

  // Lists: AI models extract these for featured snippets
  if (lists >= 3) { score += 20; factors.push(`${lists} lists`); }
  else if (lists >= 1) { score += 12; factors.push(`${lists} list(s)`); }

  // Tables: structured data presentation
  if (tables >= 1) { score += 10; factors.push(`${tables} table(s)`); }

  // Word count: comprehensive content
  if (wordCount >= 1500) { score += 20; factors.push(`${wordCount.toLocaleString()} words (comprehensive)`); }
  else if (wordCount >= 800) { score += 15; factors.push(`${wordCount} words`); }
  else if (wordCount >= 300) { score += 8; factors.push(`${wordCount} words`); }
  else factors.push(`only ${wordCount} words (thin)`);

  // Content variety bonus
  const hasImages = $("img").length > 0;
  const hasVideo = $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length > 0;
  if (hasImages) { score += 5; factors.push("images"); }
  if (hasVideo) { score += 5; factors.push("video"); }

  score = Math.min(score, 100);

  return cr("geo-structure", "Content Structure", "Structure",
    score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
    score >= 40 ? "notice" : "warning",
    score,
    `Structure: ${factors.join(", ")}.`,
    score < 70 ? "Improve content structure with more headings, paragraphs, lists, and comprehensive depth (800+ words). AI models extract well-organized content." : undefined);
}

function checkSemanticHtml($: CheerioAPI): CheckResult {
  const semanticTags = {
    article: $("article").length,
    section: $("section").length,
    nav: $("nav").length,
    aside: $("aside").length,
    main: $("main").length,
    header: $("header").length,
    footer: $("footer").length,
    figure: $("figure").length,
    figcaption: $("figcaption").length,
    time: $("time").length,
    mark: $("mark").length,
    details: $("details").length,
    summary: $("summary").length,
  };

  const used = Object.entries(semanticTags).filter(([, c]) => c > 0);
  const total = used.reduce((sum, [, c]) => sum + c, 0);

  if (used.length >= 6)
    return cr("geo-semantic", "Semantic HTML", "Structure", "pass", "notice", 100,
      `Excellent semantic markup: ${used.map(([t, c]) => `<${t}>(${c})`).join(", ")}.`);
  if (used.length >= 3)
    return cr("geo-semantic", "Semantic HTML", "Structure", "pass", "notice", 75,
      `${used.length} semantic elements used: ${used.map(([t, c]) => `<${t}>(${c})`).join(", ")}.`,
      "Add more semantic HTML5 tags (<article>, <section>, <aside>, <figure>, <time>) for AI parsing.");
  if (used.length >= 1)
    return cr("geo-semantic", "Low Semantic HTML", "Structure", "warning", "notice", 45,
      `Only ${used.length} semantic element(s): ${used.map(([t]) => `<${t}>`).join(", ")}. AI models depend on semantic structure.`,
      "Wrap content in <article>, sections in <section>, navigation in <nav>. Semantic HTML helps AI understand page structure.");
  return cr("geo-semantic", "No Semantic HTML", "Structure", "fail", "warning", 15,
    "No HTML5 semantic elements found. Page uses only generic <div> elements.",
    "Use <main>, <article>, <section>, <nav>, <aside>, <header>, <footer> to give AI models structural context.");
}

function checkContentDepth($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const words = bodyText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const headings = $("h2, h3").length;
  const paragraphs = $("p").length;

  // Calculate depth metrics
  const wordsPerSection = headings > 0 ? wordCount / (headings + 1) : wordCount;
  const avgParagraphLen = paragraphs > 0 ? wordCount / paragraphs : 0;

  let score = 0;
  const factors: string[] = [];

  // Total depth
  if (wordCount >= 2000) { score += 35; factors.push(`${wordCount.toLocaleString()} words (in-depth)`); }
  else if (wordCount >= 1000) { score += 25; factors.push(`${wordCount.toLocaleString()} words`); }
  else if (wordCount >= 500) { score += 15; factors.push(`${wordCount} words`); }
  else { factors.push(`only ${wordCount} words (shallow)`); }

  // Section density
  if (wordsPerSection >= 100 && wordsPerSection <= 400) {
    score += 25; factors.push("well-sectioned content");
  } else if (headings > 0) {
    score += 10; factors.push(`${Math.round(wordsPerSection)} words/section`);
  }

  // Paragraph quality
  if (avgParagraphLen >= 30 && avgParagraphLen <= 100) {
    score += 20; factors.push("good paragraph length");
  } else if (avgParagraphLen > 100) {
    score += 8; factors.push("paragraphs too long");
  }

  // Multiple subtopics
  if (headings >= 5) { score += 20; factors.push(`${headings} subtopics`); }
  else if (headings >= 3) { score += 12; factors.push(`${headings} subtopics`); }

  score = Math.min(score, 100);

  return cr("geo-depth", "Content Depth & Comprehensiveness", "Structure",
    score >= 65 ? "pass" : score >= 35 ? "warning" : "fail",
    score >= 35 ? "notice" : "warning",
    score,
    `Depth: ${factors.join(", ")}.`,
    score < 65 ? "AI models prefer comprehensive, in-depth content. Aim for 1000+ words with multiple sub-sections, each covering a distinct aspect of the topic." : undefined);
}

function checkTableOfContents($: CheerioAPI): CheckResult {
  // Check for explicit TOC
  const tocElements = $('[class*="toc"], [id*="toc"], [class*="table-of-contents"], [id*="table-of-contents"], nav[aria-label*="content"]');
  const anchorLinks = $('a[href^="#"]').filter((_, el) => {
    const text = $(el).text().trim();
    return text.length > 3 && text.length < 80;
  });

  const h2Count = $("h2").length;

  if (tocElements.length > 0)
    return cr("geo-toc", "Table of Contents", "Structure", "pass", "notice", 100,
      "Table of contents found — AI models use this for content navigation and extraction.");
  if (anchorLinks.length >= 3 && h2Count >= 3)
    return cr("geo-toc", "Table of Contents (Anchor Links)", "Structure", "pass", "notice", 85,
      `${anchorLinks.length} anchor links serve as an implicit table of contents.`);
  if (h2Count >= 5)
    return cr("geo-toc", "No Table of Contents", "Structure", "warning", "notice", 45,
      `Page has ${h2Count} sections but no table of contents. AI models benefit from explicit navigation.`,
      "Add a table of contents with anchor links to each section. AI search engines use it to understand content hierarchy.");
  return cr("geo-toc", "Table of Contents", "Structure", "pass", "notice", 75,
    `${h2Count} sections — page may not need a table of contents.`);
}

// ═══════════════════════════════════════════════════════════════
//  AI READABILITY
// ═══════════════════════════════════════════════════════════════

function checkFAQPresence($: CheerioAPI): CheckResult {
  const faqSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["@type"] === "FAQPage" ||
        (Array.isArray(data["@graph"]) && data["@graph"].some((i: { "@type": string }) => i["@type"] === "FAQPage"));
    } catch { return false; }
  });

  const bodyText = getBodyText($);
  const questions = bodyText.match(/\b(what|how|why|when|where|which|who|can|does|is|are|do|should|will|would)\b[^.?!]{10,}\?/gi);
  const questionCount = questions?.length ?? 0;
  const details$ = $("details");
  const faqSections = $('[class*="faq" i], [id*="faq" i]');
  const dlElements = $("dl"); // Definition lists often used for Q&A

  let score = 0;
  const found: string[] = [];

  if (faqSchema) { score += 35; found.push("FAQPage schema"); }
  if (questionCount >= 5) { score += 25; found.push(`${questionCount} Q&A patterns`); }
  else if (questionCount >= 2) { score += 15; found.push(`${questionCount} questions`); }
  if (details$.length > 0) { score += 15; found.push(`${details$.length} expandable FAQ`); }
  if (faqSections.length > 0) { score += 15; found.push("dedicated FAQ section"); }
  if (dlElements.length > 0) { score += 10; found.push("definition list Q&A"); }

  score = Math.min(score, 100);

  return cr("geo-faq", "FAQ / Q&A Format", "AI Readability",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    found.length ? `FAQ signals: ${found.join(", ")}.` : "No FAQ or Q&A patterns found.",
    score < 55 ? "Add FAQ content with clear questions and answers. Use FAQPage schema. AI search engines heavily favor Q&A formats for featured responses." : undefined);
}

function checkConversationalReadiness($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Direct answer patterns that AI can extract
  const directAnswers = bodyText.match(/\b(is|are|was|were|means|refers to|defined as|the answer is|in short|simply put|to summarize|in summary|the key point is|essentially)\b/gi);
  const sentences = bodyText.match(/[A-Z][^.!?]{15,}[.!?]/g) ?? [];
  const avgLen = sentences.length > 0
    ? sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length : 0;

  // Check for clear, extractable statements
  const bulletPoints = $("li").length;
  const numberedSteps = bodyText.match(/\b(step\s*\d|first,|second,|third,|finally,|next,|then,)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (directAnswers && directAnswers.length >= 8) { score += 30; factors.push(`${directAnswers.length} direct answer patterns`); }
  else if (directAnswers && directAnswers.length >= 3) { score += 18; factors.push(`${directAnswers.length} answer patterns`); }

  if (avgLen >= 12 && avgLen <= 22) { score += 25; factors.push("optimal sentence clarity"); }
  else if (avgLen > 0 && avgLen < 12) { score += 12; factors.push("very short sentences"); }
  else if (avgLen > 22 && avgLen <= 35) { score += 12; factors.push("slightly complex sentences"); }
  else if (avgLen > 35) { score += 5; factors.push("overly complex sentences"); }

  if (bulletPoints >= 10) { score += 20; factors.push(`${bulletPoints} list items`); }
  else if (bulletPoints >= 4) { score += 12; factors.push(`${bulletPoints} list items`); }

  if (numberedSteps && numberedSteps.length >= 3) { score += 15; factors.push("step-by-step format"); }

  const summarySection = $('h2:contains("Summary"), h2:contains("Conclusion"), h2:contains("Key Takeaway"), h3:contains("TL;DR"), [class*="summary" i], [class*="tldr" i]');
  if (summarySection.length > 0) { score += 10; factors.push("summary section"); }

  score = Math.min(score, 100);

  return cr("geo-conversational", "Conversational Readiness", "AI Readability",
    score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score >= 30 ? "notice" : "warning",
    score,
    factors.length ? `AI readability: ${factors.join(", ")}.` : "Content not optimized for AI extraction.",
    score < 60 ? "Write clear, direct answers. Use bullet points, numbered steps, and summary sections. AI assistants extract concise, definitive statements." : undefined);
}

function checkDefinitionPatterns($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Definitive/explanatory patterns AI models love
  const definitions = bodyText.match(/\b(is defined as|refers to|is a type of|is known as|consists of|is the process of|can be described as|means that)\b/gi);
  const comparisons = bodyText.match(/\b(compared to|versus|vs\.|unlike|similar to|differs from|as opposed to|on the other hand)\b/gi);
  const examples = bodyText.match(/\b(for example|for instance|such as|e\.g\.|i\.e\.|specifically|in particular|including)\b/gi);
  const causeEffect = bodyText.match(/\b(because|therefore|as a result|consequently|thus|hence|leads to|causes|results in)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (definitions && definitions.length >= 3) { score += 25; factors.push(`${definitions.length} definitions`); }
  else if (definitions && definitions.length >= 1) { score += 12; factors.push(`${definitions.length} definition(s)`); }

  if (comparisons && comparisons.length >= 2) { score += 20; factors.push(`${comparisons.length} comparisons`); }
  else if (comparisons && comparisons.length >= 1) { score += 10; factors.push("1 comparison"); }

  if (examples && examples.length >= 3) { score += 25; factors.push(`${examples.length} examples`); }
  else if (examples && examples.length >= 1) { score += 12; factors.push(`${examples.length} example(s)`); }

  if (causeEffect && causeEffect.length >= 2) { score += 20; factors.push(`${causeEffect.length} cause-effect`); }
  else if (causeEffect && causeEffect.length >= 1) { score += 10; factors.push("1 cause-effect"); }

  // Bonus for definition lists
  if ($("dl dt").length > 0) { score += 10; factors.push("definition list"); }

  score = Math.min(score, 100);

  return cr("geo-definitions", "Definition & Explanation Patterns", "AI Readability",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Explanation patterns: ${factors.join(", ")}.` : "No definition or explanation patterns found.",
    score < 55 ? "Add clear definitions, examples, and comparisons. AI models extract these patterns to build accurate responses." : undefined);
}

function checkReadabilityScore($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const sentences = bodyText.match(/[^.!?]+[.!?]/g) ?? [];
  const words = bodyText.split(/\s+/).filter(Boolean);

  if (words.length < 50)
    return cr("geo-readability", "Readability", "AI Readability", "warning", "notice", 50,
      "Too little text to assess readability.");

  // Simplified Flesch reading ease approximation
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : words.length;
  const syllableCount = words.reduce((sum, w) => sum + estimateSyllables(w), 0);
  const avgSyllablesPerWord = syllableCount / words.length;
  const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  const clamped = Math.max(0, Math.min(100, Math.round(fleschScore)));

  // For web content aimed at AI, 50-70 is ideal (8th-10th grade level)
  let label: string;
  let status: CheckResult["status"];
  let score: number;

  if (clamped >= 60 && clamped <= 80) {
    label = "Easy to read"; status = "pass"; score = 100;
  } else if (clamped >= 50 && clamped < 60) {
    label = "Fairly easy"; status = "pass"; score = 85;
  } else if (clamped >= 30 && clamped < 50) {
    label = "Difficult"; status = "warning"; score = 55;
  } else if (clamped > 80) {
    label = "Very easy"; status = "pass"; score = 80;
  } else {
    label = "Very difficult"; status = "warning"; score = 35;
  }

  return cr("geo-readability", "Readability Score", "AI Readability", status, "notice", score,
    `Flesch readability: ${clamped}/100 (${label}). Avg ${avgWordsPerSentence.toFixed(1)} words/sentence, ${avgSyllablesPerWord.toFixed(1)} syllables/word.`,
    score < 70 ? "Simplify writing: shorter sentences, simpler words. AI models produce better responses from clear, accessible content. Target Flesch score 60-80." : undefined);
}

function checkContentOrganization($: CheerioAPI): CheckResult {
  const h2s = $("h2");
  const h3s = $("h3");
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Check if headings divide content logically
  let score = 0;
  const factors: string[] = [];

  // Section count relative to content
  const sectionCount = h2s.length;
  if (wordCount > 500) {
    const idealSections = Math.floor(wordCount / 300);
    if (sectionCount >= idealSections * 0.6) { score += 30; factors.push(`${sectionCount} major sections`); }
    else if (sectionCount >= 2) { score += 15; factors.push(`only ${sectionCount} sections for ${wordCount} words`); }
    else { factors.push("poorly sectioned"); }
  } else {
    score += 20; factors.push("short content");
  }

  // Sub-sections within sections
  if (h3s.length >= 3) { score += 20; factors.push(`${h3s.length} sub-sections`); }
  else if (h3s.length >= 1) { score += 10; factors.push(`${h3s.length} sub-section(s)`); }

  // Introduction detection
  const firstP = $("p").first().text().trim();
  if (firstP.length > 50) { score += 15; factors.push("clear introduction"); }

  // Conclusion detection
  const lastHeadings = $("h2, h3").toArray().slice(-2);
  const hasConclusion = lastHeadings.some(h =>
    /conclusion|summary|final|takeaway|wrap/i.test($(h).text()));
  if (hasConclusion) { score += 15; factors.push("conclusion section"); }

  // Logical section ordering (headings should be distinct)
  const headingTexts = h2s.toArray().map(h => $(h).text().toLowerCase().trim());
  const uniqueHeadings = new Set(headingTexts);
  if (headingTexts.length > 0 && uniqueHeadings.size === headingTexts.length) {
    score += 20; factors.push("unique section topics");
  } else if (headingTexts.length > uniqueHeadings.size) {
    factors.push("duplicate section headings");
  }

  score = Math.min(score, 100);

  return cr("geo-organization", "Content Organization", "AI Readability",
    score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    "notice", score,
    `Organization: ${factors.join(", ")}.`,
    score < 60 ? "Organize content with clear sections (H2), sub-sections (H3), an introduction, and a conclusion. AI models extract structured content more accurately." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  AUTHORITY
// ═══════════════════════════════════════════════════════════════

function checkEntityCoverage($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Named entities (proper nouns, brands, names)
  const properNouns = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) ?? [];
  const stopWords = new Set(["The", "This", "That", "These", "Those", "There", "Here", "What", "How", "Why", "When", "Where", "Which", "Who", "They", "Some", "Many", "Most", "Each", "Every", "Other", "About", "With", "From", "Into", "Through", "After", "Before", "Between"]);
  const uniqueEntities = [...new Set(properNouns)].filter(e => !stopWords.has(e) && e.length > 2);

  // Definitional statements
  const definitions = bodyText.match(/\b(is defined as|refers to|means|is a type of|is known as|consists of|is the|are the)\b/gi);

  // Specific data points
  const numbers = bodyText.match(/\b\d{1,3}(,\d{3})*(\.\d+)?(%|\s*percent|\s*million|\s*billion)?\b/g);
  const specificData = (numbers?.length ?? 0);

  let score = 0;
  const factors: string[] = [];

  if (uniqueEntities.length >= 15) { score += 30; factors.push(`${uniqueEntities.length} unique entities`); }
  else if (uniqueEntities.length >= 8) { score += 20; factors.push(`${uniqueEntities.length} entities`); }
  else if (uniqueEntities.length >= 3) { score += 10; factors.push(`${uniqueEntities.length} entities`); }

  if (definitions && definitions.length >= 3) { score += 25; factors.push(`${definitions.length} definitions`); }
  else if (definitions && definitions.length >= 1) { score += 12; factors.push(`${definitions.length} definition(s)`); }

  if (specificData >= 10) { score += 20; factors.push(`${specificData} data points`); }
  else if (specificData >= 3) { score += 10; factors.push(`${specificData} data points`); }

  // Topic depth relative to content length
  if (wordCount >= 500 && uniqueEntities.length >= 5) { score += 15; factors.push("good entity density"); }
  if ($("h1, h2, h3").length >= 3) { score += 10; factors.push("topical structure"); }

  score = Math.min(score, 100);

  return cr("geo-entity", "Entity & Topic Coverage", "Authority",
    score >= 55 ? "pass" : score >= 30 ? "warning" : "fail",
    score >= 30 ? "notice" : "warning",
    score,
    factors.length ? `Entity analysis: ${factors.join(", ")}.` : "Weak entity coverage.",
    score < 55 ? "Include specific names, definitions, data points, and detailed topic coverage. AI models extract entities for knowledge graphs and citations." : undefined);
}

function checkCitationSignals($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  const stats = bodyText.match(/\b\d+(\.\d+)?(%|\s*percent|\s*million|\s*billion|\s*trillion)\b/gi);
  const years = bodyText.match(/\b(20[12]\d|19\d\d)\b/g);
  const citations = bodyText.match(/\b(according to|research shows|studies show|data from|report by|survey by|published in|found that|concluded that|analysis by|data indicates)\b/gi);
  const externalLinks = $('a[href^="http"]').length;
  const quotes = $("blockquote").length + ($("q").length);

  let score = 0;
  const factors: string[] = [];

  if (stats && stats.length >= 5) { score += 25; factors.push(`${stats.length} statistics`); }
  else if (stats && stats.length >= 2) { score += 15; factors.push(`${stats.length} statistics`); }

  if (citations && citations.length >= 3) { score += 25; factors.push(`${citations.length} citation phrases`); }
  else if (citations && citations.length >= 1) { score += 12; factors.push(`${citations.length} citation(s)`); }

  if (years && years.length >= 3) { score += 15; factors.push("temporal references"); }
  else if (years && years.length >= 1) { score += 8; factors.push("year reference(s)"); }

  if (externalLinks >= 5) { score += 20; factors.push(`${externalLinks} external sources`); }
  else if (externalLinks >= 2) { score += 12; factors.push(`${externalLinks} external source(s)`); }

  if (quotes >= 1) { score += 10; factors.push(`${quotes} quote(s)`); }

  score = Math.min(score, 100);

  return cr("geo-citation", "Citation-Worthy Content", "Authority",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `Citation signals: ${factors.join(", ")}.` : "No citation-worthy signals found.",
    score < 55 ? "Add specific statistics, source references, quotes, and year-dated information. AI models prefer content they can cite with confidence." : undefined);
}

function checkAuthorEEAT($: CheerioAPI): CheckResult {
  const authorMeta = $('meta[name="author"]').attr("content");
  const authorSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["author"] || data["@type"] === "Person" ||
        (data["@graph"] && data["@graph"].some((i: { "@type"?: string }) => i["@type"] === "Person"));
    } catch { return false; }
  });
  const aboutLinks = $('a[href*="about"], a[href*="team"], a[href*="author"]');
  const authorBio = $('[class*="author" i], [class*="bio" i], [class*="byline" i]');
  const bodyText = getBodyText($);
  const expertise = bodyText.match(/\b(expert|specialist|certified|years of experience|professional|qualified|PhD|MD|MBA|CPA|JD|founder|CEO|CTO|professor|researcher|analyst)\b/gi);
  const orgSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["@type"] === "Organization" || data["publisher"];
    } catch { return false; }
  });

  let score = 0;
  const factors: string[] = [];

  if (authorMeta) { score += 20; factors.push(`author: ${authorMeta}`); }
  if (authorSchema) { score += 20; factors.push("author schema"); }
  if (authorBio.length > 0) { score += 15; factors.push("author bio section"); }
  if (aboutLinks.length > 0) { score += 10; factors.push("about/team links"); }
  if (orgSchema) { score += 10; factors.push("organization schema"); }
  if (expertise && expertise.length >= 3) { score += 20; factors.push(`${expertise.length} expertise signals`); }
  else if (expertise && expertise.length >= 1) { score += 10; factors.push(`${expertise.length} expertise signal(s)`); }

  // Published date (freshness also matters for E-E-A-T)
  const hasDate = $('meta[property="article:published_time"]').length > 0 || $("time[datetime]").length > 0;
  if (hasDate) { score += 5; factors.push("publication date"); }

  score = Math.min(score, 100);

  return cr("geo-eeat", "Author & E-E-A-T Signals", "Authority",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `E-E-A-T signals: ${factors.join(", ")}.` : "No author or expertise signals found.",
    score < 55 ? "Add author name, bio, credentials, and organization info. AI search engines prioritize content with clear authorship, expertise, and trustworthiness." : undefined);
}

function checkContentFreshness($: CheerioAPI): CheckResult {
  const pubDate = $('meta[property="article:published_time"]').attr("content") ??
    $('meta[name="date"]').attr("content") ?? $('meta[name="DC.date"]').attr("content") ?? "";
  const modDate = $('meta[property="article:modified_time"]').attr("content") ??
    $('meta[name="last-modified"]').attr("content") ?? "";
  const timeElements = $("time[datetime]");
  const dateSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["datePublished"] || data["dateModified"];
    } catch { return false; }
  });

  let score = 0;
  const factors: string[] = [];

  if (modDate) {
    score += 30; factors.push(`modified: ${modDate.substring(0, 10)}`);
    // Check if modification is recent (within 6 months)
    try {
      const modTime = new Date(modDate).getTime();
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
      if (modTime > sixMonthsAgo) { score += 15; factors.push("recently updated"); }
    } catch { /* ignore */ }
  }
  if (pubDate) { score += 20; factors.push(`published: ${pubDate.substring(0, 10)}`); }
  if (timeElements.length > 0) { score += 15; factors.push(`${timeElements.length} date element(s)`); }
  if (dateSchema) { score += 20; factors.push("date schema markup"); }

  score = Math.min(score, 100);

  return cr("geo-freshness", "Content Freshness", "Authority",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `Freshness signals: ${factors.join(", ")}.` : "No freshness/date signals found.",
    score < 55 ? "Add publication and modification dates. AI models trust fresh, dated content. Content older than 6 months without updates may be deprioritized." : undefined);
}

function checkSourceAttribution($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const blockquotes = $("blockquote").length;
  const cites = $("cite").length;
  const refs = bodyText.match(/\b(source|reference|cited|bibliography|works cited|further reading|references)\b/gi);
  const footnotes = $('[class*="footnote" i], [id*="footnote" i], [class*="reference" i], sup a[href^="#"]');
  const dataAttribution = bodyText.match(/\b(according to|source:|via |credit:|photo by|image by|data from)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (blockquotes > 0) { score += 20; factors.push(`${blockquotes} blockquote(s)`); }
  if (cites > 0) { score += 20; factors.push(`${cites} <cite> element(s)`); }
  if (refs && refs.length >= 2) { score += 20; factors.push("reference mentions"); }
  if (footnotes.length > 0) { score += 20; factors.push(`${footnotes.length} footnote(s)`); }
  if (dataAttribution && dataAttribution.length >= 2) { score += 20; factors.push(`${dataAttribution.length} attributions`); }

  score = Math.min(score, 100);

  return cr("geo-sources", "Source Attribution", "Authority",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Source signals: ${factors.join(", ")}.` : "No source attribution found.",
    score < 45 ? "Add proper source attribution: blockquotes, <cite> elements, footnotes, and 'according to' references. AI models prioritize well-sourced content." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  AI ACCESS
// ═══════════════════════════════════════════════════════════════

function checkAIBotAccess($: CheerioAPI, url: string, headers: Record<string, string>): CheckResult {
  // Check meta robots for AI-specific blocks
  const robots = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";

  // Check for AI-specific meta tags
  const noai = $('meta[name="robots"][content*="noai"]').length > 0 ||
    $('meta[name="robots"][content*="noimageai"]').length > 0;

  // Check X-Robots-Tag header
  const xRobots = headers["x-robots-tag"]?.toLowerCase() ?? "";
  const headerBlocksAI = xRobots.includes("noai") || xRobots.includes("noimageai");

  // Known AI bot names to check
  const aiBotsBlocked: string[] = [];
  const botMetas = ["GPTBot", "ChatGPT-User", "Google-Extended", "ClaudeBot", "PerplexityBot", "CCBot", "anthropic-ai"];
  botMetas.forEach(bot => {
    const meta = $(`meta[name="${bot}"]`).attr("content")?.toLowerCase() ?? "";
    if (meta.includes("noindex") || meta.includes("none")) aiBotsBlocked.push(bot);
  });

  if (noai || headerBlocksAI || aiBotsBlocked.length >= 3)
    return cr("geo-ai-access", "AI Bot Access Restricted", "AI Access", "warning", "warning", 30,
      `AI crawlers may be blocked: ${[noai ? "noai meta" : "", headerBlocksAI ? "X-Robots-Tag noai" : "", aiBotsBlocked.length > 0 ? `blocked bots: ${aiBotsBlocked.join(", ")}` : ""].filter(Boolean).join("; ")}.`,
      "If you want AI search engines to index your content, remove AI-specific blocks. Check robots.txt for GPTBot, ClaudeBot, and similar user agents.");

  if (aiBotsBlocked.length > 0)
    return cr("geo-ai-access", "Some AI Bots Blocked", "AI Access", "warning", "notice", 60,
      `${aiBotsBlocked.length} AI bot(s) specifically blocked: ${aiBotsBlocked.join(", ")}.`,
      "Review which AI crawlers you're blocking. Blocking too many reduces your visibility in AI search.");

  if (robots.includes("noindex"))
    return cr("geo-ai-access", "Page Not Indexed", "AI Access", "fail", "warning", 10,
      "Page has noindex — no search engine (traditional or AI) can index it.",
      "Remove noindex if you want this page to appear in any search results.");

  return cr("geo-ai-access", "AI Bot Access", "AI Access", "pass", "notice", 100,
    "No AI-specific blocks detected. AI search crawlers can access this page.");
}

// ═══════════════════════════════════════════════════════════════
//  AI ACCESS (continued)
// ═══════════════════════════════════════════════════════════════

function checkLLMsTxt($: CheerioAPI, html: string): CheckResult {
  // Check if the page references an llms.txt file (emerging standard for AI instructions)
  const hasLlmsTxtLink = $('a[href*="llms.txt"], link[href*="llms.txt"]').length > 0;
  const htmlMentions = /llms\.txt/i.test(html);
  const hasLlmsFullLink = $('a[href*="llms-full.txt"]').length > 0;
  const hasAiTxtLink = $('a[href*="ai.txt"], link[href*="ai.txt"]').length > 0;

  let score = 0;
  const factors: string[] = [];

  if (hasLlmsTxtLink || htmlMentions) { score += 60; factors.push("llms.txt referenced"); }
  if (hasLlmsFullLink) { score += 20; factors.push("llms-full.txt available"); }
  if (hasAiTxtLink) { score += 20; factors.push("ai.txt referenced"); }

  if (score === 0) {
    // Check for any AI-specific instruction files
    const wellKnown = $('a[href*=".well-known"]').length > 0;
    if (wellKnown) { score = 30; factors.push(".well-known directory linked"); }
  }

  score = Math.min(score, 100);

  if (score === 0)
    return cr("geo-llms-txt", "LLMs.txt File", "AI Access", "warning", "notice", 35,
      "No llms.txt file referenced. This emerging standard helps AI models understand your site.",
      "Create an llms.txt file at your site root describing your content for LLMs. See llmstxt.org for the specification.");

  return cr("geo-llms-txt", "LLMs.txt File", "AI Access",
    score >= 60 ? "pass" : "warning", "notice", score,
    `AI instruction signals: ${factors.join(", ")}.`);
}

function checkLastModifiedHeader(headers: Record<string, string>): CheckResult {
  const lastModified = headers["last-modified"] ?? headers["Last-Modified"] ?? "";
  const etag = headers["etag"] ?? headers["ETag"] ?? "";
  const cacheControl = headers["cache-control"] ?? headers["Cache-Control"] ?? "";
  const age = headers["age"] ?? "";

  let score = 0;
  const factors: string[] = [];

  if (lastModified) {
    score += 40;
    factors.push(`Last-Modified: ${lastModified}`);
    try {
      const modTime = new Date(lastModified).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (modTime > thirtyDaysAgo) { score += 20; factors.push("recently modified"); }
    } catch { /* ignore */ }
  }
  if (etag) { score += 20; factors.push("ETag present"); }
  if (cacheControl && !cacheControl.includes("no-cache")) { score += 10; factors.push("cache-control set"); }
  if (age) { score += 10; factors.push(`age: ${age}s`); }

  score = Math.min(score, 100);

  if (score === 0)
    return cr("geo-last-modified", "Last-Modified Header", "AI Access", "warning", "notice", 30,
      "No Last-Modified or ETag headers. AI crawlers use these to determine content freshness.",
      "Configure your server to send Last-Modified and ETag headers. This helps AI crawlers prioritize fresh content.");

  return cr("geo-last-modified", "Last-Modified Header", "AI Access",
    score >= 50 ? "pass" : "warning", "notice", score,
    `Freshness headers: ${factors.join(", ")}.`);
}

function checkContentLengthForAI($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // AI models have context windows; extremely long pages get truncated
  // Ideal range: 500-5000 words for thorough but digestible content
  if (wordCount >= 500 && wordCount <= 5000)
    return cr("geo-content-length-ai", "Content Length for AI", "AI Access", "pass", "notice", 100,
      `${wordCount.toLocaleString()} words — optimal length for AI processing and extraction.`);

  if (wordCount > 5000 && wordCount <= 10000)
    return cr("geo-content-length-ai", "Content Length for AI", "AI Access", "pass", "notice", 75,
      `${wordCount.toLocaleString()} words — long but manageable. AI models may truncate beyond key sections.`,
      "Consider adding a summary section at the top. Very long pages may be partially processed by AI models.");

  if (wordCount > 10000)
    return cr("geo-content-length-ai", "Content Too Long for AI", "AI Access", "warning", "notice", 45,
      `${wordCount.toLocaleString()} words — very long content that AI models may truncate or only partially process.`,
      "Break into multiple focused pages or add prominent summaries. AI models have context limits and may miss content at the end.");

  if (wordCount >= 200)
    return cr("geo-content-length-ai", "Content Length for AI", "AI Access", "warning", "notice", 55,
      `Only ${wordCount} words — thin content that may not provide enough depth for AI citations.`,
      "Expand content to at least 500 words with detailed explanations. AI models prefer comprehensive pages for sourcing answers.");

  return cr("geo-content-length-ai", "Content Too Short for AI", "AI Access", "fail", "warning", 20,
    `Only ${wordCount} words — insufficient content for AI extraction and citation.`,
    "Pages with fewer than 200 words are unlikely to be cited by AI. Add substantive, informative content.");
}

function checkSitemapReference($: CheerioAPI, html: string): CheckResult {
  // Check for sitemap links in HTML
  const sitemapLink = $('a[href*="sitemap"], link[rel="sitemap"], a[href*="sitemap.xml"]').length > 0;
  const htmlMention = /sitemap\.xml/i.test(html);
  const rssLink = $('link[type="application/rss+xml"], link[type="application/atom+xml"]').length > 0;

  let score = 0;
  const factors: string[] = [];

  if (sitemapLink || htmlMention) { score += 50; factors.push("sitemap reference found"); }
  if (rssLink) { score += 30; factors.push("RSS/Atom feed available"); }

  // Check for canonical URL (helps AI understand page identity)
  const canonical = $('link[rel="canonical"]').attr("href");
  if (canonical) { score += 20; factors.push("canonical URL set"); }

  score = Math.min(score, 100);

  if (score === 0)
    return cr("geo-sitemap-ref", "Sitemap & Feed Reference", "AI Access", "warning", "notice", 40,
      "No sitemap or RSS feed references found. These help AI crawlers discover and index all your content.",
      "Add a sitemap.xml link and RSS/Atom feed. AI crawlers use these to efficiently discover and re-crawl content.");

  return cr("geo-sitemap-ref", "Sitemap & Feed Reference", "AI Access",
    score >= 50 ? "pass" : "warning", "notice", score,
    `Discovery signals: ${factors.join(", ")}.`);
}

// ═══════════════════════════════════════════════════════════════
//  AI SNIPPET OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

function checkFeaturedSnippetFormat($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Paragraph snippets: concise definitions right after headings
  let snippetReadyCount = 0;
  $("h2, h3").each((_, heading) => {
    const nextP = $(heading).next("p");
    if (nextP.length) {
      const text = nextP.text().trim();
      const wordCount = text.split(/\s+/).length;
      // Google featured snippets are typically 40-60 words
      if (wordCount >= 20 && wordCount <= 80) snippetReadyCount++;
    }
  });

  // "What is" patterns — the most common featured snippet trigger
  const whatIsPatterns = bodyText.match(/\b(what is|what are|what does|how does|how to|why is|why do|when to)\b/gi);

  // Bold/strong definitions
  const boldDefs = $("strong, b").filter((_, el) => {
    const text = $(el).text().trim();
    return text.split(/\s+/).length >= 2 && text.split(/\s+/).length <= 8;
  }).length;

  let score = 0;
  const factors: string[] = [];

  if (snippetReadyCount >= 5) { score += 40; factors.push(`${snippetReadyCount} snippet-ready paragraphs`); }
  else if (snippetReadyCount >= 2) { score += 25; factors.push(`${snippetReadyCount} snippet-ready paragraphs`); }
  else if (snippetReadyCount >= 1) { score += 12; factors.push("1 snippet-ready paragraph"); }

  if (whatIsPatterns && whatIsPatterns.length >= 3) { score += 30; factors.push(`${whatIsPatterns.length} question-answer patterns`); }
  else if (whatIsPatterns && whatIsPatterns.length >= 1) { score += 15; factors.push(`${whatIsPatterns.length} question pattern(s)`); }

  if (boldDefs >= 5) { score += 20; factors.push(`${boldDefs} emphasized terms`); }
  else if (boldDefs >= 2) { score += 10; factors.push(`${boldDefs} emphasized terms`); }

  score = Math.min(score, 100);

  return cr("geo-snippet-format", "Featured Snippet Format", "AI Snippet Optimization",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `Snippet format: ${factors.join(", ")}.` : "Content not optimized for featured snippets.",
    score < 55 ? "Place concise 40-60 word definitions directly after H2/H3 headings. Use 'What is X' patterns. Bold key terms. AI models extract these for direct answers." : undefined);
}

function checkDirectAnswerPresence($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Check for direct, definitive answers in the first 500 characters
  const firstContent = bodyText.substring(0, 500);
  const directPatterns = firstContent.match(/\b(is|are|means|refers to|defined as|the answer|in short|simply put|can be described as)\b/gi);

  // Check first paragraph specifically
  const firstP = $("main p, article p, .content p, body p").first().text().trim();
  const firstPWords = firstP.split(/\s+/).length;
  const hasDirectFirstP = firstPWords >= 15 && firstPWords <= 80;

  // Check for TL;DR or quick answer section
  const quickAnswer = $('[class*="tldr" i], [class*="quick-answer" i], [class*="key-takeaway" i], [class*="highlight" i], [class*="callout" i]');

  let score = 0;
  const factors: string[] = [];

  if (directPatterns && directPatterns.length >= 2) { score += 35; factors.push("direct answer in opening"); }
  else if (directPatterns && directPatterns.length >= 1) { score += 18; factors.push("answer pattern in opening"); }

  if (hasDirectFirstP) { score += 30; factors.push(`concise first paragraph (${firstPWords} words)`); }
  else if (firstPWords > 80) { score += 10; factors.push("long first paragraph"); }

  if (quickAnswer.length > 0) { score += 25; factors.push("quick answer/callout section"); }

  // Meta description as a direct answer
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  if (metaDesc.length >= 50 && metaDesc.length <= 160) { score += 10; factors.push("descriptive meta summary"); }

  score = Math.min(score, 100);

  return cr("geo-direct-answer", "Direct Answer Presence", "AI Snippet Optimization",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    score >= 25 ? "notice" : "warning",
    score,
    factors.length ? `Direct answers: ${factors.join(", ")}.` : "No direct answer found in opening content.",
    score < 55 ? "Start with a clear, concise answer in the first paragraph (15-80 words). AI models extract the first definitive statement as a direct answer." : undefined);
}

function checkListOptimization($: CheerioAPI): CheckResult {
  const uls = $("ul");
  const ols = $("ol");
  const totalLists = uls.length + ols.length;

  // Quality metrics for lists
  let wellFormedLists = 0;
  let totalItems = 0;

  $("ul, ol").each((_, list) => {
    const items = $(list).children("li");
    totalItems += items.length;
    // Well-formed: 3-10 items, each with meaningful text
    if (items.length >= 3 && items.length <= 15) {
      const avgItemLen = items.toArray().reduce((sum, li) =>
        sum + $(li).text().trim().split(/\s+/).length, 0) / items.length;
      if (avgItemLen >= 3 && avgItemLen <= 30) wellFormedLists++;
    }
  });

  // Lists right after headings (AI-extractable pattern)
  let headingLists = 0;
  $("h2, h3").each((_, h) => {
    const next = $(h).next();
    if (next.is("ul, ol")) headingLists++;
  });

  let score = 0;
  const factors: string[] = [];

  if (wellFormedLists >= 3) { score += 40; factors.push(`${wellFormedLists} well-structured lists`); }
  else if (wellFormedLists >= 1) { score += 25; factors.push(`${wellFormedLists} well-structured list(s)`); }

  if (totalItems >= 15) { score += 20; factors.push(`${totalItems} total items`); }
  else if (totalItems >= 5) { score += 10; factors.push(`${totalItems} items`); }

  if (headingLists >= 2) { score += 25; factors.push(`${headingLists} lists after headings`); }
  else if (headingLists >= 1) { score += 15; factors.push("list after heading"); }

  if (ols.length > 0) { score += 15; factors.push(`${ols.length} ordered list(s)`); }

  score = Math.min(score, 100);

  return cr("geo-list-opt", "List Optimization", "AI Snippet Optimization",
    score >= 55 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Lists: ${factors.join(", ")}.` : "No well-structured lists found.",
    score < 55 ? "Add bulleted and numbered lists with 3-10 items each, placed after relevant headings. AI models frequently extract list content for structured responses." : undefined);
}

function checkComparisonTables($: CheerioAPI): CheckResult {
  const tables = $("table");
  let comparisonTables = 0;
  let wellFormedTables = 0;

  tables.each((_, table) => {
    const ths = $(table).find("th");
    const trs = $(table).find("tr");
    const tds = $(table).find("td");

    // Has headers and rows — well-formed
    if (ths.length >= 2 && trs.length >= 3) wellFormedTables++;

    // Comparison indicators: "vs", feature names in first column, check/cross marks
    const tableText = $(table).text().toLowerCase();
    if (/vs\.?|versus|compared|comparison|pro|con|advantage|disadvantage|✓|✗|✔|✘|yes|no/i.test(tableText)) {
      comparisonTables++;
    }
    // Tables with first-column headers (feature comparison layout)
    if (tds.length > 0 && ths.length >= 2) {
      const firstColCells = trs.toArray().slice(1).map(tr => $(tr).find("td").first().text().trim());
      if (firstColCells.filter(c => c.length > 0).length >= 3) comparisonTables++;
    }
  });

  // De-duplicate
  comparisonTables = Math.min(comparisonTables, tables.length);

  let score = 0;
  const factors: string[] = [];

  if (comparisonTables >= 2) { score += 50; factors.push(`${comparisonTables} comparison tables`); }
  else if (comparisonTables >= 1) { score += 35; factors.push("1 comparison table"); }

  if (wellFormedTables >= 2) { score += 30; factors.push(`${wellFormedTables} well-formed tables`); }
  else if (wellFormedTables >= 1) { score += 20; factors.push("1 well-formed table"); }

  if (tables.length > 0 && comparisonTables === 0) {
    score += 15; factors.push(`${tables.length} table(s) present`);
  }

  score = Math.min(score, 100);

  if (tables.length === 0)
    return cr("geo-comparison-tables", "Comparison Tables", "AI Snippet Optimization", "warning", "notice", 30,
      "No tables found. Comparison tables are highly extractable by AI for side-by-side answers.",
      "Add comparison tables for features, options, or alternatives. AI models love structured tabular data.");

  return cr("geo-comparison-tables", "Comparison Tables", "AI Snippet Optimization",
    score >= 50 ? "pass" : "warning", "notice", score,
    `Tables: ${factors.join(", ")}.`,
    score < 50 ? "Add comparison tables with clear headers. Use 'vs' patterns and feature comparison layouts. AI search engines extract tables for structured answers." : undefined);
}

function checkHowToFormat($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // HowTo schema
  const hasHowToSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["@type"] === "HowTo" ||
        (Array.isArray(data["@graph"]) && data["@graph"].some((i: { "@type": string }) => i["@type"] === "HowTo"));
    } catch { return false; }
  });

  // Step patterns in text
  const stepPatterns = bodyText.match(/\b(step\s*\d+|step\s*one|step\s*two|step\s*three)/gi);
  const howToHeadings = $("h2, h3").filter((_, el) =>
    /how to|guide|tutorial|steps|instructions|walkthrough/i.test($(el).text())).length;

  // Ordered lists (procedural content)
  const orderedLists = $("ol").filter((_, ol) => $(ol).children("li").length >= 3).length;

  // Prerequisites / requirements sections
  const prereqs = $("h2, h3, h4").filter((_, el) =>
    /prerequisite|requirement|before you|you.ll need|what you need/i.test($(el).text())).length;

  let score = 0;
  const factors: string[] = [];

  if (hasHowToSchema) { score += 35; factors.push("HowTo schema markup"); }
  if (howToHeadings >= 1) { score += 20; factors.push(`${howToHeadings} how-to heading(s)`); }
  if (stepPatterns && stepPatterns.length >= 3) { score += 20; factors.push(`${stepPatterns.length} step references`); }
  else if (stepPatterns && stepPatterns.length >= 1) { score += 10; factors.push(`${stepPatterns.length} step(s)`); }
  if (orderedLists >= 1) { score += 15; factors.push(`${orderedLists} ordered procedure(s)`); }
  if (prereqs >= 1) { score += 10; factors.push("prerequisites section"); }

  score = Math.min(score, 100);

  return cr("geo-howto", "How-To Format", "AI Snippet Optimization",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `How-to signals: ${factors.join(", ")}.` : "No how-to or tutorial format detected.",
    score < 50 ? "Add step-by-step instructions with numbered steps, HowTo schema, and prerequisite sections. AI models extract procedural content for instructional answers." : undefined);
}

function checkNumberedSteps($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Explicit numbered step patterns
  const numberedPatterns = bodyText.match(/\b(\d+\.\s+[A-Z]|step\s*\d|first,|second,|third,|fourth,|fifth,|finally,|lastly,|next,|then,|after that,)/gi);
  const orderedLists = $("ol");
  let totalOrderedItems = 0;
  orderedLists.each((_, ol) => { totalOrderedItems += $(ol).children("li").length; });

  // Headings with numbers
  const numberedHeadings = $("h2, h3").filter((_, el) =>
    /^\d+[\.\)]\s|^step\s*\d/i.test($(el).text().trim())).length;

  let score = 0;
  const factors: string[] = [];

  if (totalOrderedItems >= 10) { score += 35; factors.push(`${totalOrderedItems} ordered items`); }
  else if (totalOrderedItems >= 5) { score += 25; factors.push(`${totalOrderedItems} ordered items`); }
  else if (totalOrderedItems >= 3) { score += 15; factors.push(`${totalOrderedItems} ordered items`); }

  if (numberedPatterns && numberedPatterns.length >= 5) { score += 30; factors.push(`${numberedPatterns.length} sequential markers`); }
  else if (numberedPatterns && numberedPatterns.length >= 2) { score += 18; factors.push(`${numberedPatterns.length} sequential markers`); }

  if (numberedHeadings >= 3) { score += 25; factors.push(`${numberedHeadings} numbered headings`); }
  else if (numberedHeadings >= 1) { score += 12; factors.push(`${numberedHeadings} numbered heading(s)`); }

  score = Math.min(score, 100);

  return cr("geo-numbered-steps", "Numbered Steps", "AI Snippet Optimization",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Sequential content: ${factors.join(", ")}.` : "No numbered or sequential content patterns found.",
    score < 50 ? "Use ordered lists and numbered headings for procedural content. AI models extract step-by-step sequences for instruction-based queries." : undefined);
}

function checkSummaryPresence($: CheerioAPI): CheckResult {
  // TL;DR, summary, key takeaways, conclusion
  const summarySelectors = [
    '[class*="tldr" i]', '[class*="summary" i]', '[class*="takeaway" i]',
    '[class*="key-point" i]', '[class*="highlight-box" i]', '[class*="callout" i]',
    '[id*="tldr" i]', '[id*="summary" i]',
  ];
  const summaryElements = $(summarySelectors.join(", ")).length;

  const summaryHeadings = $("h2, h3, h4").filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return /summary|conclusion|key takeaway|tl;?dr|in short|overview|at a glance|bottom line|final thought/i.test(text);
  }).length;

  // Check for <details><summary> pattern
  const detailsSummary = $("details > summary").length;

  // Abstract or excerpt meta
  const hasAbstract = $('meta[name="abstract"]').length > 0 || $('meta[name="description"]').attr("content")?.length! > 80;

  let score = 0;
  const factors: string[] = [];

  if (summaryElements > 0) { score += 35; factors.push(`${summaryElements} summary element(s)`); }
  if (summaryHeadings >= 1) { score += 30; factors.push(`${summaryHeadings} summary heading(s)`); }
  if (detailsSummary > 0) { score += 15; factors.push(`${detailsSummary} expandable summary/ies`); }
  if (hasAbstract) { score += 15; factors.push("abstract/description"); }

  score = Math.min(score, 100);

  return cr("geo-summary", "Summary / TL;DR Presence", "AI Snippet Optimization",
    score >= 45 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Summary signals: ${factors.join(", ")}.` : "No summary, TL;DR, or conclusion section found.",
    score < 45 ? "Add a TL;DR, Key Takeaways, or Summary section. AI models extract these for concise responses. Place at the top or bottom of the article." : undefined);
}

function checkAnswerBoxReadiness($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Check for Q&A format patterns that trigger answer boxes
  const questionHeadings = $("h2, h3").filter((_, el) =>
    /\?$|^(what|how|why|when|where|which|who|can|does|is|are|do|should)\b/i.test($(el).text().trim()));
  const qhCount = questionHeadings.length;

  // Check if questions are immediately followed by concise answers
  let answeredQuestions = 0;
  questionHeadings.each((_, qh) => {
    const next = $(qh).next();
    if (next.is("p")) {
      const words = next.text().trim().split(/\s+/).length;
      if (words >= 10 && words <= 60) answeredQuestions++;
    }
  });

  // Definition-style content (triggers "X is..." answer boxes)
  const definitions = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Z]?[a-z]+)* (?:is|are|refers to|means|is defined as) [^.]{10,}\./g);
  const defCount = definitions?.length ?? 0;

  // Schema for answers
  const hasQASchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      return data["@type"] === "QAPage" || data["@type"] === "FAQPage";
    } catch { return false; }
  });

  let score = 0;
  const factors: string[] = [];

  if (answeredQuestions >= 3) { score += 35; factors.push(`${answeredQuestions} Q&A pairs`); }
  else if (answeredQuestions >= 1) { score += 20; factors.push(`${answeredQuestions} Q&A pair(s)`); }

  if (qhCount >= 3) { score += 20; factors.push(`${qhCount} question headings`); }
  else if (qhCount >= 1) { score += 10; factors.push(`${qhCount} question heading(s)`); }

  if (defCount >= 3) { score += 20; factors.push(`${defCount} definitions`); }
  else if (defCount >= 1) { score += 10; factors.push(`${defCount} definition(s)`); }

  if (hasQASchema) { score += 20; factors.push("QA/FAQ schema"); }

  score = Math.min(score, 100);

  return cr("geo-answer-box", "Answer Box Readiness", "AI Snippet Optimization",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    score >= 20 ? "notice" : "warning",
    score,
    factors.length ? `Answer box signals: ${factors.join(", ")}.` : "No answer box patterns found.",
    score < 50 ? "Use question headings (H2/H3 ending with '?') followed by 10-60 word concise answers. Add FAQ/QA schema. AI answer boxes pull directly from this format." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  AI CITATION READINESS
// ═══════════════════════════════════════════════════════════════

function checkSchemaCompleteness($: CheerioAPI): CheckResult {
  const ldJsonScripts = $('script[type="application/ld+json"]').toArray();
  const schemas: string[] = [];
  const schemaTypes = new Set<string>();

  ldJsonScripts.forEach((el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      if (data["@type"]) schemaTypes.add(data["@type"]);
      if (data["@graph"]) {
        (data["@graph"] as { "@type"?: string }[]).forEach((item) => {
          if (item["@type"]) schemaTypes.add(item["@type"]);
        });
      }
      schemas.push(JSON.stringify(data).substring(0, 200));
    } catch { /* ignore */ }
  });

  // Count key schema properties
  const hasName = schemas.some(s => /"name"/.test(s));
  const hasDescription = schemas.some(s => /"description"/.test(s));
  const hasAuthor = schemas.some(s => /"author"/.test(s));
  const hasDate = schemas.some(s => /"datePublished"|"dateModified"/.test(s));
  const hasImage = schemas.some(s => /"image"/.test(s));
  const hasPublisher = schemas.some(s => /"publisher"/.test(s));

  let score = 0;
  const factors: string[] = [];

  if (schemaTypes.size >= 3) { score += 25; factors.push(`${schemaTypes.size} schema types: ${Array.from(schemaTypes).slice(0, 5).join(", ")}`); }
  else if (schemaTypes.size >= 1) { score += 15; factors.push(`schema: ${Array.from(schemaTypes).join(", ")}`); }

  if (hasName) { score += 10; factors.push("name"); }
  if (hasDescription) { score += 10; factors.push("description"); }
  if (hasAuthor) { score += 15; factors.push("author"); }
  if (hasDate) { score += 15; factors.push("dates"); }
  if (hasImage) { score += 10; factors.push("image"); }
  if (hasPublisher) { score += 10; factors.push("publisher"); }

  score = Math.min(score, 100);

  if (ldJsonScripts.length === 0)
    return cr("geo-schema-complete", "Schema.org Completeness", "AI Citation Readiness", "fail", "warning", 15,
      "No structured data (JSON-LD) found. Schema markup is critical for AI citation and rich results.",
      "Add JSON-LD schema with @type, name, description, author, datePublished, and image. AI models use structured data to verify and cite content accurately.");

  return cr("geo-schema-complete", "Schema.org Completeness", "AI Citation Readiness",
    score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score >= 30 ? "notice" : "warning",
    score,
    `Schema completeness: ${factors.join(", ")}.`,
    score < 60 ? "Add missing schema fields: author, datePublished, dateModified, publisher, image. Complete schemas increase AI citation likelihood." : undefined);
}

function checkUniqueDataPoints($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Statistics and numbers
  const percentages = bodyText.match(/\d+(\.\d+)?%/g);
  const currencies = bodyText.match(/\$\d[\d,]*(\.\d{2})?|\€\d[\d,]*|\£\d[\d,]*/g);
  const largeNumbers = bodyText.match(/\b\d{1,3}(,\d{3})+\b/g);
  const specificYears = bodyText.match(/\b(20[12]\d)\b/g);
  const measurements = bodyText.match(/\b\d+(\.\d+)?\s*(px|em|rem|kg|lb|km|mi|mph|GB|MB|TB|ms|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/gi);

  // Unique findings or research
  const researchPhrases = bodyText.match(/\b(we found|our research|our data shows|our analysis|we discovered|we tested|we surveyed|we measured|results show)\b/gi);

  let count = 0;
  const factors: string[] = [];

  if (percentages && percentages.length >= 3) { count += percentages.length; factors.push(`${percentages.length} percentages`); }
  if (currencies && currencies.length >= 2) { count += currencies.length; factors.push(`${currencies.length} price points`); }
  if (largeNumbers && largeNumbers.length >= 2) { count += largeNumbers.length; factors.push(`${largeNumbers.length} specific numbers`); }
  if (specificYears) { const uniqueYears = Array.from(new Set(specificYears)).length; count += uniqueYears; factors.push(`${uniqueYears} year references`); }
  if (measurements && measurements.length >= 2) { count += measurements.length; factors.push(`${measurements.length} measurements`); }
  if (researchPhrases && researchPhrases.length >= 1) { count += researchPhrases.length * 3; factors.push(`${researchPhrases.length} original research claim(s)`); }

  let score = 0;
  if (count >= 20) score = 100;
  else if (count >= 12) score = 80;
  else if (count >= 6) score = 60;
  else if (count >= 3) score = 40;
  else if (count >= 1) score = 25;
  else score = 10;

  return cr("geo-unique-data", "Unique Data Points", "AI Citation Readiness",
    score >= 55 ? "pass" : score >= 30 ? "warning" : "fail",
    score >= 30 ? "notice" : "warning",
    score,
    factors.length ? `Data richness: ${factors.join(", ")} (${count} total data points).` : "No unique data points, statistics, or original research found.",
    score < 55 ? "Include specific statistics, percentages, prices, measurements, and original research findings. AI models cite content with unique, verifiable data." : undefined);
}

function checkExpertQuotes($: CheerioAPI): CheckResult {
  const blockquotes = $("blockquote");
  const qElements = $("q");
  const bodyText = getBodyText($);

  // Quote attribution patterns
  const attributedQuotes = bodyText.match(/[""][^""]{20,}[""][\s—–-]+[A-Z][a-z]+/g);
  const saidPatterns = bodyText.match(/\b(said|says|stated|explained|noted|commented|argued|claimed|according to)\b\s+[A-Z][a-z]+/gi);

  // Expert titles near quotes
  const expertMentions = bodyText.match(/\b(CEO|CTO|CFO|COO|VP|Director|Professor|Dr\.|PhD|Manager|Analyst|Expert|Specialist|Founder|Co-founder|Lead|Principal|Senior|Chief)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (blockquotes.length >= 3) { score += 30; factors.push(`${blockquotes.length} blockquotes`); }
  else if (blockquotes.length >= 1) { score += 18; factors.push(`${blockquotes.length} blockquote(s)`); }

  if (attributedQuotes && attributedQuotes.length >= 2) { score += 25; factors.push(`${attributedQuotes.length} attributed quotes`); }
  else if (attributedQuotes && attributedQuotes.length >= 1) { score += 12; factors.push("1 attributed quote"); }

  if (saidPatterns && saidPatterns.length >= 3) { score += 20; factors.push(`${saidPatterns.length} quote attributions`); }
  else if (saidPatterns && saidPatterns.length >= 1) { score += 10; factors.push(`${saidPatterns.length} attribution(s)`); }

  if (expertMentions && expertMentions.length >= 3) { score += 20; factors.push(`${expertMentions.length} expert titles`); }
  else if (expertMentions && expertMentions.length >= 1) { score += 10; factors.push(`${expertMentions.length} expert title(s)`); }

  if (qElements.length > 0) { score += 5; factors.push(`${qElements.length} inline quote(s)`); }

  score = Math.min(score, 100);

  return cr("geo-expert-quotes", "Expert Quotes", "AI Citation Readiness",
    score >= 50 ? "pass" : score >= 20 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Expert voices: ${factors.join(", ")}.` : "No expert quotes or attributions found.",
    score < 50 ? "Include quotes from experts with attribution (name, title). AI models heavily favor content backed by recognized authorities." : undefined);
}

function checkFactualDensity($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50)
    return cr("geo-factual-density", "Factual Density", "AI Citation Readiness", "warning", "notice", 30,
      "Too little content to assess factual density.");

  // Count factual indicators
  let factualSignals = 0;

  // Numbers and statistics
  const numbers = bodyText.match(/\b\d+(\.\d+)?(%|\s*(million|billion|thousand|percent|kg|lb|km|mi|mph))?\b/gi);
  factualSignals += Math.min(numbers?.length ?? 0, 20);

  // Definitive statements
  const definitives = bodyText.match(/\b(is|are|was|were|has|have|had|equals|totals|measures|costs|weighs|contains|consists of|comprises|amounts to)\b/gi);
  factualSignals += Math.min((definitives?.length ?? 0) / 3, 10);

  // Named entities as facts
  const properNouns = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g);
  factualSignals += Math.min((properNouns?.length ?? 0) / 2, 10);

  // Dates as facts
  const dates = bodyText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}|\b\d{4}[-/]\d{2}[-/]\d{2}\b/gi);
  factualSignals += (dates?.length ?? 0) * 2;

  const density = factualSignals / (wordCount / 100);
  let score: number;

  if (density >= 8) score = 100;
  else if (density >= 5) score = 80;
  else if (density >= 3) score = 60;
  else if (density >= 1.5) score = 40;
  else score = 20;

  return cr("geo-factual-density", "Factual Density", "AI Citation Readiness",
    score >= 55 ? "pass" : score >= 30 ? "warning" : "fail",
    "notice", score,
    `Factual density: ${density.toFixed(1)} signals per 100 words (${Math.round(factualSignals)} factual signals in ${wordCount} words).`,
    score < 55 ? "Increase factual density with specific numbers, dates, named entities, and definitive statements. AI models prefer high-density factual content for citations." : undefined);
}

function checkSourceDiversity($: CheerioAPI): CheckResult {
  // External links to different domains
  const externalLinks = $('a[href^="http"]').toArray();
  const domains = new Set<string>();
  externalLinks.forEach((el) => {
    try {
      const href = $(el).attr("href") ?? "";
      const domain = new URL(href).hostname.replace("www.", "");
      domains.add(domain);
    } catch { /* ignore */ }
  });

  const bodyText = getBodyText($);

  // Source mentions
  const sourceMentions = bodyText.match(/\b(according to|source:|per |via |data from|reported by|research from|study by|published by|from )\b/gi);

  // Academic/authoritative source patterns
  const academicSources = bodyText.match(/\b(university|journal|institute|research|study|survey|report|white paper|census|bureau)\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (domains.size >= 10) { score += 35; factors.push(`${domains.size} unique external domains`); }
  else if (domains.size >= 5) { score += 25; factors.push(`${domains.size} external domains`); }
  else if (domains.size >= 2) { score += 15; factors.push(`${domains.size} external domains`); }

  if (sourceMentions && sourceMentions.length >= 5) { score += 25; factors.push(`${sourceMentions.length} source attributions`); }
  else if (sourceMentions && sourceMentions.length >= 2) { score += 15; factors.push(`${sourceMentions.length} source attribution(s)`); }

  if (academicSources && academicSources.length >= 3) { score += 25; factors.push(`${academicSources.length} authoritative source references`); }
  else if (academicSources && academicSources.length >= 1) { score += 12; factors.push(`${academicSources.length} authoritative reference(s)`); }

  // Footnotes or bibliography
  const footnotes = $('[class*="footnote" i], [class*="reference" i], [class*="bibliography" i]').length;
  if (footnotes > 0) { score += 15; factors.push(`${footnotes} footnote/reference section(s)`); }

  score = Math.min(score, 100);

  return cr("geo-source-diversity", "Source Diversity", "AI Citation Readiness",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Source diversity: ${factors.join(", ")}.` : "No diverse sources found.",
    score < 50 ? "Link to multiple authoritative external sources. Cite studies, reports, and expert sources. AI models trust content that references diverse, credible sources." : undefined);
}

function checkMultimodalContent($: CheerioAPI): CheckResult {
  const images = $("img").filter((_, el) => {
    const src = $(el).attr("src") ?? "";
    // Exclude tiny icons and tracking pixels
    return !src.includes("1x1") && !src.includes("pixel") && !src.includes("tracking");
  });
  const videos = $("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='wistia']");
  const audios = $("audio");
  const svgs = $("svg").filter((_, el) => {
    // Only count substantial SVGs (not icons)
    const children = $(el).children().length;
    return children > 3;
  });
  const figures = $("figure");
  const embeds = $("embed, object");
  const codeBlocks = $("pre code, .highlight, .code-block");
  const infographics = $('[class*="infographic" i], [class*="chart" i], [class*="graph" i], [class*="diagram" i]');

  // Image alt text quality
  const imagesWithAlt = images.filter((_, el) => ($(el).attr("alt") ?? "").length > 5).length;

  let score = 0;
  const factors: string[] = [];

  if (images.length >= 5) { score += 25; factors.push(`${images.length} images`); }
  else if (images.length >= 2) { score += 18; factors.push(`${images.length} images`); }
  else if (images.length >= 1) { score += 10; factors.push("1 image"); }

  if (videos.length >= 1) { score += 20; factors.push(`${videos.length} video(s)`); }
  if (audios.length >= 1) { score += 10; factors.push(`${audios.length} audio`); }
  if (figures.length >= 2) { score += 10; factors.push(`${figures.length} figures`); }
  if (codeBlocks.length >= 1) { score += 10; factors.push(`${codeBlocks.length} code block(s)`); }
  if (infographics.length >= 1) { score += 15; factors.push(`${infographics.length} chart/infographic(s)`); }

  if (images.length > 0 && imagesWithAlt / images.length >= 0.8) {
    score += 10; factors.push("good alt text coverage");
  }

  score = Math.min(score, 100);

  return cr("geo-multimodal", "Multimodal Content", "AI Citation Readiness",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Media: ${factors.join(", ")}.` : "No multimodal content (images, video, code) found.",
    score < 50 ? "Add images, videos, code examples, and infographics. Multi-format content signals comprehensive coverage and increases AI citation probability." : undefined);
}

function checkTopicClusterSignals($: CheerioAPI): CheckResult {
  // Internal links (same-domain or relative)
  const allLinks = $("a[href]").toArray();
  let internalLinks = 0;
  let contextualLinks = 0;
  const linkedPaths = new Set<string>();

  allLinks.forEach((el) => {
    const href = $(el).attr("href") ?? "";
    // Internal links: relative paths or same-domain
    if (href.startsWith("/") || href.startsWith("#") || href.startsWith("./")) {
      internalLinks++;
      linkedPaths.add(href.split("#")[0].split("?")[0]);
      // Contextual links (within paragraph text, not nav)
      const parent = $(el).parent();
      if (parent.is("p, li, td, span, div:not(nav):not(header):not(footer)")) contextualLinks++;
    }
  });

  // Related content sections
  const relatedSections = $('[class*="related" i], [class*="see-also" i], [class*="further-reading" i], [class*="more-on" i]');

  // Breadcrumb navigation (shows topic hierarchy)
  const breadcrumbs = $('[class*="breadcrumb" i], nav[aria-label="breadcrumb"], [itemtype*="BreadcrumbList"]');

  // Category/tag signals
  const tags = $('[class*="tag" i], [class*="category" i], [rel="tag"], a[href*="/tag/"], a[href*="/category/"]');

  let score = 0;
  const factors: string[] = [];

  if (contextualLinks >= 10) { score += 30; factors.push(`${contextualLinks} contextual internal links`); }
  else if (contextualLinks >= 5) { score += 20; factors.push(`${contextualLinks} contextual links`); }
  else if (contextualLinks >= 2) { score += 10; factors.push(`${contextualLinks} contextual link(s)`); }

  if (linkedPaths.size >= 8) { score += 20; factors.push(`${linkedPaths.size} unique internal paths`); }
  else if (linkedPaths.size >= 3) { score += 12; factors.push(`${linkedPaths.size} internal paths`); }

  if (relatedSections.length > 0) { score += 20; factors.push("related content section"); }
  if (breadcrumbs.length > 0) { score += 15; factors.push("breadcrumb navigation"); }
  if (tags.length >= 3) { score += 15; factors.push(`${tags.length} tags/categories`); }

  score = Math.min(score, 100);

  return cr("geo-topic-cluster", "Topic Cluster Signals", "AI Citation Readiness",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `Topic clusters: ${factors.join(", ")}.` : "Weak topic cluster signals — few internal links or related content.",
    score < 50 ? "Add contextual internal links to related content, breadcrumbs, tags, and 'related articles' sections. AI models use topic clusters to assess topical authority." : undefined);
}

function checkNaturalLanguageTargeting($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Natural question patterns (how people actually ask AI)
  const naturalQuestions = bodyText.match(/\b(what is|how to|how do|why does|when should|where can|which is better|can I|should I|is it possible|what are the|how much|how many|what happens|how does)\b/gi);

  // Conversational phrases
  const conversational = bodyText.match(/\b(you can|you should|you'll need|let's|here's|it's important|keep in mind|worth noting|the key is|the best way|a good approach|in practice|for example|in other words|put simply)\b/gi);

  // Long-tail keyword patterns (3+ word specific phrases)
  const headingTexts = $("h2, h3").toArray().map(h => $(h).text().trim());
  const longTailHeadings = headingTexts.filter(t => t.split(/\s+/).length >= 4).length;

  // First-person and second-person pronouns (conversational tone)
  const personalPronouns = bodyText.match(/\b(I |we |you |your |our |my |us )\b/gi);

  let score = 0;
  const factors: string[] = [];

  if (naturalQuestions && naturalQuestions.length >= 5) { score += 30; factors.push(`${naturalQuestions.length} natural question patterns`); }
  else if (naturalQuestions && naturalQuestions.length >= 2) { score += 18; factors.push(`${naturalQuestions.length} question patterns`); }

  if (conversational && conversational.length >= 8) { score += 25; factors.push(`conversational writing style`); }
  else if (conversational && conversational.length >= 3) { score += 15; factors.push(`some conversational phrasing`); }

  if (longTailHeadings >= 3) { score += 20; factors.push(`${longTailHeadings} long-tail headings`); }
  else if (longTailHeadings >= 1) { score += 10; factors.push(`${longTailHeadings} long-tail heading(s)`); }

  if (personalPronouns && personalPronouns.length >= 10) { score += 15; factors.push("personal, engaging tone"); }
  else if (personalPronouns && personalPronouns.length >= 3) { score += 8; factors.push("some personal pronouns"); }

  // Meta description targeting natural queries
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  if (/how|what|why|guide|learn|best/i.test(metaDesc)) { score += 10; factors.push("query-targeted meta description"); }

  score = Math.min(score, 100);

  return cr("geo-natural-lang", "Natural Language Targeting", "AI Citation Readiness",
    score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    "notice", score,
    factors.length ? `NLP targeting: ${factors.join(", ")}.` : "Content not optimized for natural language queries.",
    score < 50 ? "Write in a conversational tone targeting natural questions people ask AI. Use 'How to...', 'What is...' headings. AI search matches content to conversational queries." : undefined);
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY: Syllable estimation for Flesch score
// ═══════════════════════════════════════════════════════════════

function estimateSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  // Subtract silent e
  if (word.endsWith("e") && !word.endsWith("le")) count--;
  // Subtract common silent endings
  if (word.endsWith("es") || word.endsWith("ed")) count--;
  return Math.max(1, count);
}
