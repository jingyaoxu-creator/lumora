/**
 * AI Overview Tracker — checks if a domain appears in Google's AI Overview
 * for given search queries.
 *
 * Uses Serper.dev API (SERPER_API_KEY env var).
 * Free tier: 2,500 searches/month. $50/month: 50,000 searches.
 */

export interface AIOverviewResult {
  query: string;
  hasAIOverview: boolean;
  domainCited: boolean;
  citedUrl: string | null;
  position: number | null; // Position in AI Overview sources (1-based)
  totalSources: number;
  topOrganicPosition: number | null; // Position in regular organic results
  snippet: string | null;
}

export interface AIOverviewSummary {
  domain: string;
  queries: AIOverviewResult[];
  stats: {
    totalQueries: number;
    queriesWithAIO: number;
    domainCitedCount: number;
    citationRate: number; // 0-100%
    avgSourcePosition: number | null;
    avgOrganicPosition: number | null;
  };
  timestamp: string;
}

interface SerperResponse {
  aiOverview?: {
    text?: string;
    sources?: {
      title: string;
      link: string;
      snippet: string;
    }[];
  };
  organic?: {
    title: string;
    link: string;
    snippet: string;
    position: number;
  }[];
  searchParameters?: {
    q: string;
  };
}

/**
 * Check multiple queries for AI Overview presence and domain citation.
 */
export async function trackAIOverviews(
  domain: string,
  queries: string[],
): Promise<AIOverviewSummary> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not configured. Set it in your environment to enable AI Overview tracking.",
    );
  }

  // Normalize domain
  const normalizedDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const results: AIOverviewResult[] = [];

  // Query Serper API for each query (in batches of 5)
  for (let i = 0; i < queries.length; i += 5) {
    const batch = queries.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map((q) => querySerpAPI(apiKey, q, normalizedDomain)),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
  }

  // Calculate stats
  const queriesWithAIO = results.filter((r) => r.hasAIOverview).length;
  const domainCitedCount = results.filter((r) => r.domainCited).length;
  const citedResults = results.filter((r) => r.position !== null);
  const organicResults = results.filter((r) => r.topOrganicPosition !== null);

  return {
    domain: normalizedDomain,
    queries: results,
    stats: {
      totalQueries: results.length,
      queriesWithAIO,
      domainCitedCount,
      citationRate:
        queriesWithAIO > 0
          ? Math.round((domainCitedCount / queriesWithAIO) * 100)
          : 0,
      avgSourcePosition:
        citedResults.length > 0
          ? Math.round(
              (citedResults.reduce((s, r) => s + (r.position ?? 0), 0) /
                citedResults.length) *
                10,
            ) / 10
          : null,
      avgOrganicPosition:
        organicResults.length > 0
          ? Math.round(
              (organicResults.reduce(
                (s, r) => s + (r.topOrganicPosition ?? 0),
                0,
              ) /
                organicResults.length) *
                10,
            ) / 10
          : null,
    },
    timestamp: new Date().toISOString(),
  };
}

async function querySerpAPI(
  apiKey: string,
  query: string,
  domain: string,
): Promise<AIOverviewResult> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "us",
      hl: "en",
      num: 10,
    }),
  });

  if (!res.ok) {
    return {
      query,
      hasAIOverview: false,
      domainCited: false,
      citedUrl: null,
      position: null,
      totalSources: 0,
      topOrganicPosition: null,
      snippet: null,
    };
  }

  const data: SerperResponse = await res.json();

  const hasAIOverview = !!(
    data.aiOverview?.text || (data.aiOverview?.sources && data.aiOverview.sources.length > 0)
  );

  let domainCited = false;
  let citedUrl: string | null = null;
  let position: number | null = null;
  let snippet: string | null = null;
  const totalSources = data.aiOverview?.sources?.length ?? 0;

  if (data.aiOverview?.sources) {
    for (let i = 0; i < data.aiOverview.sources.length; i++) {
      const source = data.aiOverview.sources[i];
      try {
        const sourceHost = new URL(source.link).hostname
          .replace("www.", "")
          .toLowerCase();
        if (sourceHost.includes(domain) || domain.includes(sourceHost)) {
          domainCited = true;
          citedUrl = source.link;
          position = i + 1;
          snippet = source.snippet ?? null;
          break;
        }
      } catch {
        // Invalid URL
      }
    }
  }

  // Find organic position
  let topOrganicPosition: number | null = null;
  if (data.organic) {
    for (const result of data.organic) {
      try {
        const resultHost = new URL(result.link).hostname
          .replace("www.", "")
          .toLowerCase();
        if (resultHost.includes(domain) || domain.includes(resultHost)) {
          topOrganicPosition = result.position;
          break;
        }
      } catch {
        // Invalid URL
      }
    }
  }

  return {
    query,
    hasAIOverview,
    domainCited,
    citedUrl,
    position,
    totalSources,
    topOrganicPosition,
    snippet,
  };
}
