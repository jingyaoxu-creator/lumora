import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return user.email === process.env.ADMIN_EMAIL;
}

/** PATCH — update post status (admin only) */
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await req.json();
  if (!id || !["open", "planned", "in_progress", "done", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }

  await admin.from("feedback_posts").update({ status }).eq("id", id);

  return NextResponse.json({ success: true });
}

/** DELETE — delete post (admin only) */
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }

  // Delete votes first, then post
  await admin.from("feedback_votes").delete().eq("post_id", id);
  await admin.from("feedback_posts").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
