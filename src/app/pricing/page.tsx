"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Zap,
  Crown,
  Building2,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/use-translation";

/* ─── Plan definitions (static structure, translated at render) ─── */

interface PlanDef {
  id: "free" | "pro" | "business";
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;      // per month when billed yearly
  descriptionKey: string;
  icon: typeof Zap;
  popular: boolean;
  features: { textKey: string; included: boolean }[];
  limitsKey: string;
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    descriptionKey: "pricing.freeDesc",
    icon: Zap,
    popular: false,
    limitsKey: "pricing.freeLimits",
    features: [
      { textKey: "pricing.freeF1", included: true },
      { textKey: "pricing.freeF2", included: true },
      { textKey: "pricing.freeF3", included: true },
      { textKey: "pricing.freeF4", included: false },
      { textKey: "pricing.freeF5", included: false },
      { textKey: "pricing.freeF6", included: false },
      { textKey: "pricing.freeF7", included: false },
      { textKey: "pricing.freeF8", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19,
    yearlyPrice: 15,
    descriptionKey: "pricing.proDesc",
    icon: Crown,
    popular: true,
    limitsKey: "pricing.proLimits",
    features: [
      { textKey: "pricing.proF1", included: true },
      { textKey: "pricing.proF2", included: true },
      { textKey: "pricing.proF3", included: true },
      { textKey: "pricing.proF4", included: true },
      { textKey: "pricing.proF5", included: true },
      { textKey: "pricing.proF6", included: true },
      { textKey: "pricing.proF7", included: true },
      { textKey: "pricing.proF8", included: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 49,
    yearlyPrice: 39,
    descriptionKey: "pricing.bizDesc",
    icon: Building2,
    popular: false,
    limitsKey: "pricing.bizLimits",
    features: [
      { textKey: "pricing.bizF1", included: true },
      { textKey: "pricing.bizF2", included: true },
      { textKey: "pricing.bizF3", included: true },
      { textKey: "pricing.bizF4", included: true },
      { textKey: "pricing.bizF5", included: true },
      { textKey: "pricing.bizF6", included: true },
      { textKey: "pricing.bizF7", included: true },
      { textKey: "pricing.bizF8", included: true },
    ],
  },
];

/* ─── Comparison table (static structure, translated at render) ─── */

interface CompareRow {
  labelKey: string;
  free: string;
  pro: string;
  business: string;
}

const COMPARE_TABLE: CompareRow[] = [
  { labelKey: "pricing.cmpScansPerDay", free: "5", pro: "pricing.cmpUnlimited", business: "pricing.cmpUnlimited" },
  { labelKey: "pricing.cmpSeoGeoChecks", free: "pricing.cmp22Items", pro: "pricing.cmp22Items", business: "pricing.cmp22Items" },
  { labelKey: "pricing.cmpAiSuggestions", free: "—", pro: "✓", business: "✓" },
  { labelKey: "pricing.cmpCitationSim", free: "—", pro: "✓", business: "✓" },
  { labelKey: "pricing.cmpAiOverview", free: "—", pro: "✓", business: "✓" },
  { labelKey: "pricing.cmpEntityGraph", free: "—", pro: "✓", business: "✓" },
  { labelKey: "pricing.cmpCompetitorCitation", free: "—", pro: "—", business: "✓" },
  { labelKey: "pricing.cmpCitationTracking", free: "—", pro: "pricing.cmp5Keywords", business: "pricing.cmp30Keywords" },
  { labelKey: "pricing.cmpSiteMonitoring", free: "—", pro: "pricing.cmp3Sites", business: "pricing.cmp20Sites" },
  { labelKey: "pricing.cmpMultiSiteCompare", free: "—", pro: "pricing.cmp3Sites", business: "pricing.cmp10Sites" },
  { labelKey: "pricing.cmpMultiPageCrawl", free: "—", pro: "—", business: "pricing.cmp50Pages" },
  { labelKey: "pricing.cmpBrandedReports", free: "—", pro: "—", business: "✓" },
];

/* ─── Page component ─── */

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslation();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();
        if (data?.plan) setCurrentPlan(data.plan);
      }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TIER_ORDER = ["free", "pro", "business"];
  const currentTier = TIER_ORDER.indexOf(currentPlan);

  const getPlanAction = (planId: string): "current" | "upgrade" | "downgrade" => {
    if (planId === currentPlan) return "current";
    const targetTier = TIER_ORDER.indexOf(planId);
    return targetTier > currentTier ? "upgrade" : "downgrade";
  };

  const handlePlanChange = async (planId: string) => {
    const action = getPlanAction(planId);
    if (action === "current") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(planId);

    if (action === "downgrade") {
      try {
        const res = await fetch("/api/payments/downgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });
        if (!res.ok) throw new Error("Downgrade failed");
        setCurrentPlan(planId);
      } catch {
        // ignore
      }
      setLoading(null);
      return;
    }

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billing,
          buyerEmail: user.email,
        }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch {
      setLoading(null);
    }
  };

  const getPrice = (plan: PlanDef) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  const yearlySavings = (plan: PlanDef) =>
    Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100);

