import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/scan-history
 *
 * Returns the authenticated user's scan history.
 * Query params:
 *   url    – filter by exact URL (optional)
 *   domain – filter by domain substring (optional)
 *   limit  – max rows, default 100
 *   offset – pagination offset, default 0
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const params = req.nextUrl.searchParams;
  const urlFilter = params.get("url");
  const domainFilter = params.get("domain");
  const limit = Math.min(parseInt(params.get("limit") ?? "100"), 500);
  const offset = parseInt(params.get("offset") ?? "0");

  let query = supabase
    .from("scan_history")
    .select("id, url, page_title, seo_score, geo_score, overall_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (urlFilter) {
    query = query.eq("url", urlFilter);
  } else if (domainFilter) {
    query = query.ilike("url", `%${domainFilter}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also get unique URLs for the filter dropdown
  const { data: urlsData } = await supabase
    .from("scan_history")
    .select("url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const uniqueUrls = [...new Set((urlsData ?? []).map((r) => r.url))];

  return NextResponse.json({ scans: data ?? [], urls: uniqueUrls });
}
