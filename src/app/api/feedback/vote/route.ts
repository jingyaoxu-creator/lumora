import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST — toggle vote on a feedback post */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  // Check if already voted
  const { data: existing } = await supabase
    .from("feedback_votes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    // Remove vote
    const { error: delErr } = await supabase
      .from("feedback_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { error: rpcErr } = await supabase.rpc("decrement_vote_count", { post_id_input: postId });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({ voted: false });
  } else {
    // Add vote
    const { error: insErr } = await supabase
      .from("feedback_votes")
      .insert({ user_id: user.id, post_id: postId });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { error: rpcErr } = await supabase.rpc("increment_vote_count", { post_id_input: postId });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({ voted: true });
  }
}
