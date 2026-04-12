import type { CheerioAPI } from "cheerio";
import type { CheckResult } from "./types";

export function runGEOChecks($: CheerioAPI): CheckResult[] {
  return [
    checkContentStructure($),
    checkFAQPresence($),
    checkEntityCoverage($),
    checkCitationSignals($),
    checkAuthorEEAT($),
    checkContentFreshness($),
    checkConversationalReadiness($),
    checkSourceAttribution($),
  ];
}

function getBodyText($: CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, nav, footer, header").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

function checkContentStructure($: CheerioAPI): CheckResult {
  const headings = $("h1, h2, h3, h4, h5, h6");
  const paragraphs = $("p");
  const lists = $("ul, ol");
  const tables = $("table");
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  let score = 0;
  const factors: string[] = [];

  if (headings.length >= 3) {
    score += 25;
    factors.push(`${headings.length} headings`);
  } else if (headings.length >= 1) {
    score += 12;
    factors.push(`only ${headings.length} heading(s)`);
  }

  if (paragraphs.length >= 5) {
    score += 25;
    factors.push(`${paragraphs.length} paragraphs`);
  } else if (paragraphs.length >= 2) {
    score += 12;
    factors.push(`${paragraphs.length} paragraphs`);
  }

  if (lists.length >= 1) {
    score += 20;
    factors.push(`${lists.length} list(s)`);
  }

  if (tables.length >= 1) {
    score += 10;
    factors.push(`${tables.length} table(s)`);
  }

  if (wordCount >= 800) {
    score += 20;
    factors.push(`${wordCount} words (comprehensive)`);
  } else if (wordCount >= 300) {
    score += 10;
    factors.push(`${wordCount} words`);
  } else {
    factors.push(`only ${wordCount} words (thin content)`);
  }

  score = Math.min(score, 100);

  return {
    id: "geo-structure",
    name: "Content Structure",
    category: "Structure",
    status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
    score,
    details: `Content structure: ${factors.join(", ")}.`,
    suggestion:
      score < 70
        ? "Improve content structure with clear headings, detailed paragraphs, lists, and at least 800 words. AI models prefer well-organized, comprehensive content."
        : undefined,
  };
}

function checkFAQPresence($: CheerioAPI): CheckResult {
  // Check for FAQ schema
  const faqSchema = $('script[type="application/ld+json"]')
    .toArray()
    .some((el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        return (
          data["@type"] === "FAQPage" ||
          (Array.isArray(data["@graph"]) &&
            data["@graph"].some(
              (item: { "@type": string }) => item["@type"] === "FAQPage"
            ))
        );
      } catch {
        return false;
      }
    });

  // Check for Q&A patterns in HTML
  const bodyText = getBodyText($);
  const questionPatterns = bodyText.match(
    /\b(what|how|why|when|where|which|who|can|does|is|are|do|should|will|would)\b[^.?!]{10,}\?/gi
  );
  const questionCount = questionPatterns?.length ?? 0;

  // Check for FAQ-like elements
  const details = $("details");
  const faqSections = $('[class*="faq"], [id*="faq"], [class*="FAQ"], [id*="FAQ"]');

  let score = 0;
  const found: string[] = [];

  if (faqSchema) {
    score += 40;
    found.push("FAQ schema markup");
  }
  if (questionCount >= 3) {
    score += 30;
    found.push(`${questionCount} question patterns`);
  } else if (questionCount >= 1) {
    score += 15;
    found.push(`${questionCount} question pattern(s)`);
  }
  if (details.length > 0) {
    score += 15;
    found.push(`${details.length} expandable sections`);
  }
  if (faqSections.length > 0) {
    score += 15;
    found.push("dedicated FAQ section");
  }

  score = Math.min(score, 100);

  return {
    id: "geo-faq",
    name: "FAQ / Q&A Format",
    category: "AI Readability",
    status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score,
    details: found.length
      ? `Found: ${found.join(", ")}.`
      : "No FAQ or Q&A patterns found.",
    suggestion:
      score < 60
        ? "Add FAQ-style content with clear questions and answers. Use FAQPage schema markup. AI search engines heavily favor Q&A formats."
        : undefined,
  };
}

