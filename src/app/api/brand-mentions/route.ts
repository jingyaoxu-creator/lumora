import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

/* ─── Serper.dev search helper ─── */

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
}

async function searchSerper(term: string): Promise<SerperOrganicResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not configured");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: `"${term}"`, num: 20 }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.organic ?? []) as SerperOrganicResult[];
}

/* ─── Insert mentions from search results ─── */

async function insertMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  term: string,
  results: SerperOrganicResult[],
  excludeDomain?: string,
) {
  const inserted: Array<{
    source_url: string;
    source_domain: string;
    title: string;
    snippet: string;
  }> = [];

  for (const result of results) {
    let domain: string;
    try {
      domain = new URL(result.link).hostname;
    } catch {
      continue;
    }

    // Skip excluded domain
    if (excludeDomain && domain.replace("www.", "") === excludeDomain.replace("www.", "")) {
      continue;
    }

    const row = {
      user_id: userId,
      brand_term: term,
      source_url: result.link,
      source_domain: domain,
      title: result.title,
      snippet: result.snippet,
    };

    const { error } = await supabase.from("brand_mentions").upsert(row, {
      onConflict: "user_id,brand_term,source_url",
      ignoreDuplicates: true,
    });

    if (!error) {
      inserted.push(row);
    }
  }

  return inserted;
}

/* ─── GET — list user's brand terms + recent mentions ─── */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: terms, error: termsError } = await supabase
    .from("brand_terms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (termsError) {
    return NextResponse.json({ error: termsError.message }, { status: 500 });
  }

  // For each term, fetch recent mentions
  const allMentions: Record<string, unknown>[] = [];
  for (const term of terms ?? []) {
    const { data: mentions } = await supabase
      .from("brand_mentions")
      .select("*")
      .eq("user_id", user.id)
      .eq("brand_term", term.term)
      .order("found_at", { ascending: false })
      .limit(20);

    if (mentions) {
      allMentions.push(...mentions);
    }
  }

  return NextResponse.json({ terms: terms ?? [], mentions: allMentions });
}

/* ─── POST — add a brand term or refresh mentions ─── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan
  const access = await checkFeatureAccess("brand-mentions");
  if (!access.allowed) return denyResponse(access, "Brand Mentions");

  const body = await req.json();
  const action = body.action;

  /* ── action: "add-term" ── */
  if (action === "add-term") {
    const term = body.term?.trim();
    if (!term) {
      return NextResponse.json({ error: "Brand term is required" }, { status: 400 });
    }

    const excludeDomain = body.excludeDomain?.trim() || undefined;

    // Insert brand term
    const { data: newTerm, error: insertError } = await supabase
      .from("brand_terms")
      .insert({
        user_id: user.id,
        term,
        exclude_domain: excludeDomain ?? null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This brand term is already being tracked" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Immediately search via Serper
    try {
      const results = await searchSerper(term);
      const mentions = await insertMentions(supabase, user.id, term, results, excludeDomain);
      return NextResponse.json({ term: newTerm, mentions }, { status: 201 });
    } catch (err) {
      // Term was added but search failed — still return the term
      return NextResponse.json(
        {
          term: newTerm,
          mentions: [],
          warning: err instanceof Error ? err.message : "Search failed",
        },
        { status: 201 },
      );
    }
  }

  /* ── action: "refresh" ── */
  if (action === "refresh") {
    const term = body.term?.trim();
    if (!term) {
      return NextResponse.json({ error: "Brand term is required" }, { status: 400 });
    }

    // Look up the term to get excludeDomain
    const { data: existingTerm } = await supabase
      .from("brand_terms")
      .select("*")
      .eq("user_id", user.id)
      .eq("term", term)
      .single();

    if (!existingTerm) {
      return NextResponse.json({ error: "Brand term not found" }, { status: 404 });
    }

    try {
      const results = await searchSerper(term);
      const mentions = await insertMentions(
        supabase,
        user.id,
        term,
        results,
        existingTerm.exclude_domain ?? undefined,
      );

      // Return all mentions for this term (including previously found ones)
      const { data: allMentions } = await supabase
        .from("brand_mentions")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_term", term)
        .order("found_at", { ascending: false })
        .limit(20);

      return NextResponse.json({ mentions: allMentions ?? [], newCount: mentions.length });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Search failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/* ─── DELETE — remove a brand term and its mentions ─── */

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
    return NextResponse.json({ error: "Brand term ID required" }, { status: 400 });
  }

  // Get the term text before deleting so we can clean up mentions
  const { data: term } = await supabase
    .from("brand_terms")
    .select("term")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!term) {
    return NextResponse.json({ error: "Brand term not found" }, { status: 404 });
  }

  // Delete mentions for this term
  await supabase
    .from("brand_mentions")
    .delete()
    .eq("user_id", user.id)
    .eq("brand_term", term.term);

  // Delete the term itself
  await supabase
    .from("brand_terms")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
