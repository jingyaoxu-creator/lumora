import type { CheerioAPI } from "cheerio";

/**
 * Per-paragraph citability scoring.
 * Breaks page into paragraphs and scores each for AI citation potential.
 */

export interface ScoredParagraph {
  text: string;
  score: number; // 0-100
  factors: {
    informationDensity: number; // 0-25
    selfContainment: number; // 0-25
    factualSpecificity: number; // 0-25
    structuralClarity: number; // 0-25
  };
  highlights: string[]; // Why this scored high/low
}

export interface ParagraphAnalysis {
  paragraphs: ScoredParagraph[];
  avgScore: number;
  topParagraphs: ScoredParagraph[];
  weakParagraphs: ScoredParagraph[];
}

export function scoreParagraphs($: CheerioAPI): ParagraphAnalysis {
  const paragraphs: ScoredParagraph[] = [];

  // Extract meaningful paragraphs from main content areas
  const selectors = "main p, article p, [role='main'] p, .content p, #content p, .post p, .entry-content p, body > div p";

  $(selectors).each((_, el) => {
    const text = $(el).text().trim();
    // Skip short or boilerplate paragraphs
    if (text.length < 50) return;
    if (text.length > 2000) return;
    if (paragraphs.length >= 30) return; // Cap

    // Skip likely navigation/footer/cookie text
    if (/cookie|privacy policy|terms of service|copyright|all rights reserved/i.test(text)) return;
    if (/subscribe|newsletter|sign up|follow us/i.test(text)) return;

    const scored = scoreSingleParagraph(text);
    paragraphs.push(scored);
  });

  if (paragraphs.length === 0) {
    return {
      paragraphs: [],
      avgScore: 0,
      topParagraphs: [],
      weakParagraphs: [],
    };
  }

  const avgScore = Math.round(
    paragraphs.reduce((s, p) => s + p.score, 0) / paragraphs.length,
  );

  const sorted = [...paragraphs].sort((a, b) => b.score - a.score);

  return {
    paragraphs,
    avgScore,
    topParagraphs: sorted.slice(0, 3),
    weakParagraphs: sorted.slice(-3).reverse(),
  };
}

function scoreSingleParagraph(text: string): ScoredParagraph {
  const highlights: string[] = [];

  // ── Information Density (0-25) ──
  let infoDensity = 10; // base

  // Numbers and statistics
  const numbers = text.match(/\d+(\.\d+)?(%|x|px|ms|KB|MB|GB|mph|km|kg|lb|\$|€|£)?/g);
  if (numbers && numbers.length >= 2) {
    infoDensity += 5;
    highlights.push(`${numbers.length} data points`);
  }

  // Specific years
  if (/\b(19|20)\d{2}\b/.test(text)) {
    infoDensity += 3;
    highlights.push("Contains dates");
  }

  // Named entities (capitalized words not at start of sentence)
  const entities = text.match(/(?<!\. )[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g);
  if (entities && entities.length >= 2) {
    infoDensity += 3;
  }

  // Technical terms or domain-specific language
  if (/\b(API|SDK|framework|algorithm|protocol|methodology|benchmark|metric)\b/i.test(text)) {
    infoDensity += 4;
    highlights.push("Technical depth");
  }

  infoDensity = Math.min(25, infoDensity);

  // ── Self-Containment (0-25) ──
  let selfContain = 12; // base

  // Starts with a clear topic sentence
  const firstSentence = text.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length >= 20 && firstSentence.length <= 120) {
    selfContain += 5;
  }

  // No dangling references
  if (/^(This|That|It|They|These|Those|He|She|However,|But|And|Also|Furthermore)\b/.test(text)) {
    selfContain -= 5;
    highlights.push("Starts with reference — less self-contained");
  }

  // Contains a complete thought (has both subject and conclusion)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length >= 2 && sentences.length <= 5) {
    selfContain += 5;
    highlights.push(`${sentences.length} sentences — good citation length`);
  } else if (sentences.length > 5) {
    selfContain -= 3;
    highlights.push("Too long for a single citation");
  }

  // Ideal citation length: 40-100 words
  const words = text.split(/\s+/).length;
  if (words >= 40 && words <= 100) {
    selfContain += 3;
    highlights.push("Ideal citation length (40-100 words)");
  }

  selfContain = Math.max(0, Math.min(25, selfContain));

  // ── Factual Specificity (0-25) ──
  let factual = 8; // base

  // Quotes or citations
  if (/[""].*[""]|according to|research shows|study found|data suggests/i.test(text)) {
    factual += 5;
    highlights.push("Contains citations/evidence");
  }

  // Comparisons
  if (/\b(compared to|versus|vs\.|unlike|more than|less than|better than|worse than)\b/i.test(text)) {
    factual += 4;
    highlights.push("Comparative statement");
  }

  // Lists or enumerations within paragraph
  if (/\b(first|second|third|1\)|2\)|3\)|including|such as|for example|e\.g\.|i\.e\.)\b/i.test(text)) {
    factual += 3;
  }

  // Cause and effect
  if (/\b(because|therefore|as a result|consequently|this means|this leads to)\b/i.test(text)) {
    factual += 3;
    highlights.push("Causal reasoning");
  }

  // Vague language penalty
  if (/\b(very|really|basically|actually|just|simply|obviously|clearly|everyone knows)\b/i.test(text)) {
    factual -= 3;
    highlights.push("Vague language reduces credibility");
  }

  factual = Math.max(0, Math.min(25, factual));

  // ── Structural Clarity (0-25) ──
  let structural = 10; // base

  // Paragraph length in characters
  if (text.length >= 100 && text.length <= 500) {
    structural += 5;
  } else if (text.length > 800) {
    structural -= 3;
    highlights.push("Paragraph too long");
  }

  // Definition pattern
  if (/\b(is a|refers to|is defined as|means|is the process of)\b/i.test(text)) {
    structural += 5;
    highlights.push("Definition pattern — highly citable");
  }

  // Answer pattern (directly answers a question)
  if (/^(The|A|An)\s.*\b(is|are|was|were|can|should|must)\b/i.test(text.slice(0, 80))) {
    structural += 3;
    highlights.push("Direct answer pattern");
  }

  // Step/instruction pattern
  if (/\b(step \d|to do this|you (can|should|need to)|here's how)\b/i.test(text)) {
    structural += 2;
  }

  structural = Math.max(0, Math.min(25, structural));

  const score = infoDensity + selfContain + factual + structural;

  return {
    text: text.length > 300 ? text.slice(0, 297) + "..." : text,
    score,
    factors: {
      informationDensity: infoDensity,
      selfContainment: selfContain,
      factualSpecificity: factual,
      structuralClarity: structural,
    },
    highlights,
  };
}
