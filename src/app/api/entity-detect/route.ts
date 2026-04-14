import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { detectEntities } from "@/lib/entity-detector";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const access = await checkFeatureAccess("entity-detect");
    if (!access.allowed) return denyResponse(access, "实体图谱检测");

    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 },
      );
    }

    // Fetch the target URL
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Lumora/1.0; +https://lumora.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${pageRes.status} ${pageRes.statusText}`,
        },
        { status: 422 },
      );
    }

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const result = await detectEntities($, html);

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Entity detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
