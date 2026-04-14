/**
 * Competitor Citation Gap Analysis
 *
 * Compares a user's page against sources cited in Google's AI Overview
 * for a given query. Uses Serper.dev to find AI Overview sources,
 * fetches and scores each page with paragraph-scorer, then identifies
 * what the user's page is missing relative to cited competitors.
 */

import * as cheerio from "cheerio";
import { scoreParagraphs, type ParagraphAnalysis } from "./paragraph-scorer";

/* ------------------------------------------------------------------ */
/*  Public interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface CompetitorSource {
  url: string;
  domain: string;
  title: string;
  position: number; // position in AI Overview (1-based)
  snippet: string;
  avgParagraphScore: number;
  topFactors: string[]; // Why this source was likely cited
}

export interface CitationGapAnalysis {
  query: string;
  userUrl: string;
  userDomain: string;
  userParagraphScore: number;
  hasAIOverview: boolean;
  userIsCited: boolean;
  competitors: CompetitorSource[];
  gaps: string[]; // What the user's page is missing
  strengths: string[]; // What the user's page does well
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Serper response types (partial)                                    */
/* ------------------------------------------------------------------ */

interface SerperAIOverviewSource {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  aiOverview?: {
    sources?: SerperAIOverviewSource[];
  };
  organic?: {
    title: string;
    link: string;
    snippet: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 8_000;
const MAX_COMPETITOR_FETCHES = 5;

/** Strip protocol, www prefix, and trailing slash to normalise domains. */
function normalizeDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
}

/** Fetch a URL with an 8-second timeout. Returns null on failure. */
async function safeFetch(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LumoraBot/1.0; +https://lumora.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Fetch a page and run paragraph scoring. Returns null on failure. */
async function fetchAndScore(
  url: string,
): Promise<{ analysis: ParagraphAnalysis; html: string } | null> {
  const html = await safeFetch(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const analysis = scoreParagraphs($);
  return { analysis, html };
}

/** Collect the top unique highlight strings from a ParagraphAnalysis. */
function extractTopFactors(analysis: ParagraphAnalysis): string[] {
  const factorCounts = new Map<string, number>();

  for (const p of analysis.topParagraphs) {
    for (const h of p.highlights) {
      factorCounts.set(h, (factorCounts.get(h) || 0) + 1);
    }
  }

  // Sort by frequency descending, take top 5
  return [...factorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor]) => factor);
}

/** Check whether the page has structured data (JSON-LD). */
function hasStructuredData(html: string): boolean {
  return /application\/ld\+json/i.test(html);
}

/** Check whether the page uses proper heading hierarchy. */
function hasProperHeadings(html: string): boolean {
  const $ = cheerio.load(html);
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  return h1Count >= 1 && h2Count >= 2;
}

/* ------------------------------------------------------------------ */
/*  Core analysis                                                      */
/* ------------------------------------------------------------------ */

/**
 * Analyse competitor citations in the AI Overview for a query and
 * compare them against the user's own page.
 */
export async function analyzeCompetitorCitations(
  userUrl: string,
  query: string,
): Promise<CitationGapAnalysis> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY environment variable is not set");
  }

  const userDomain = normalizeDomain(userUrl);

  // ── 1. Call Serper for AI Overview sources ──────────────────────
  const serperRes = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query }),
  });

  if (!serperRes.ok) {
    throw new Error(`Serper API error: ${serperRes.status}`);
  }

  const serperData: SerperResponse = await serperRes.json();
  const aiSources = serperData.aiOverview?.sources ?? [];
  const hasAIOverview = aiSources.length > 0;

  // Determine whether the user's own domain appears in the AI Overview
  const userIsCited = aiSources.some(
    (s) => normalizeDomain(s.link) === userDomain,
  );

  // ── 2. Fetch & score competitor pages (max 5) ──────────────────
  const competitorSources = aiSources
    .filter((s) => normalizeDomain(s.link) !== userDomain)
    .slice(0, MAX_COMPETITOR_FETCHES);

  const [competitorResults, userResult] = await Promise.all([
    Promise.allSettled(
      competitorSources.map((s) => fetchAndScore(s.link)),
    ),
    fetchAndScore(userUrl),
  ]);

  // Build CompetitorSource objects
  const competitors: CompetitorSource[] = [];

  for (let i = 0; i < competitorSources.length; i++) {
    const result = competitorResults[i];
    const source = competitorSources[i];

    if (result.status !== "fulfilled" || !result.value) continue;

    const { analysis } = result.value;

    competitors.push({
      url: source.link,
      domain: normalizeDomain(source.link),
      title: source.title,
      position: i + 1,
      snippet: source.snippet,
      avgParagraphScore: analysis.avgScore,
      topFactors: extractTopFactors(analysis),
    });
  }

  // ── 3. Score the user's page ───────────────────────────────────
  const userAnalysis = userResult?.analysis ?? null;
  const userHtml = userResult?.html ?? "";
  const userParagraphScore = userAnalysis?.avgScore ?? 0;

  // ── 4. Gap & strength analysis ─────────────────────────────────
  const gaps: string[] = [];
  const strengths: string[] = [];

  if (competitors.length > 0) {
    const avgCompetitorScore =
      Math.round(
        competitors.reduce((sum, c) => sum + c.avgParagraphScore, 0) /
          competitors.length,
      );

    // Score comparison
    if (userParagraphScore < avgCompetitorScore) {
      const diff = avgCompetitorScore - userParagraphScore;
      gaps.push(
        `Your average paragraph score (${userParagraphScore}) is ${diff} points below the cited competitor average (${avgCompetitorScore})`,
      );
    } else if (userParagraphScore > avgCompetitorScore) {
      const diff = userParagraphScore - avgCompetitorScore;
      strengths.push(
        `Your average paragraph score (${userParagraphScore}) is ${diff} points above the cited competitor average (${avgCompetitorScore})`,
      );
    }

    // Aggregate competitor factors to find what competitors do that the user doesn't
    const competitorFactorSet = new Set<string>();
    const userFactorSet = new Set<string>();

    for (const c of competitors) {
      for (const f of c.topFactors) {
        competitorFactorSet.add(f);
      }
    }

    if (userAnalysis) {
      for (const f of extractTopFactors(userAnalysis)) {
        userFactorSet.add(f);
      }
    }

    // Factors competitors have that user doesn't
    for (const factor of competitorFactorSet) {
      if (!userFactorSet.has(factor)) {
        gaps.push(`Competitors excel at: ${factor}`);
      }
    }

    // Factors user has that competitors don't
    for (const factor of userFactorSet) {
      if (!competitorFactorSet.has(factor)) {
        strengths.push(`You uniquely have: ${factor}`);
      }
    }

    // Check for data points in competitors vs user
    const competitorDataPointCounts = competitors
      .flatMap((c) => c.topFactors)
      .filter((f) => /data point/i.test(f));

    const userHasDataPoints = [...userFactorSet].some((f) =>
      /data point/i.test(f),
    );

    if (competitorDataPointCounts.length > 0 && !userHasDataPoints) {
      gaps.push(
        "Competitors include more numerical data points and statistics — add concrete numbers to your content",
      );
    }

    // Compare factor sub-scores across competitors
    if (userAnalysis && userAnalysis.paragraphs.length > 0) {
      const userAvgFactors = {
        informationDensity: 0,
        selfContainment: 0,
        factualSpecificity: 0,
        structuralClarity: 0,
      };

      for (const p of userAnalysis.paragraphs) {
        userAvgFactors.informationDensity += p.factors.informationDensity;
        userAvgFactors.selfContainment += p.factors.selfContainment;
        userAvgFactors.factualSpecificity += p.factors.factualSpecificity;
        userAvgFactors.structuralClarity += p.factors.structuralClarity;
      }

      const n = userAnalysis.paragraphs.length;
      userAvgFactors.informationDensity = Math.round(
        userAvgFactors.informationDensity / n,
      );
      userAvgFactors.selfContainment = Math.round(
        userAvgFactors.selfContainment / n,
      );
      userAvgFactors.factualSpecificity = Math.round(
        userAvgFactors.factualSpecificity / n,
      );
      userAvgFactors.structuralClarity = Math.round(
        userAvgFactors.structuralClarity / n,
      );

      if (userAvgFactors.informationDensity < 14) {
        gaps.push(
          "Low information density — add more specific data, statistics, and technical details to your paragraphs",
        );
      } else if (userAvgFactors.informationDensity >= 20) {
        strengths.push("High information density with rich data points");
      }

      if (userAvgFactors.selfContainment < 12) {
        gaps.push(
          "Paragraphs lack self-containment — rewrite so each paragraph stands alone as a citable snippet without needing context",
        );
      } else if (userAvgFactors.selfContainment >= 18) {
        strengths.push(
          "Paragraphs are well self-contained and can stand alone as citations",
        );
      }

      if (userAvgFactors.factualSpecificity < 10) {
        gaps.push(
          "Low factual specificity — add citations, comparisons, evidence, and concrete examples",
        );
      } else if (userAvgFactors.factualSpecificity >= 18) {
        strengths.push(
          "Strong factual specificity with evidence and concrete examples",
        );
      }

      if (userAvgFactors.structuralClarity < 12) {
        gaps.push(
          "Structural clarity is weak — use definition patterns, direct answer formats, and proper paragraph sizing",
        );
      } else if (userAvgFactors.structuralClarity >= 18) {
        strengths.push(
          "Strong structural clarity with definition patterns and direct answers",
        );
      }
    }
  }

  // Structural checks on the user's page HTML
  if (userHtml) {
    if (!hasStructuredData(userHtml)) {
      gaps.push(
        "Missing structured data (JSON-LD) — add Schema.org markup to help AI engines understand your content",
      );
    } else {
      strengths.push("Page includes structured data (JSON-LD)");
    }

    if (!hasProperHeadings(userHtml)) {
      gaps.push(
        "Heading hierarchy is weak — ensure you have one H1 and multiple H2 sub-headings to structure your content",
      );
    } else {
      strengths.push("Proper heading hierarchy with H1 and H2 sub-headings");
    }
  }

  // Edge case: no content could be scored
  if (!userAnalysis || userAnalysis.paragraphs.length === 0) {
    gaps.push(
      "Could not extract scorable paragraphs from your page — ensure content is in semantic <p> tags within <main> or <article>",
    );
  }

  // If there's an AI Overview but user is not cited
  if (hasAIOverview && !userIsCited) {
    gaps.push(
      "Your page is not currently cited in the AI Overview for this query",
    );
  }

  if (userIsCited) {
    strengths.push(
      "Your page is already cited in the AI Overview for this query",
    );
  }

  return {
    query,
    userUrl,
    userDomain,
    userParagraphScore,
    hasAIOverview,
    userIsCited,
    competitors,
    gaps,
    strengths,
    timestamp: new Date().toISOString(),
  };
}
