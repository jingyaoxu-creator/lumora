import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — check if current user is admin */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false });
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  return NextResponse.json({ isAdmin });
}