  const translateCell = (value: string) =>
    value.startsWith("pricing.") ? t(value) : value;

  return (
    <div className="relative min-h-screen bg-white">
      <SiteNav />

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="text-center">
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("pricing.title")}
            </h1>
            <p className="mx-auto max-w-md text-[15px] text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 flex items-center justify-center gap-3"
        >
          <span className="w-[72px]" />
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
            {t("common.monthly")}
          </span>
          <button
            onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}
            className="relative h-7 w-12 rounded-full bg-secondary transition-colors data-[active=true]:bg-foreground"
            data-active={billing === "yearly"}
          >
            <span
              className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform data-[active=true]:translate-x-5"
              data-active={billing === "yearly"}
            />
          </button>
          <span className={`text-sm font-medium ${billing === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
            {t("common.yearly")}
          </span>
          <span className="w-[72px]">
            <Badge className={`rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-semibold transition-opacity ${billing === "yearly" ? "opacity-100" : "opacity-0"} text-foreground`}>
              {t("pricing.saveBadge")}
            </Badge>
          </span>
        </motion.div>

        {/* Plans grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = getPrice(plan);
            const isCurrent = plan.id === currentPlan;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.15 }}
                className={`glass relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  plan.popular
                    ? "ring-2 ring-foreground/15 shadow-lg shadow-foreground/5"
                    : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-semibold text-white">
                    {t("pricing.mostPopular")}
                  </Badge>
                )}

                {/* Icon */}
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground shadow-sm">
                  <plan.icon className="h-[18px] w-[18px] text-white" />
                </div>

                {/* Info */}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(plan.descriptionKey)}</p>

                {/* Price */}
                <div className="mt-4 flex flex-wrap items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground">{t("pricing.perMonth")}</span>
                  )}
                  {price === 0 && (
                    <span className="text-sm text-muted-foreground">{t("pricing.freeForever")}</span>
                  )}
                  {billing === "yearly" && plan.monthlyPrice > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {t("pricing.billedYearly")
                        .replace("{amount}", String(plan.yearlyPrice * 12))
                        .replace("{percent}", String(yearlySavings(plan)))}
                    </span>
                  )}
                </div>

                {/* Limits badge */}
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t(plan.limitsKey)}
                  </span>
                </div>

                {/* Features */}
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f.textKey} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={f.included ? "text-muted-foreground" : "text-muted-foreground/40"}>
                        {t(f.textKey)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={isCurrent || loading === plan.id}
                  className={`mt-6 w-full rounded-xl py-5 text-sm font-medium ${
                    isCurrent
                      ? "bg-secondary text-muted-foreground"
                      : plan.popular
                        ? "bg-foreground text-white hover:bg-foreground/85"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {loading === plan.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  ) : isCurrent ? (
                    t("pricing.currentPlan")
                  ) : getPlanAction(plan.id) === "upgrade" ? (
                    t("pricing.upgradeTo").replace("{plan}", plan.name)
                  ) : (
                    t("pricing.downgradeTo").replace("{plan}", plan.name)
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20"
        >
          <h2 className="mb-8 text-center text-xl font-semibold tracking-tight">
            {t("pricing.featureComparison")}
          </h2>
          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">{t("pricing.featureColumn")}</th>
                    <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">Free</th>
                    <th className="px-5 py-3.5 text-center font-medium text-foreground">Pro</th>
                    <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_TABLE.map((row, i) => (
                    <tr
                      key={row.labelKey}
                      className={i < COMPARE_TABLE.length - 1 ? "border-b border-border/40" : ""}
                    >
                      <td className="px-5 py-3 text-muted-foreground">{t(row.labelKey)}</td>
                      <td className="px-5 py-3 text-center">{renderCell(translateCell(row.free))}</td>
                      <td className="px-5 py-3 text-center">{renderCell(translateCell(row.pro))}</td>
                      <td className="px-5 py-3 text-center">{renderCell(translateCell(row.business))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {t("pricing.allPlansNote")}
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-1.5 text-[13px] italic text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Unfortunately, resilience matters in success
          </span>
          <span className="text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Lumora
          </span>
        </div>
      </footer>
    </div>
  );
}

function renderCell(value: string) {
  if (value === "✓") {
    return <Check className="mx-auto h-4 w-4 text-foreground" />;
  }
  if (value === "—") {
    return <span className="text-muted-foreground/40">—</span>;
  }
  return <span className="font-medium">{value}</span>;
}
