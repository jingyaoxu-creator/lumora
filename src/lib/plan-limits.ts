import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type PlanId = "free" | "pro" | "business";

/** Per-plan daily scan limits */
const DAILY_SCAN_LIMITS: Record<PlanId, number> = {
  free: 5,
  pro: Infinity,
  business: Infinity,
};

/** Features gated by plan */
const PLAN_FEATURES: Record<string, PlanId> = {
  suggestions: "pro",
  "citation-sim": "pro",
  "ai-overview": "pro",
  "entity-detect": "pro",
  "citation-tracking": "pro",
  compare: "pro",
  monitors: "pro",
  "competitor-citation": "business",
  crawl: "business",
  "brand-settings": "business",
  "rank-tracking": "pro",
  "brand-mentions": "pro",
  "competitor-keywords": "pro",
};

export interface PlanCheckResult {
  allowed: boolean;
  plan: PlanId;
  userId: string;
  reason?: string;
}

/**
 * Build a 401/403 NextResponse from a denied PlanCheckResult.
 */
export function denyResponse(check: PlanCheckResult, featureLabel: string) {
  if (check.reason === "unauthenticated") {
    return NextResponse.json(
      { error: "请先登录后再使用此功能。", code: "unauthenticated" },
      { status: 401 },
    );
  }
  return NextResponse.json(
    { error: `${featureLabel}需要升级套餐。`, code: check.reason },
    { status: 403 },
  );
}

/**
 * Check if the current user can access a specific feature.
 * Returns { allowed, plan, userId, reason }.
 */
export async function checkFeatureAccess(
  feature: string,
): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, plan: "free", userId: "", reason: "unauthenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan as PlanId) ?? "free";
  const requiredPlan = PLAN_FEATURES[feature];

  if (!requiredPlan) {
    // No gate — anyone can use it
    return { allowed: true, plan, userId: user.id };
  }

  const tierOrder: PlanId[] = ["free", "pro", "business"];
  const userTier = tierOrder.indexOf(plan);
  const requiredTier = tierOrder.indexOf(requiredPlan);

  if (userTier < requiredTier) {
    return {
      allowed: false,
      plan,
      userId: user.id,
      reason: `requires_${requiredPlan}`,
    };
  }

  return { allowed: true, plan, userId: user.id };
}

/**
 * Check if the current user has remaining daily scans.
 * Counts today's scans from scan_history (auto-resets each day).
 */
export async function checkScanLimit(): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Anonymous users get limited scans (no tracking)
  if (!user) {
    return { allowed: true, plan: "free", userId: "" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan as PlanId) ?? "free";
  const limit = DAILY_SCAN_LIMITS[plan];

  if (limit === Infinity) {
    return { allowed: true, plan, userId: user.id };
  }

  // Count today's scans from scan_history
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("scan_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  const used = count ?? 0;

  if (used >= limit) {
    return {
      allowed: false,
      plan,
      userId: user.id,
      reason: "scan_limit_reached",
    };
  }

  return { allowed: true, plan, userId: user.id };
}
