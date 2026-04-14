import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitorCitations } from "@/lib/competitor-citation";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const access = await checkFeatureAccess("competitor-citation");
    if (!access.allowed) return denyResponse(access, "竞品引用分析");

    const { url, query } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 },
      );
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 },
      );
    }

    if (!process.env.SERPER_API_KEY) {
      return NextResponse.json(
        { error: "SERPER_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const result = await analyzeCompetitorCitations(url, query);

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Competitor citation analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
