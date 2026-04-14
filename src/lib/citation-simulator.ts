/**
 * AI Citation Simulator
 *
 * Sends page content to Claude and asks it to evaluate:
 * 1. Would it cite this page for a given query?
 * 2. Which specific paragraphs would it cite?
 * 3. What's missing that would make it more citable?
 */

export interface CitationSimulation {
  query: string;
  wouldCite: boolean;
  confidence: number; // 0-100
  citedParagraphs: {
    text: string;
    reason: string;
  }[];
  missingFactors: string[];
  improvementSuggestions: string[];
  competitiveEdge: string;
}

export interface SimulationRequest {
  url: string;
  pageTitle: string;
  content: string; // extracted text
  query: string;
}

/**
 * Run citation simulation via Claude API.
 * Returns structured analysis of citability.
 */
export async function simulateCitation(
  req: SimulationRequest,
  apiKey: string,
): Promise<CitationSimulation> {
  // Truncate content to ~4000 chars to manage token usage
  const truncated = req.content.slice(0, 4000);

  const systemPrompt = `You are an AI search engine evaluator. You analyze web page content and determine whether you would cite it as a source when answering a user's search query.

Evaluate strictly based on:
1. Relevance to the query
2. Information density and specificity (concrete data, numbers, facts)
3. Self-contained paragraphs that can stand alone as citations
4. Authority signals (expert language, citations, methodology)
5. Freshness and uniqueness of information

Respond in valid JSON only, no markdown.`;

  const userPrompt = `Page URL: ${req.url}
Page Title: ${req.pageTitle}

User Search Query: "${req.query}"

Page Content:
---
${truncated}
---

Evaluate this page's citability for the given query. Return JSON:
{
  "wouldCite": boolean,
  "confidence": number (0-100),
  "citedParagraphs": [{"text": "exact quote from content (max 80 chars)", "reason": "why this is citable"}],
  "missingFactors": ["what's missing that would make this more citable"],
  "improvementSuggestions": ["specific actionable suggestions"],
  "competitiveEdge": "one sentence on what would make this page THE go-to source for this query"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text);
    return {
      query: req.query,
      wouldCite: !!parsed.wouldCite,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      citedParagraphs: Array.isArray(parsed.citedParagraphs)
        ? parsed.citedParagraphs.slice(0, 5)
        : [],
      missingFactors: Array.isArray(parsed.missingFactors)
        ? parsed.missingFactors.slice(0, 5)
        : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
        ? parsed.improvementSuggestions.slice(0, 5)
        : [],
      competitiveEdge: parsed.competitiveEdge ?? "",
    };
  } catch {
    return {
      query: req.query,
      wouldCite: false,
      confidence: 0,
      citedParagraphs: [],
      missingFactors: ["Failed to parse AI response"],
      improvementSuggestions: [],
      competitiveEdge: "",
    };
  }
}
