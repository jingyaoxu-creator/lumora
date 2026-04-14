import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

/** GET — list user's tracked keywords + latest rank for each */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: keywords, error } = await supabase
    .from("tracked_keywords")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!keywords || keywords.length === 0) {
    return NextResponse.json([]);
  }

  // For each keyword, fetch the latest 2 rank_history entries to compute trend
  const results = await Promise.all(
    keywords.map(async (kw) => {
      const { data: history } = await supabase
        .from("rank_history")
        .select("*")
        .eq("tracked_keyword_id", kw.id)
        .order("checked_at", { ascending: false })
        .limit(2);

      const latest = history?.[0] ?? null;
      const previous = history?.[1] ?? null;

      let trend: "up" | "down" | "stable" | null = null;
      if (latest && previous) {
        if (latest.position < previous.position) {
          trend = "up"; // rank improved (lower number = better)
        } else if (latest.position > previous.position) {
          trend = "down";
        } else {
          trend = "stable";
        }
      }

      return {
        id: kw.id,
        domain: kw.domain,
        keyword: kw.keyword,
        created_at: kw.created_at,
        latestPosition: latest?.position ?? null,
        latestUrl: latest?.url ?? null,
        latestCheckedAt: latest?.checked_at ?? null,
        trend,
      };
    }),
  );

  return NextResponse.json(results);
}

/** POST — add a tracked keyword and immediately check rank */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan — rank tracking requires Pro
  const access = await checkFeatureAccess("rank-tracking");
  if (!access.allowed) return denyResponse(access, "Rank Tracking");

  const body = await req.json();
  const domain = body.domain?.trim();
  const keyword = body.keyword?.trim();

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }
  if (!keyword) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }

  // Normalize domain — strip protocol and www
  let normalizedDomain = domain;
  try {
    if (domain.startsWith("http://") || domain.startsWith("https://")) {
      normalizedDomain = new URL(domain).hostname.replace(/^www\./, "");
    } else {
      normalizedDomain = domain.replace(/^www\./, "").split("/")[0];
    }
  } catch {
    // keep as-is if parsing fails
  }

  // Insert tracked keyword
  const { data: tracked, error: insertError } = await supabase
    .from("tracked_keywords")
    .insert({
      user_id: user.id,
      domain: normalizedDomain,
      keyword,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This keyword is already being tracked for this domain" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  // Immediately check rank via Serper.dev API
  let rankData: {
    position: number | null;
    url: string | null;
    title: string | null;
    snippet: string | null;
  } = { position: null, url: null, title: null, snippet: null };

  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const serperRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: keyword, num: 100 }),
      });

      if (serperRes.ok) {
        const serperData = await serperRes.json();
        const organic: Array<{
          position: number;
          link: string;
          title: string;
          snippet: string;
        }> = serperData.organic ?? [];

        // Find where the domain appears in organic results
        const match = organic.find((result) => {
          try {
            const resultHost = new URL(result.link).hostname.replace(
              /^www\./,
              "",
            );
            return resultHost.includes(normalizedDomain);
          } catch {
            return false;
          }
        });

        if (match) {
          rankData = {
            position: match.position,
            url: match.link,
            title: match.title,
            snippet: match.snippet,
          };
        }
      }
    } catch {
      // Serper call failed — we still created the keyword, just no rank data
    }
  }

  // Insert rank_history row
  const { error: historyError } = await supabase.from("rank_history").insert({
    tracked_keyword_id: tracked.id,
    position: rankData.position,
    url: rankData.url,
    title: rankData.title,
    snippet: rankData.snippet,
  });

  if (historyError) {
    // Non-fatal — keyword is still tracked, just no initial rank
    console.error("Failed to insert rank_history:", historyError.message);
  }

  return NextResponse.json(
    {
      ...tracked,
      latestPosition: rankData.position,
      latestUrl: rankData.url,
      latestCheckedAt: new Date().toISOString(),
      trend: null,
    },
    { status: 201 },
  );
}

/** DELETE — remove a tracked keyword (cascade deletes rank_history) */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json(
      { error: "Tracked keyword ID required" },
      { status: 400 },
    );
  }

  await supabase
    .from("tracked_keywords")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