function checkEntityCoverage($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Check for named entities (proper nouns pattern)
  const properNouns = bodyText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) ?? [];
  const uniqueEntities = [...new Set(properNouns)].filter(
    (e) =>
      !["The", "This", "That", "These", "Those", "There", "Here", "What", "How", "Why", "When", "Where", "Which", "Who"].includes(e)
  );

  // Check for definitive statements
  const definitive = bodyText.match(
    /\b(is defined as|refers to|means|is a type of|is known as|consists of)\b/gi
  );

  // Check for topic focus (keyword density in headings)
  const headingText = $("h1, h2, h3")
    .map((_, el) => $(el).text())
    .get()
    .join(" ");

  let score = 0;
  const factors: string[] = [];

  if (uniqueEntities.length >= 10) {
    score += 35;
    factors.push(`${uniqueEntities.length} unique entities`);
  } else if (uniqueEntities.length >= 5) {
    score += 20;
    factors.push(`${uniqueEntities.length} entities`);
  }

  if (definitive && definitive.length >= 2) {
    score += 25;
    factors.push(`${definitive.length} definitional statements`);
  } else if (definitive && definitive.length >= 1) {
    score += 12;
    factors.push("1 definitional statement");
  }

  if (headingText.length >= 50) {
    score += 20;
    factors.push("descriptive headings");
  }

  if (wordCount >= 500) {
    score += 20;
    factors.push("sufficient depth");
  }

  score = Math.min(score, 100);

  return {
    id: "geo-entity",
    name: "Entity & Topic Coverage",
    category: "AI Readability",
    status: score >= 60 ? "pass" : score >= 35 ? "warning" : "fail",
    score,
    details: factors.length
      ? `Entity analysis: ${factors.join(", ")}.`
      : "Weak entity coverage detected.",
    suggestion:
      score < 60
        ? "Include clear entity definitions, specific names, and detailed topic explanations. AI models extract entities for knowledge graphs."
        : undefined,
  };
}

function checkCitationSignals($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Check for statistics and numbers
  const stats = bodyText.match(
    /\b\d+(\.\d+)?(%|\s*percent|\s*million|\s*billion|\s*trillion)\b/gi
  );
  // Check for year references
  const years = bodyText.match(/\b(20[12]\d|19\d\d)\b/g);
  // Check for citation-like patterns
  const citations = bodyText.match(
    /\b(according to|research shows|studies show|data from|report by|survey by|published in)\b/gi
  );
  // Check for external links (potential sources)
  const externalLinks = $('a[href^="http"]').length;

  let score = 0;
  const factors: string[] = [];

  if (stats && stats.length >= 3) {
    score += 30;
    factors.push(`${stats.length} statistics`);
  } else if (stats && stats.length >= 1) {
    score += 15;
    factors.push(`${stats.length} statistic(s)`);
  }

  if (citations && citations.length >= 2) {
    score += 30;
    factors.push(`${citations.length} citation phrases`);
  } else if (citations && citations.length >= 1) {
    score += 15;
    factors.push("1 citation phrase");
  }

  if (years && years.length >= 2) {
    score += 15;
    factors.push("temporal references");
  }

  if (externalLinks >= 3) {
    score += 25;
    factors.push(`${externalLinks} external sources`);
  } else if (externalLinks >= 1) {
    score += 12;
    factors.push(`${externalLinks} external source(s)`);
  }

  score = Math.min(score, 100);

  return {
    id: "geo-citation",
    name: "Citation-Worthy Content",
    category: "Authority",
    status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score,
    details: factors.length
      ? `Citation signals: ${factors.join(", ")}.`
      : "No citation-worthy signals found.",
    suggestion:
      score < 60
        ? "Add specific statistics, data points, and source references. AI models prefer content they can cite with confidence."
        : undefined,
  };
}

function checkAuthorEEAT($: CheerioAPI): CheckResult {
  const authorMeta = $('meta[name="author"]').attr("content");
  const authorSchema = $('script[type="application/ld+json"]')
    .toArray()
    .some((el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        return data["author"] || data["@type"] === "Person";
      } catch {
        return false;
      }
    });
  const aboutPage = $('a[href*="about"], a[href*="team"], a[href*="author"]');
  const bodyText = getBodyText($);
  const expertiseSignals = bodyText.match(
    /\b(expert|specialist|certified|years of experience|professional|qualified|PhD|MD|MBA)\b/gi
  );

  let score = 0;
  const factors: string[] = [];

  if (authorMeta) {
    score += 25;
    factors.push(`author: ${authorMeta}`);
  }
  if (authorSchema) {
    score += 25;
    factors.push("author schema markup");
  }
  if (aboutPage.length > 0) {
    score += 20;
    factors.push("about/team links");
  }
  if (expertiseSignals && expertiseSignals.length >= 2) {
    score += 30;
    factors.push(`${expertiseSignals.length} expertise signals`);
  } else if (expertiseSignals && expertiseSignals.length >= 1) {
    score += 15;
    factors.push("1 expertise signal");
  }

  score = Math.min(score, 100);

  return {
    id: "geo-eeat",
    name: "Author & E-E-A-T Signals",
    category: "Authority",
    status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score,
    details: factors.length
      ? `E-E-A-T signals: ${factors.join(", ")}.`
      : "No author or expertise signals found.",
    suggestion:
      score < 60
        ? "Add author information, credentials, and expertise signals. AI search engines prioritize content with clear authorship and expertise."
        : undefined,
  };
}

