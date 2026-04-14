import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

/** GET — list user's monitored sites */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("monitored_sites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** POST — add a new monitored site */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan — monitoring requires Pro
  const access = await checkFeatureAccess("monitors");
  if (!access.allowed) return denyResponse(access, "站点监控");

  const body = await req.json();
  let url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  let domain: string;
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Check limit (max 10 monitored sites)
  const { count } = await supabase
    .from("monitored_sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Maximum 10 monitored sites per account" },
      { status: 400 },
    );
  }

  const frequency = body.frequency === "daily" ? "daily" : "weekly";
  const notifyOnDrop = body.notifyOnDrop !== false;
  const dropThreshold = Math.max(1, Math.min(50, Number(body.dropThreshold) || 5));

  const { data, error } = await supabase
    .from("monitored_sites")
    .insert({
      user_id: user.id,
      url,
      domain,
      frequency,
      notify_on_drop: notifyOnDrop,
      drop_threshold: dropThreshold,
      last_score: null,
      last_scanned_at: null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This site is already being monitored" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/** DELETE — remove a monitored site */
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
    return NextResponse.json({ error: "Monitor ID required" }, { status: 400 });
  }

  await supabase
    .from("monitored_sites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
