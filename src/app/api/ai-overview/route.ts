import { NextRequest, NextResponse } from "next/server";
import { trackAIOverviews } from "@/lib/ai-overview-tracker";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 60;

/**
 * POST — check if a domain appears in Google AI Overviews for given queries.
 * Body: { domain: string, queries: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const access = await checkFeatureAccess("ai-overview");
    if (!access.allowed) return denyResponse(access, "AI Overview 追踪");

    const { domain, queries } = await req.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'domain' field" },
        { status: 400 },
      );
    }

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one search query" },
        { status: 400 },
      );
    }

    // Limit to 20 queries per request
    const limitedQueries = queries.slice(0, 20).map((q: unknown) => String(q).trim()).filter(Boolean);

    if (limitedQueries.length === 0) {
      return NextResponse.json(
        { error: "No valid queries provided" },
        { status: 400 },
      );
    }

    const result = await trackAIOverviews(domain, limitedQueries);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI Overview tracking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