function checkContentFreshness($: CheerioAPI): CheckResult {
  // Check for date meta tags
  const pubDate =
    $('meta[property="article:published_time"]').attr("content") ??
    $('meta[name="date"]').attr("content") ??
    $('meta[name="DC.date"]').attr("content") ??
    "";
  const modDate =
    $('meta[property="article:modified_time"]').attr("content") ??
    $('meta[name="last-modified"]').attr("content") ??
    "";

  // Check for time elements
  const timeElements = $("time[datetime]");

  // Check for date schema
  const dateSchema = $('script[type="application/ld+json"]')
    .toArray()
    .some((el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        return data["datePublished"] || data["dateModified"];
      } catch {
        return false;
      }
    });

  let score = 0;
  const factors: string[] = [];

  if (pubDate) {
    score += 30;
    factors.push(`published: ${pubDate.substring(0, 10)}`);
  }
  if (modDate) {
    score += 30;
    factors.push(`modified: ${modDate.substring(0, 10)}`);
  }
  if (timeElements.length > 0) {
    score += 20;
    factors.push(`${timeElements.length} date element(s)`);
  }
  if (dateSchema) {
    score += 20;
    factors.push("date schema markup");
  }

  score = Math.min(score, 100);

  return {
    id: "geo-freshness",
    name: "Content Freshness",
    category: "Authority",
    status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score,
    details: factors.length
      ? `Freshness signals: ${factors.join(", ")}.`
      : "No freshness/date signals found.",
    suggestion:
      score < 60
        ? "Add publication and modification dates using meta tags, schema markup, or visible timestamps. AI models trust fresh, dated content."
        : undefined,
  };
}

function checkConversationalReadiness($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Check for direct answer patterns
  const directAnswers = bodyText.match(
    /\b(is|are|was|were|means|refers to|defined as|the answer is|in short|simply put|to summarize)\b/gi
  );
  // Check for natural language sentences (not just keyword stuffing)
  const sentences = bodyText.match(/[A-Z][^.!?]*[.!?]/g) ?? [];
  const avgSentenceLen =
    sentences.length > 0
      ? sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length
      : 0;

  // Check for summary/conclusion sections
  const summaryElements = $(
    'h2:contains("Summary"), h2:contains("Conclusion"), h2:contains("Key Takeaway"), h3:contains("Summary"), h3:contains("Conclusion"), [class*="summary"], [class*="tldr"]'
  );

  let score = 0;
  const factors: string[] = [];

  if (directAnswers && directAnswers.length >= 5) {
    score += 35;
    factors.push(`${directAnswers.length} direct answer patterns`);
  } else if (directAnswers && directAnswers.length >= 2) {
    score += 20;
    factors.push(`${directAnswers.length} answer patterns`);
  }

  if (avgSentenceLen >= 10 && avgSentenceLen <= 25) {
    score += 30;
    factors.push("good sentence clarity");
  } else if (sentences.length > 0) {
    score += 15;
    factors.push(
      avgSentenceLen < 10 ? "very short sentences" : "complex sentences"
    );
  }

  if (summaryElements.length > 0) {
    score += 20;
    factors.push("summary/conclusion section");
  }

  if (sentences.length >= 10) {
    score += 15;
    factors.push("sufficient content depth");
  }

  score = Math.min(score, 100);

  return {
    id: "geo-conversational",
    name: "Conversational Readiness",
    category: "AI Readability",
    status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
    score,
    details: factors.length
      ? `AI readability: ${factors.join(", ")}.`
      : "Content is not optimized for AI extraction.",
    suggestion:
      score < 60
        ? "Write in clear, natural language with direct answers. Add summary sections. AI assistants extract concise, definitive statements."
        : undefined,
  };
}

function checkSourceAttribution($: CheerioAPI): CheckResult {
  const bodyText = getBodyText($);

  // Check for blockquotes
  const blockquotes = $("blockquote");
  // Check for cite elements
  const cites = $("cite");
  // Check for reference patterns
  const refs = bodyText.match(
    /\b(source|reference|cited|bibliography|works cited|further reading)\b/gi
  );
  // Check for footnote patterns
  const footnotes = $('[class*="footnote"], [id*="footnote"], [class*="reference"], sup a[href^="#"]');

  let score = 0;
  const factors: string[] = [];

  if (blockquotes.length > 0) {
    score += 25;
    factors.push(`${blockquotes.length} blockquote(s)`);
  }
  if (cites.length > 0) {
    score += 25;
    factors.push(`${cites.length} citation element(s)`);
  }
  if (refs && refs.length >= 2) {
    score += 25;
    factors.push("reference mentions");
  }
  if (footnotes.length > 0) {
    score += 25;
    factors.push(`${footnotes.length} footnote/reference links`);
  }

  score = Math.min(score, 100);

  return {
    id: "geo-sources",
    name: "Source Attribution",
    category: "Authority",
    status: score >= 50 ? "pass" : score >= 25 ? "warning" : "fail",
    score,
    details: factors.length
      ? `Source signals: ${factors.join(", ")}.`
      : "No source attribution found.",
    suggestion:
      score < 50
        ? "Add proper source attribution with blockquotes, citations, and references. AI models prioritize verifiable, well-sourced content."
        : undefined,
  };
}
