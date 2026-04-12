import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { runSEOChecks } from "@/lib/seo-checks";
import { runGEOChecks } from "@/lib/geo-checks";
import type { AnalysisResult, CheckResult } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url } = body as { url: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
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

    // Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LumoraBot/1.0; +https://lumora.dev)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
    } catch (err) {
      clearTimeout(timeout);
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out (15s). The site may be slow or unreachable."
          : `Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown error"}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Site returned HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Collect response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Run checks
    const seoChecks = runSEOChecks($, url, headers);
    const geoChecks = runGEOChecks($);

    // Calculate scores
    const seoScore = calcScore(seoChecks);
    const geoScore = calcScore(geoChecks);
    const overallScore = Math.round(seoScore * 0.55 + geoScore * 0.45);

    const pageTitle = $("title").first().text().trim() || "Untitled";
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || "";

    const result: AnalysisResult = {
      url,
      timestamp: new Date().toISOString(),
      pageTitle,
      metaDescription,
      seoScore,
      geoScore,
      overallScore,
      seoChecks,
      geoChecks,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Internal analysis error. Please try again." },
      { status: 500 }
    );
  }
}

function calcScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const total = checks.reduce((sum, c) => sum + c.score, 0);
  return Math.round(total / checks.length);
}
