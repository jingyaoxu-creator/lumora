import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { simulateCitation } from "@/lib/citation-simulator";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const access = await checkFeatureAccess("citation-sim");
    if (!access.allowed) return denyResponse(access, "引用模拟");

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
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
        { error: `Failed to fetch URL: ${pageRes.status} ${pageRes.statusText}` },
        { status: 422 },
      );
    }

    const html = await pageRes.text();

    // Extract page title and body text with cheerio
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    const pageTitle =
      $("title").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      "";

    const content = $("body").text().replace(/\s+/g, " ").trim();

    if (!content) {
      return NextResponse.json(
        { error: "Could not extract any text content from the page" },
        { status: 422 },
      );
    }

    const result = await simulateCitation(
      { url, pageTitle, content, query },
      apiKey,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Citation simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
