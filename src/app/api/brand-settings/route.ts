import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BrandSettings } from "@/lib/brand-types";
import { DEFAULT_BRAND } from "@/lib/brand-types";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

/** GET — fetch current brand settings */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("brand_settings, plan")
    .eq("id", user.id)
    .single();

  if (!data || data.plan === "free") {
    return NextResponse.json(DEFAULT_BRAND);
  }

  return NextResponse.json({ ...DEFAULT_BRAND, ...(data.brand_settings as Partial<BrandSettings> | null) });
}

/** POST — update brand settings (Pro/Team only) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan — branding requires Business
  const access = await checkFeatureAccess("brand-settings");
  if (!access.allowed) return denyResponse(access, "品牌化报告");

  const body = await req.json();
  const settings: BrandSettings = {
    brandName: (body.brandName ?? "Lumora").slice(0, 50),
    brandColor: /^#[0-9a-fA-F]{6}$/.test(body.brandColor) ? body.brandColor : "#7850DC",
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : null,
  };

  await supabase
    .from("profiles")
    .update({ brand_settings: settings, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json(settings);
}
