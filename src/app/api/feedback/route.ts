import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — list feedback posts, ordered by votes desc */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  let query = supabase
    .from("feedback_posts")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get current user's votes
  const { data: { user } } = await supabase.auth.getUser();
  let votedPostIds: string[] = [];
  if (user) {
    const { data: votes } = await supabase
      .from("feedback_votes")
      .select("post_id")
      .eq("user_id", user.id);
    votedPostIds = (votes ?? []).map((v) => v.post_id);
  }

  return NextResponse.json({
    posts: data ?? [],
    votedPostIds,
    userId: user?.id ?? null,
  });
}

/** POST — create a new feedback post */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await req.json();
  const title = (body.title as string)?.trim();
  const content = (body.content as string)?.trim();
  const category = body.category as string;

  if (!title || title.length < 2 || title.length > 100) {
    return NextResponse.json({ error: "标题需要 2-100 个字符" }, { status: 400 });
  }
  if (!content || content.length < 5 || content.length > 2000) {
    return NextResponse.json({ error: "内容需要 5-2000 个字符" }, { status: 400 });
  }
  if (!["feature", "improvement", "bug"].includes(category)) {
    return NextResponse.json({ error: "无效的分类" }, { status: 400 });
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  const { data, error } = await supabase
    .from("feedback_posts")
    .insert({
      user_id: user.id,
      author_name: displayName,
      title,
      content,
      category,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** DELETE — delete a post (admin only via service role, or post author) */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }

  // Check if user is the author or an admin
  const { data: post } = await supabase
    .from("feedback_posts")
    .select("user_id")
    .eq("id", id)
    .single();

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  if (!post || (post.user_id !== user.id && !isAdmin)) {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }

  await supabase.from("feedback_posts").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
