import { NextResponse } from "next/server";
import { scanSite } from "@/lib/scan-site";
import { createClient } from "@/lib/supabase/server";
import { checkScanLimit } from "@/lib/plan-limits";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url } = body as { url: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Check daily scan limit
    const limit = await checkScanLimit();
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "已达每日扫描上限，请升级套餐解锁无限扫描。", code: "scan_limit_reached" },
        { status: 429 },
      );
    }

    // Normalize URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    let result;
    try {
      result = await scanSite(url);
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out (15s). The site may be slow or unreachable."
          : `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Save scan to history if user is authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: insertError } = await supabase.from("scan_history").insert({
          user_id: user.id,
          url,
          page_title: result.pageTitle,
          seo_score: result.seoScore,
          geo_score: result.geoScore,
          overall_score: result.overallScore,
          results: result,
        });
        if (insertError) {
          console.error("[scan_history] insert failed:", insertError.message);
        }
      }
    } catch (err) {
      console.error("[scan_history] unexpected error:", err);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Internal analysis error. Please try again." },
      { status: 500 }
    );
  }
}
