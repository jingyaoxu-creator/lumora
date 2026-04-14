"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Globe,
  ExternalLink,
  AlertCircle,
  Brain,
  Lightbulb,
  Code,
  ChevronDown,
  Download,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Bot,
  FileSpreadsheet,
  Braces,
  Copy,
  Check,
  MessageSquareQuote,
  TrendingUp,
  TrendingDown,
  Swords,
  Eye,
  CheckCircle2,
  Lock,
  Crown,
  Zap,
  ArrowRight,
  Bell,
} from "lucide-react";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreRing } from "@/components/score-ring";
import { CheckResultCard } from "@/components/check-result-card";
import { TerminalLoading } from "@/components/terminal-loading";
import { generateReport } from "@/lib/generate-pdf";
import { generateCSV } from "@/lib/generate-csv";
import type { AnalysisResult, AIResponse, AISuggestion, PlatformScore, CheckResult } from "@/lib/types";
import type { BrandSettings } from "@/lib/brand-types";
import { DEFAULT_BRAND } from "@/lib/brand-types";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/lib/plan-limits";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url") ?? "";

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState("");
  const [dataReady, setDataReady] = useState(false);
  const [minTimeReady, setMinTimeReady] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [userPlan, setUserPlan] = useState<PlanId>("free");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loading = !dataReady || !minTimeReady;
  const isFree = userPlan === "free";

  // Fetch user plan
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsLoggedIn(true);
        supabase
          .from("profiles")
          .select("plan")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.plan) setUserPlan(profile.plan as PlanId);
          });
      }
    });
  }, []);

  useEffect(() => {
    if (!url) {
      router.push("/");
      return;
    }

    // Check sessionStorage cache first (avoids re-scan on back navigation)
    const cacheKey = `lumora_results_${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { analysis: cachedAnalysis, aiResponse: cachedAi } = JSON.parse(cached);
        setAnalysis(cachedAnalysis);
        if (cachedAi) setAiResponse(cachedAi);
        setDataReady(true);
        setMinTimeReady(true);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Minimum display time so the terminal animation plays through
    const minTimer = setTimeout(() => setMinTimeReady(true), 14000);

    async function analyze() {
      try {
        setDataReady(false);
        setError("");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Analysis failed");
          setMinTimeReady(true); // Show error immediately
          return;
        }
        setAnalysis(data);

        // Fetch brand settings (non-blocking)
        fetch("/api/brand-settings")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) setBrand(d); })
          .catch(() => {});

        // Auto-fetch AI suggestions
        setAiLoading(true);
        let aiData: AIResponse | null = null;
        try {
          const aiRes = await fetch("/api/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (aiRes.ok) {
            aiData = await aiRes.json();
            setAiResponse(aiData);
          }
        } catch {
          // AI suggestions are optional
        } finally {
          setAiLoading(false);
        }

        // Cache results in sessionStorage
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ analysis: data, aiResponse: aiData }));
        } catch {
          // Storage full — ignore
        }
      } catch {
        setError("Failed to connect. Check the URL and try again.");
        setMinTimeReady(true); // Show error immediately
      } finally {
        setDataReady(true);
      }
    }

    analyze();
    return () => clearTimeout(minTimer);
  }, [url, router]);

  if (loading) return <TerminalLoading url={url} />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10">
            <AlertCircle className="h-7 w-7 text-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Analysis Failed</h2>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try Another URL
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!analysis) return null;

  // Prepare radar chart data
  const seoCategories = groupByCategory(analysis.seoChecks);
  const geoCategories = groupByCategory(analysis.geoChecks);
  const radarData = [
    ...Object.entries(seoCategories).map(([cat, avg]) => ({
      category: cat,
      score: avg,
      fullMark: 100,
    })),
    ...Object.entries(geoCategories).map(([cat, avg]) => ({
      category: cat,
      score: avg,
      fullMark: 100,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {analysis.pageTitle}
          </h1>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl"
          >
            Back
          </Button>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {analysis.url}
                <ExternalLink className="ml-1 inline h-3 w-3" />
              </a>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateCSV(analysis)}
              className="rounded-xl text-xs"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport(analysis, brand)}
              className="rounded-xl text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
          <span className="font-mono text-xs text-muted-foreground/60">
            {new Date(analysis.timestamp).toLocaleString()}
          </span>
        </div>
      </motion.div>

      {/* ─── Score Overview ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass mb-8 rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-16">
          <ScoreRing
            score={analysis.overallScore}
            label="Overall"
            size={160}
            strokeWidth={10}
            delay={0}
          />
          <Separator orientation="vertical" className="hidden h-24 sm:block" />
          <ScoreRing
            score={analysis.seoScore}
            label="SEO Score"
            delay={0.2}
            color="oklch(0.637 0.249 283)"
          />
          <ScoreRing
            score={analysis.geoScore}
            label="GEO Score"
            delay={0.4}
            color="oklch(0.623 0.214 259)"
          />
        </div>

        {/* Quick stats — minimal severity breakdown */}
        <div className="mt-8 grid grid-cols-5 gap-3 border-t border-border/40 pt-6">
          {[
            { label: "Errors", value: analysis.stats?.errors ?? 0 },
            { label: "Warnings", value: analysis.stats?.warnings ?? 0 },
            { label: "Notices", value: analysis.stats?.notices ?? 0 },
            { label: "Passed", value: analysis.stats?.passed ?? 0 },
            { label: "Total", value: analysis.stats?.total ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border-l-2 border-foreground bg-transparent py-2 pl-3 pr-2">
              <p className="text-xl font-bold tabular-nums text-foreground">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Page info bar */}
        {analysis.stats && (
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>HTML: {(analysis.stats.htmlSize / 1024).toFixed(0)} KB</span>
            <span>•</span>
            <span>Response: {analysis.stats.responseTimeMs}ms</span>
            <span>•</span>
            <span>Words: {analysis.stats.wordCount.toLocaleString()}</span>
          </div>
        )}
      </motion.div>

      {/* ─── Upgrade Banner (free users with issues) ─── */}
      {isFree && (analysis.stats?.errors ?? 0) + (analysis.stats?.warnings ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-8 overflow-hidden rounded-2xl border border-aurora-violet/25 bg-gradient-to-r from-aurora-violet/[0.06] via-aurora-blue/[0.04] to-aurora-violet/[0.06]"
        >
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-aurora-violet/10">
                <Zap className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">
                  Found {(analysis.stats?.errors ?? 0) + (analysis.stats?.warnings ?? 0)} issues — let AI fix them
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Unlock AI-powered fix suggestions, keyword rank tracking, competitor analysis, and continuous monitoring with Pro.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {["AI Fix Suggestions", "Rank Tracking", "Site Monitoring", "Competitor Analysis"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full border border-aurora-violet/20 bg-aurora-violet/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                      <CheckCircle2 className="h-3 w-3 text-brand-purple" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push("/pricing")}
              className="shrink-0 rounded-xl bg-foreground px-6 py-5 text-background hover:bg-foreground/85"
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </motion.div>
      )}

      {/* ─── Next Steps ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {([
          { href: "/ai-search", icon: Bot, label: "AI Search Tools", desc: "Check AI Overview presence", gated: true },
          { href: "/analysis?tab=compare", icon: Swords, label: "Compare Sites", desc: "Benchmark against competitors", gated: true },
          { href: "/monitors", icon: Eye, label: "Monitor Site", desc: "Track score changes over time", gated: true },
          { href: `/analysis?tab=rank-tracking`, icon: TrendingUp, label: "Track Rankings", desc: "Monitor keyword positions", gated: true },
        ] as const).map((item) => (
          <button
            key={item.href}
            onClick={() => {
              if (item.gated && isFree) {
                router.push("/pricing");
              } else {
                router.push(item.href);
              }
            }}
            className="glass group relative flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
          >
            {item.gated && isFree && (
              <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-aurora-violet/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand-purple">
                <Lock className="h-2.5 w-2.5" />
                PRO
              </span>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.04] transition-colors group-hover:bg-foreground/[0.08]">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[13px] font-medium">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* ─── Radar Chart ─── */}
      {radarData.length > 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass mb-8 rounded-2xl p-6"
        >
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Category Breakdown
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid
                  stroke="oklch(0 0 0 / 8%)"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "oklch(0.4 0 0)", fontSize: 11 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="oklch(0.637 0.249 283)"
                  fill="oklch(0.637 0.249 283)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ─── Tabs: SEO / GEO / AI ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="seo" className="w-full">
          <TabsList className="mb-6 h-auto gap-1 rounded-xl bg-secondary/50 p-1">
            <TabsTrigger
              value="seo"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              SEO Checks
              <Badge
                variant="outline"
                className="ml-2 px-1.5 py-0 text-[10px]"
              >
                {analysis.seoChecks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="geo"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              GEO Checks
              <Badge
                variant="outline"
                className="ml-2 px-1.5 py-0 text-[10px]"
              >
                {analysis.geoChecks.length}
              </Badge>
            </TabsTrigger>
            {analysis.platformScores && analysis.platformScores.length > 0 && (
              <TabsTrigger
                value="platforms"
                className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Bot className="mr-1.5 h-3.5 w-3.5" />
                AI Platforms
                <Badge
                  variant="outline"
                  className="ml-2 px-1.5 py-0 text-[10px]"
                >
                  {analysis.platformScores.length}
                </Badge>
              </TabsTrigger>
            )}
            {analysis.schemaValidation && (
              <TabsTrigger
                value="schema"
                className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Braces className="mr-1.5 h-3.5 w-3.5" />
                Schema
                <Badge
                  variant="outline"
                  className="ml-2 px-1.5 py-0 text-[10px]"
                >
                  {analysis.schemaValidation.issues.length}
                </Badge>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="ai"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="space-y-2">
            <CategoryAccordion checks={analysis.seoChecks} />
          </TabsContent>

          <TabsContent value="geo" className="space-y-2">
            <CategoryAccordion checks={analysis.geoChecks} />
            {analysis.llmsTxt && <LlmsTxtPanel content={analysis.llmsTxt} />}
            {analysis.paragraphScores && analysis.paragraphScores.total > 0 && (
              <ParagraphScoresPanel data={analysis.paragraphScores} />
            )}
          </TabsContent>

          {analysis.platformScores && analysis.platformScores.length > 0 && (
            <TabsContent value="platforms">
              <PlatformReadinessPanel platforms={analysis.platformScores} />
            </TabsContent>
          )}

          {analysis.schemaValidation && (
            <TabsContent value="schema">
              <SchemaValidationPanel data={analysis.schemaValidation} />
            </TabsContent>
          )}

          <TabsContent value="ai">
            <AISuggestionsPanel
              response={aiResponse}
              loading={aiLoading}
              isFree={isFree}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ─── Save & Monitor CTA ─── */}
      {isFree && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/40 via-background to-aurora-violet/[0.04]"
        >
          <div className="flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-aurora-violet/10">
              <Bell className="h-6 w-6 text-brand-purple" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Don&apos;t lose these insights</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Save this report and get weekly score updates. Know the moment something breaks — before your rankings drop.
              </p>
            </div>
            <Button
              onClick={() => router.push(isLoggedIn ? "/pricing" : "/auth/signup")}
              className="shrink-0 rounded-xl bg-foreground px-6 py-5 text-background hover:bg-foreground/85"
            >
              {isLoggedIn ? (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Monitor
                </>
              ) : (
                <>
                  Sign Up Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Spacer */}
      <div className={isFree ? "h-24" : "h-20"} />
    </div>
  );
}

/* ─── Category Accordion for Check Grouping ─── */

function CategoryAccordion({ checks }: { checks: CheckResult[] }) {
  const grouped = new Map<string, CheckResult[]>();
  for (const check of checks) {
    const cat = check.category || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(check);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <CategoryGroup key={category} category={category} checks={items} />
      ))}
    </div>
  );
}

function CategoryGroup({ category, checks }: { category: string; checks: CheckResult[] }) {
  const [open, setOpen] = useState(false);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warning").length;
  const allPass = passCount === checks.length;

  return (
    <div className="glass overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${allPass ? "bg-emerald-50" : "bg-secondary/50"}`}>
          {allPass ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <span className="text-sm font-bold tabular-nums text-foreground">{checks.length}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{category}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {passCount > 0 && <span className="text-emerald-600">{passCount} passed</span>}
            {warnCount > 0 && <span className="text-amber-500">{warnCount} warnings</span>}
            {failCount > 0 && <span className="text-red-500">{failCount} failed</span>}
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-border/30">
            {passCount > 0 && (
              <div className="h-full bg-emerald-500" style={{ width: `${(passCount / checks.length) * 100}%` }} />
            )}
            {warnCount > 0 && (
              <div className="h-full bg-amber-500" style={{ width: `${(warnCount / checks.length) * 100}%` }} />
            )}
            {failCount > 0 && (
              <div className="h-full bg-red-500" style={{ width: `${(failCount / checks.length) * 100}%` }} />
            )}
          </div>
          <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
            {passCount}/{checks.length}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-1 border-t border-border/40 px-3 pb-3 pt-2">
          {checks.map((check, i) => (
            <CheckResultCard key={check.id} check={check} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── llms.txt Generator Panel ─── */

function LlmsTxtPanel({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-aurora-violet/20 bg-aurora-violet/5 p-5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aurora-violet/10">
          <FileSpreadsheet className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Generated llms.txt</p>
          <p className="text-xs text-muted-foreground">
            Auto-generated LLM-friendly site manifest — deploy to /llms.txt
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="mt-4">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2 z-10 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <span className="flex items-center gap-1 text-foreground">
                  <Check className="h-3 w-3" /> Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-3 w-3" /> Copy
                </span>
              )}
            </button>
            <pre className="max-h-[400px] overflow-auto rounded-xl bg-background/80 p-4 pr-20 font-mono text-[11px] leading-relaxed text-foreground/80">
              {content}
            </pre>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Save this as <code className="rounded bg-secondary/50 px-1 py-0.5">/llms.txt</code> at
            your site root. AI crawlers will use it to understand your site structure.
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Paragraph Citability Scores Panel ─── */

function ParagraphScoresPanel({
  data,
}: {
  data: NonNullable<AnalysisResult["paragraphScores"]>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-aurora-violet/20 bg-aurora-violet/5 p-5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aurora-violet/10">
          <MessageSquareQuote className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Paragraph Citability</p>
          <p className="text-xs text-muted-foreground">
            {data.total} paragraphs scored — avg{" "}
            <span
              className={
                data.avgScore >= 60
                  ? "text-foreground"
                  : data.avgScore >= 40
                  ? "text-foreground"
                  : "text-foreground"
              }
            >
              {data.avgScore}/100
            </span>
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Top paragraphs */}
          {data.topParagraphs.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Most Citable
              </div>
              <div className="space-y-2">
                {data.topParagraphs.map((p, i) => (
                  <ParagraphCard key={i} paragraph={p} variant="top" />
                ))}
              </div>
            </div>
          )}

          {/* Weak paragraphs */}
          {data.weakParagraphs.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <TrendingDown className="h-3.5 w-3.5" />
                Needs Improvement
              </div>
              <div className="space-y-2">
                {data.weakParagraphs.map((p, i) => (
                  <ParagraphCard key={i} paragraph={p} variant="weak" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ParagraphCard({
  paragraph,
  variant,
}: {
  paragraph: { text: string; score: number; factors: Record<string, number>; highlights: string[] };
  variant: "top" | "weak";
}) {
  const borderColor = variant === "top" ? "border-emerald-500/30" : "border-amber-500/30";
  const scoreBg = variant === "top" ? "bg-emerald-500/10 text-foreground" : "bg-amber-500/10 text-foreground";

  return (
    <div className={`rounded-xl border ${borderColor} bg-background/50 p-3`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
          &ldquo;{paragraph.text}&rdquo;
        </p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${scoreBg}`}>
          {paragraph.score}
        </span>
      </div>
      {paragraph.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {paragraph.highlights.map((h, i) => (
            <Badge key={i} variant="outline" className="px-1.5 py-0 text-[10px]">
              {h}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-4 gap-1">
        {Object.entries(paragraph.factors).map(([key, val]) => (
          <div key={key} className="text-center">
            <div className="text-[10px] font-medium tabular-nums text-foreground/70">{val}/25</div>
            <div className="text-[9px] text-muted-foreground">
              {key === "informationDensity" ? "Info" : key === "selfContainment" ? "Self" : key === "factualSpecificity" ? "Fact" : "Struct"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Schema Validation Panel ─── */

const severityStyle = {
  error: { color: "text-foreground", bg: "bg-red-50", border: "border-red-200", label: "Error" },
  warning: { color: "text-foreground", bg: "bg-amber-50", border: "border-amber-200", label: "Warning" },
  notice: { color: "text-foreground", bg: "bg-blue-50", border: "border-blue-200", label: "Info" },
};

function SchemaValidationPanel({
  data,
}: {
  data: NonNullable<AnalysisResult["schemaValidation"]>;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copyFix(fix: string, idx: number) {
    navigator.clipboard.writeText(fix);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  const errorCount = data.issues.filter((i) => i.severity === "error").length;
  const warningCount = data.issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-3"
      >
        <div className="glass rounded-xl p-4 text-center">
          <p
            className={`text-2xl font-bold tabular-nums ${
              data.score >= 80
                ? "text-foreground"
                : data.score >= 50
                ? "text-foreground"
                : "text-foreground"
            }`}
          >
            {data.score}
          </p>
          <p className="text-[11px] text-muted-foreground">Schema Score</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {data.schemas.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Schemas Found</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {errorCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Errors</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {warningCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Warnings</p>
        </div>
      </motion.div>

      {/* Detected schemas */}
      {data.schemas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-5"
        >
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Detected Schemas
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.schemas.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs font-medium"
              >
                <Braces className="h-3 w-3 text-foreground" />
                {s.type}
                <span className="text-[10px] text-muted-foreground">
                  ({s.source})
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Issues list */}
      {data.issues.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-foreground">
            All structured data is valid — no issues found!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {data.issues.map((issue, i) => {
            const style = severityStyle[issue.severity];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${style.bg} ${style.color} border ${style.border}`}
                  >
                    {style.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">
                        {issue.type}.
                      </span>
                      {issue.field}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {issue.message}
                    </p>
                    {issue.fix && (
                      <div className="mt-2 relative">
                        <button
                          onClick={() => copyFix(issue.fix!, i)}
                          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
                          title="Copy fix"
                        >
                          {copiedIdx === i ? (
                            <Check className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <pre className="overflow-x-auto rounded-lg bg-background/80 p-3 pr-10 font-mono text-[11px] leading-relaxed text-foreground/80">
                          {issue.fix}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Platform Readiness Panel ─── */

const platformIcons: Record<string, string> = {
  google: "G",
  chatgpt: "⬡",
  perplexity: "P",
  copilot: "⊞",
  claude: "◈",
  apple: "",
  meta: "∞",
  baidu: "百",
  bytedance: "抖",
  deepseek: "DS",
};

const platformColors: Record<string, string> = {
  google: "#4285F4",
  chatgpt: "#10A37F",
  perplexity: "#20808D",
  copilot: "#7B61FF",
  claude: "#D97706",
  apple: "#555555",
  meta: "#0668E1",
  baidu: "#2932E1",
  bytedance: "#FE2C55",
  deepseek: "#4D6BFE",
};

const accessConfig = {
  allowed: {
    icon: ShieldCheck,
    label: "Allowed",
    color: "text-foreground",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  blocked: {
    icon: ShieldX,
    label: "Blocked",
    color: "text-foreground",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  restricted: {
    icon: ShieldAlert,
    label: "Restricted",
    color: "text-foreground",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  unknown: {
    icon: Shield,
    label: "Unknown",
    color: "text-muted-foreground",
    bg: "bg-secondary/50",
    border: "border-border",
  },
};

function PlatformReadinessPanel({ platforms }: { platforms: PlatformScore[] }) {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  // Sort: highest score first
  const sorted = [...platforms].sort((a, b) => b.score - a.score);

  // Radar data
  const radarData = sorted.map((p) => ({
    platform: p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name,
    score: p.score,
    fullMark: 100,
  }));

  // Bar chart data
  const barData = sorted.map((p) => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name,
    score: p.score,
    key: p.key,
  }));

  // Average score
  const avgScore = Math.round(
    platforms.reduce((s, p) => s + p.score, 0) / platforms.length
  );

  const allowedCount = platforms.filter((p) => p.crawlerAccess === "allowed").length;
  const blockedCount = platforms.filter((p) => p.crawlerAccess === "blocked").length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {avgScore}
          </p>
          <p className="text-[11px] text-muted-foreground">Avg Platform Score</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {allowedCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Crawlers Allowed</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {blockedCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Crawlers Blocked</p>
        </div>
      </motion.div>

      {/* Charts row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Radar */}
        <div className="glass rounded-2xl p-5">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Platform Radar
          </h4>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="platform"
                  tick={{ fill: "oklch(0.45 0 0)", fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  tickCount={4}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="oklch(0.637 0.249 283)"
                  fill="oklch(0.637 0.249 283)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart */}
        <div className="glass rounded-2xl p-5">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Score Comparison
          </h4>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid oklch(0 0 0 / 10%)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}/100`, "Score"]}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={platformColors[entry.key] ?? "oklch(0.637 0.249 283)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Platform cards */}
      <div className="space-y-2">
        {sorted.map((platform, i) => (
          <PlatformCard
            key={platform.key}
            platform={platform}
            index={i}
            expanded={expandedPlatform === platform.key}
            onToggle={() =>
              setExpandedPlatform(
                expandedPlatform === platform.key ? null : platform.key
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  index,
  expanded,
  onToggle,
}: {
  platform: PlatformScore;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const access = accessConfig[platform.crawlerAccess];
  const AccessIcon = access.icon;
  const color = platformColors[platform.key] ?? "#888";
  const icon = platformIcons[platform.key] ?? "?";

  const passedChecks = platform.checks.filter((c) => c.status === "pass").length;
  const failedChecks = platform.checks.filter((c) => c.status !== "pass").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
      className={`glass rounded-xl transition-all ${expanded ? "!border-border" : ""}`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Platform icon */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>

        {/* Platform info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{platform.name}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${access.bg} ${access.color} border ${access.border}`}
            >
              <AccessIcon className="h-3 w-3" />
              {access.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              <span className="text-foreground font-medium">{passedChecks}</span> passed
            </span>
            {failedChecks > 0 && (
              <span>
                <span className="text-foreground font-medium">{failedChecks}</span> issues
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/30">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${platform.score}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
              />
            </div>
          </div>
          <span
            className="w-8 text-right font-mono text-sm font-bold tabular-nums"
            style={{ color }}
          >
            {platform.score}
          </span>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded: check details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-border/50 px-4 pb-4 pt-3"
        >
          <div className="space-y-2">
            {platform.checks.map((check, i) => (
              <CheckResultCard key={check.id} check={check} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── AI Suggestions Panel ─── */

function AISuggestionsPanel({
  response,
  loading,
  isFree = false,
}: {
  response: AIResponse | null;
  loading: boolean;
  isFree?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass flex items-center gap-3 rounded-2xl p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="h-5 w-5 text-foreground" />
        </motion.div>
        <div>
          <p className="text-sm font-medium">Generating AI suggestions...</p>
          <p className="text-xs text-muted-foreground">
            Claude is analyzing your results
          </p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          AI suggestions are not available. Set ANTHROPIC_API_KEY to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-aurora-violet/20 bg-aurora-violet/5 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-aurora-violet/10">
            <Lightbulb className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold">Executive Summary</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {response.summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Suggestions */}
      {response.suggestions.slice(0, isFree ? 2 : undefined).map((suggestion, i) => (
        <SuggestionCard key={i} suggestion={suggestion} index={i} />
      ))}

      {/* Gated suggestions paywall */}
      {isFree && response.suggestions.length > 2 && (
        <div className="relative">
          {/* Blurred preview of next suggestion */}
          <div className="pointer-events-none select-none blur-[6px] opacity-50">
            <SuggestionCard suggestion={response.suggestions[2]} index={2} />
          </div>
          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-aurora-violet/10">
                <Lock className="h-4 w-4 text-brand-purple" />
              </div>
              <p className="text-sm font-semibold">
                +{response.suggestions.length - 2} more AI suggestions
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upgrade to Pro for all fix recommendations and code snippets
              </p>
              <a
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
              >
                <Crown className="h-3.5 w-3.5" />
                Unlock All Suggestions
              </a>
            </div>
          </div>
        </div>
      )}

      {response.suggestions.length === 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            All checks passed — no additional suggestions needed!
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Single Suggestion Card ─── */

const priorityConfig = {
  critical: {
    color: "text-foreground",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  high: {
    color: "text-foreground",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  medium: {
    color: "text-foreground",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  low: {
    color: "text-foreground",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
};

function SuggestionCard({
  suggestion,
  index,
}: {
  suggestion: AISuggestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index < 3);
  const config = priorityConfig[suggestion.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-xl"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className={`text-xs font-bold uppercase tracking-wider ${config.color}`}
        >
          {suggestion.priority}
        </span>
        <span className="flex-1 text-sm font-medium">{suggestion.title}</span>
        <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
          {suggestion.category.toUpperCase()}
        </Badge>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {suggestion.description}
          </p>
          {suggestion.code && (
            <div className="mt-3 overflow-x-auto rounded-lg bg-background/80 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Code className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Code
                </span>
              </div>
              <pre className="font-mono text-xs leading-relaxed text-foreground/80">
                {suggestion.code}
              </pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Utils ─── */

function groupByCategory(checks: { category: string; score: number }[]) {
  const groups: Record<string, number[]> = {};
  for (const c of checks) {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category].push(c.score);
  }
  const result: Record<string, number> = {};
  for (const [cat, scores] of Object.entries(groups)) {
    result[cat] = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
  }
  return result;
}

/* ─── Sticky Upgrade Bar ─── */

function StickyUpgradeBar() {
  const [userPlan, setUserPlan] = useState<PlanId>("free");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("plan")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.plan) setUserPlan(profile.plan as PlanId);
          });
      }
    });
  }, []);

  // Show after scrolling down 600px
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (userPlan !== "free" || !visible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-brand-purple" />
          <p className="text-[13px]">
            <span className="font-medium">Unlock the full report</span>
            <span className="hidden text-muted-foreground sm:inline"> — AI fix suggestions, monitoring, rank tracking, and more</span>
          </p>
        </div>
        <a
          href="/pricing"
          className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
        >
          <Crown className="h-3.5 w-3.5" />
          View Plans
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </motion.div>
  );
}

/* ─── Page Export ─── */

export default function ResultsPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
        <div
          className="absolute -top-[100px] -right-[100px] h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[120px]"
          style={{
            background: "radial-gradient(circle, oklch(0.7 0.2 285), transparent 65%)",
          }}
        />
        <div
          className="absolute bottom-[10%] -left-[50px] h-[400px] w-[400px] rounded-full opacity-[0.08] blur-[110px]"
          style={{
            background: "radial-gradient(circle, oklch(0.72 0.15 210), transparent 65%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <UserNav />
        </div>
      </header>

      <Suspense fallback={<TerminalLoading />}>
        <ResultsContent />
      </Suspense>

      {/* Sticky upgrade bar for free users */}
      <StickyUpgradeBar />
    </div>
  );
}
