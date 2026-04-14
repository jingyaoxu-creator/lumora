import { NextRequest, NextResponse } from "next/server";
import { scanSite } from "@/lib/scan-site";
import type { AnalysisResult } from "@/lib/types";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 60;

/**
 * POST /api/compare
 * Body: { urls: string[] }  (2-3 URLs)
 * Returns: { results: (AnalysisResult | { url: string; error: string })[] }
 */
export async function POST(req: NextRequest) {
  const access = await checkFeatureAccess("compare");
  if (!access.allowed) return denyResponse(access, "多站对比");

  const body = await req.json();
  const urls: string[] = body.urls;

  if (!Array.isArray(urls) || urls.length < 2 || urls.length > 3) {
    return NextResponse.json(
      { error: "Provide 2 or 3 URLs to compare" },
      { status: 400 },
    );
  }

  // Scan all URLs in parallel
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        return await scanSite(url);
      } catch (err) {
        return {
          url,
          error: err instanceof Error ? err.message : "Scan failed",
        };
      }
    }),
  );

  return NextResponse.json({ results });
}
