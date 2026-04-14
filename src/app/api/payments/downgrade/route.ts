import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIER_ORDER = ["free", "pro", "business"];
const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 999999, business: 999999 };

/**
 * POST — downgrade the user's plan.
 * Downgrades are immediate (no proration).
 * In production, this should also cancel the subscription via the payment provider.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan: targetPlan } = await req.json();
  if (!targetPlan || !TIER_ORDER.includes(targetPlan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Get current plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const currentPlan = profile?.plan ?? "free";
  const currentTier = TIER_ORDER.indexOf(currentPlan);
  const targetTier = TIER_ORDER.indexOf(targetPlan);

  if (targetTier >= currentTier) {
    return NextResponse.json(
      { error: "只能降级到更低的方案" },
      { status: 400 },
    );
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({
      plan: targetPlan,
      scans_limit: PLAN_LIMITS[targetPlan],
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // TODO: Cancel subscription via Waffo API when payment is integrated
  // await waffoClient.subscriptions.cancel(...)

  return NextResponse.json({ plan: targetPlan });
}
