import { NextRequest, NextResponse } from "next/server";
import { crawlSite } from "@/lib/site-crawl";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 120; // 2 minutes for multi-page crawl

export async function POST(req: NextRequest) {
  try {
    const access = await checkFeatureAccess("crawl");
    if (!access.allowed) return denyResponse(access, "多页爬取");

    const { url, maxPages } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 },
      );
    }

    const limit = Math.min(Math.max(Number(maxPages) || 10, 1), 20);
    const result = await crawlSite(url, limit);

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Site crawl failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
