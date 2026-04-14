import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

interface CitationRow {
  query: string;
  checked_at: string;
  has_ai_overview: boolean;
  is_cited: boolean;
  position: number | null;
  total_sources: number;
  organic_position: number | null;
  snippet: string | null;
}

/** GET — fetch citation history for a domain */
export async function GET(req: NextRequest) {
  const access = await checkFeatureAccess("citation-tracking");
  if (!access.allowed) return denyResponse(access, "引用趋势追踪");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));

  if (!domain) {
    return NextResponse.json(
      { error: "domain query parameter is required" },
      { status: 400 },
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: rows, error } = await supabase
    .from("citation_tracking")
    .select("query, checked_at, has_ai_overview, is_cited, position, total_sources, organic_position, snippet")
    .eq("user_id", user.id)
    .eq("domain", domain)
    .gte("checked_at", since.toISOString())
    .order("checked_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const typedRows = (rows ?? []) as CitationRow[];

  // Group by query
  const grouped = new Map<string, CitationRow[]>();
  for (const row of typedRows) {
    const existing = grouped.get(row.query) ?? [];
    existing.push(row);
    grouped.set(row.query, existing);
  }

  let totalChecks = 0;
  let totalCited = 0;

  const queries = Array.from(grouped.entries()).map(([query, history]) => {
    const citedCount = history.filter((h) => h.is_cited).length;
    const withOverview = history.filter((h) => h.has_ai_overview).length;
    totalChecks += history.length;
    totalCited += citedCount;

    // Determine current status from the most recent check
    const latest = history[history.length - 1];
    let currentStatus: "cited" | "not_cited" | "no_overview" = "no_overview";
    if (latest) {
      if (!latest.has_ai_overview) {
        currentStatus = "no_overview";
      } else if (latest.is_cited) {
        currentStatus = "cited";
      } else {
        currentStatus = "not_cited";
      }
    }

    const citationRate =
      withOverview > 0 ? Math.round((citedCount / withOverview) * 100) : 0;

    return {
      query,
      history: history.map((h) => ({
        checkedAt: h.checked_at,
        isCited: h.is_cited,
        position: h.position,
        hasAIOverview: h.has_ai_overview,
        totalSources: h.total_sources,
        organicPosition: h.organic_position,
        snippet: h.snippet,
      })),
      currentStatus,
      citationRate,
    };
  });

  const overallCitationRate =
    totalChecks > 0 ? Math.round((totalCited / totalChecks) * 100) : 0;

  return NextResponse.json({
    domain,
    queries,
    overallCitationRate,
    totalChecks,
  });
}

/** POST — add a query to track for a domain */
export async function POST(req: NextRequest) {
  const access = await checkFeatureAccess("citation-tracking");
  if (!access.allowed) return denyResponse(access, "引用趋势追踪");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const domain = body.domain?.trim()?.toLowerCase();
  const query = body.query?.trim();

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // Find the monitored site for this domain
  const { data: site, error: siteError } = await supabase
    .from("monitored_sites")
    .select("id, tracked_queries")
    .eq("user_id", user.id)
    .eq("domain", domain)
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "No monitored site found for this domain. Add it to monitoring first." },
      { status: 404 },
    );
  }

  const existingQueries: string[] = site.tracked_queries ?? [];

  // Check if query already exists
  if (existingQueries.includes(query)) {
    return NextResponse.json(
      { error: "This query is already being tracked" },
      { status: 409 },
    );
  }

  // Max 10 queries per domain
  if (existingQueries.length >= 10) {
    return NextResponse.json(
      { error: "Maximum 10 tracked queries per domain" },
      { status: 400 },
    );
  }

  const updatedQueries = [...existingQueries, query];

  const { error: updateError } = await supabase
    .from("monitored_sites")
    .update({ tracked_queries: updatedQueries })
    .eq("id", site.id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, tracked_queries: updatedQueries },
    { status: 201 },
  );
}

/** DELETE — remove a tracked query from a domain */
export async function DELETE(req: NextRequest) {
  const access = await checkFeatureAccess("citation-tracking");
  if (!access.allowed) return denyResponse(access, "引用趋势追踪");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const domain = body.domain?.trim()?.toLowerCase();
  const query = body.query?.trim();

  if (!domain || !query) {
    return NextResponse.json(
      { error: "domain and query are required" },
      { status: 400 },
    );
  }

  const { data: site, error: siteError } = await supabase
    .from("monitored_sites")
    .select("id, tracked_queries")
    .eq("user_id", user.id)
    .eq("domain", domain)
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "No monitored site found for this domain" },
      { status: 404 },
    );
  }

  const existingQueries: string[] = site.tracked_queries ?? [];
  const updatedQueries = existingQueries.filter((q) => q !== query);

  const { error: updateError } = await supabase
    .from("monitored_sites")
    .update({ tracked_queries: updatedQueries })
    .eq("id", site.id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tracked_queries: updatedQueries });
}
