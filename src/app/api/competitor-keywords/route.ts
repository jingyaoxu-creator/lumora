import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

/* ─── Helpers ─── */

interface SerperResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperResult[];
}

/** Common stop-words to filter out from keyword extraction */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "was", "are", "be",
  "this", "that", "which", "who", "what", "how", "why", "when", "where",
  "not", "no", "do", "does", "did", "has", "have", "had", "will", "would",
  "can", "could", "should", "may", "might", "so", "if", "then", "than",
  "its", "my", "your", "our", "their", "his", "her", "we", "you", "they",
  "i", "me", "us", "him", "them", "all", "each", "every", "both", "few",
  "more", "most", "other", "some", "such", "only", "own", "same", "just",
  "also", "very", "about", "up", "out", "into", "over", "after", "before",
  "between", "under", "again", "further", "once", "here", "there", "any",
  "new", "one", "two", "first", "last", "get", "got", "been", "being",
]);

/**
 * Extract meaningful keywords from an array of search results.
 * Splits titles and snippets by common separators, lowercases, deduplicates.
 */
function extractKeywords(results: SerperResult[]): Set<string> {
  const keywords = new Set<string>();

  for (const r of results) {
    const text = [r.title ?? "", r.snippet ?? ""].join(" ");
    const tokens = text
      .toLowerCase()
      .split(/[\s\-|•·,.:;!?()[\]{}"'`/\\@#$%^&*+=<>~_]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

    for (const token of tokens) {
      keywords.add(token);
    }
  }

  return keywords;
}

/** Fetch top pages from Serper for a given site query */
async function fetchSitePages(query: string): Promise<SerperResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 30 }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data: SerperResponse = await res.json();
  return (data.organic ?? []).map((r) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    snippet: r.snippet ?? "",
  }));
}

/* ─── POST handler ─── */

/** POST — on-demand competitor keyword comparison */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan
  const access = await checkFeatureAccess("competitor-keywords");
  if (!access.allowed) return denyResponse(access, "Competitor Keywords");

  const body = await req.json();
  const domain = body.domain?.trim();
  const competitorDomain = body.competitorDomain?.trim();

  if (!domain || !competitorDomain) {
    return NextResponse.json(
      { error: "Both domain and competitorDomain are required" },
      { status: 400 },
    );
  }

  try {
    // Fetch top pages for both domains in parallel
    const [userPages, competitorPages] = await Promise.all([
      fetchSitePages(`site:${domain}`),
      fetchSitePages(`site:${competitorDomain}`),
    ]);

    // Extract keywords from both result sets
    const userKeywords = extractKeywords(userPages);
    const competitorKeywords = extractKeywords(competitorPages);

    // Categorize
    const shared: string[] = [];
    const uniqueToUser: string[] = [];
    const uniqueToCompetitor: string[] = [];

    for (const kw of userKeywords) {
      if (competitorKeywords.has(kw)) {
        shared.push(kw);
      } else {
        uniqueToUser.push(kw);
      }
    }

    for (const kw of competitorKeywords) {
      if (!userKeywords.has(kw)) {
        uniqueToCompetitor.push(kw);
      }
    }

    // Sort all arrays alphabetically
    shared.sort();
    uniqueToUser.sort();
    uniqueToCompetitor.sort();

    return NextResponse.json({
      domain,
      competitorDomain,
      shared,
      uniqueToUser,
      uniqueToCompetitor,
      userPages,
      competitorPages,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
