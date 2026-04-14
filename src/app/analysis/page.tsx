"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Swords,
  Map,
  Shield,
  Plus,
  X,
  Trophy,
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Trash2,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/lib/plan-limits";
import type { AnalysisResult } from "@/lib/types";
import type { SiteCrawlResult } from "@/lib/site-crawl";

/* ═══════════════════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════════════════ */

type TabKey = "scan" | "compare" | "crawl" | "rank-tracking" | "competitor-keywords";

const TABS: { key: TabKey; label: string; icon: React.ElementType; plan?: "pro" | "business" }[] = [
  { key: "scan", label: "Scan", icon: Search },
  { key: "compare", label: "Compare", icon: Swords, plan: "pro" },
  { key: "crawl", label: "Crawl", icon: Map, plan: "business" },
  { key: "rank-tracking", label: "Rank Tracking", icon: TrendingUp, plan: "pro" },
  { key: "competitor-keywords", label: "Competitor Keywords", icon: Swords, plan: "pro" },
];

const SITE_COLORS = [
  { stroke: "oklch(0.62 0.25 290)", fill: "oklch(0.62 0.25 290 / 0.3)", bg: "bg-aurora-violet" },
  { stroke: "oklch(0.65 0.2 250)", fill: "oklch(0.65 0.2 250 / 0.3)", bg: "bg-aurora-blue" },
  { stroke: "oklch(0.72 0.15 200)", fill: "oklch(0.72 0.15 200 / 0.3)", bg: "bg-aurora-cyan" },
];

/* ── Plan gate overlay for locked tabs ── */
function PlanGate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="pointer-events-none select-none p-5 opacity-40 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
            <Lock className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Pro feature</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Upgrade to unlock {label}</p>
          </div>
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-foreground/85"
          >
            View Plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

type CompareResult = AnalysisResult | { url: string; error: string };

function isCompareError(r: CompareResult): r is { url: string; error: string } {
  return "error" in r;
}

function scoreColor(s: number) {
  if (s >= 80) return "text-foreground";
  if (s >= 50) return "text-foreground";
  return "text-foreground";
}

function domainFromUrl(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

interface TrackedKeyword {
  id: string;
  domain: string;
  keyword: string;
  created_at: string;
  latestPosition: number | null;
  latestUrl: string | null;
  latestCheckedAt: string | null;
  trend: "up" | "down" | "stable" | null;
}

interface CompetitorResult {
  domain: string;
  competitorDomain: string;
  shared: string[];
  uniqueToUser: string[];
  uniqueToCompetitor: string[];
  userPages: { title: string; link: string; snippet: string }[];
  competitorPages: { title: string; link: string; snippet: string }[];
  timestamp: string;
}

function positionBadge(position: number | null) {
  if (position === null) return { label: "Not ranked", className: "border-border bg-secondary/30 text-muted-foreground" };
  if (position <= 10) return { label: `#${position}`, className: "border-emerald-200 bg-emerald-50 text-foreground" };
  if (position <= 30) return { label: `#${position}`, className: "border-amber-200 bg-amber-50 text-foreground" };
  return { label: `#${position}`, className: "border-red-200 bg-red-50 text-foreground" };
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" | null }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  if (trend === "stable") return <Minus className="h-4 w-4 text-muted-foreground" />;
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export default function AnalysisPage() {
  const router = useRouter();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("scan");
  const [userPlan, setUserPlan] = useState<PlanId>("free");

  /* ── Fetch user plan ── */
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

  /* ── Scan tab state ── */
  const [scanUrl, setScanUrl] = useState("");
  const [scanLoading, setScanLoading] = useState(false);

  /* ── Compare tab state ── */
  const [compareUrls, setCompareUrls] = useState<string[]>(["", ""]);
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  /* ── Crawl tab state ── */
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlError, setCrawlError] = useState("");
  const [crawlResult, setCrawlResult] = useState<SiteCrawlResult | null>(null);

  /* ── Rank Tracking tab state ── */
  const [rtKeywords, setRtKeywords] = useState<TrackedKeyword[]>([]);
  const [rtLoading, setRtLoading] = useState(false);
  const [rtAdding, setRtAdding] = useState(false);
  const [rtDomain, setRtDomain] = useState("");
  const [rtKeyword, setRtKeyword] = useState("");
  const [rtError, setRtError] = useState("");
  const [rtDeleting, setRtDeleting] = useState<Set<string>>(new Set());
  const [rtLoaded, setRtLoaded] = useState(false);

  /* ── Competitor Keywords tab state ── */
  const [ckDomain, setCkDomain] = useState("");
  const [ckCompetitor, setCkCompetitor] = useState("");
  const [ckLoading, setCkLoading] = useState(false);
  const [ckResult, setCkResult] = useState<CompetitorResult | null>(null);
  const [ckError, setCkError] = useState("");

  /* ═══════════ Scan handlers ═══════════ */
  function handleScan() {
    const target = scanUrl.trim();
    if (!target) return;
    setScanLoading(true);
    // Clear cached results so the terminal animation always plays
    try { sessionStorage.removeItem(`lumora_results_${target}`); } catch {}
    router.push(`/results?url=${encodeURIComponent(target)}`);
  }

  /* ═══════════ Compare handlers ═══════════ */
  const canAddUrl = compareUrls.length < 3;
  const canCompare = compareUrls.filter((u) => u.trim().length > 0).length >= 2;

  function updateCompareUrl(index: number, value: string) {
    setCompareUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function addCompareUrl() {
    if (canAddUrl) setCompareUrls((prev) => [...prev, ""]);
  }

  function removeCompareUrl(index: number) {
    if (compareUrls.length > 2) setCompareUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function runCompare() {
    const validUrls = compareUrls.filter((u) => u.trim().length > 0);
    if (validUrls.length < 2) return;

    setCompareLoading(true);
    setCompareError(null);
    setCompareResults(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compare failed");
      setCompareResults(data.results);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCompareLoading(false);
    }
  }

  /* ═══════════ Crawl handlers ═══════════ */
  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!crawlUrl.trim() || crawlLoading) return;

    setCrawlLoading(true);
    setCrawlError("");
    setCrawlResult(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim(), maxPages: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCrawlError(data.error ?? "Crawl failed");
        return;
      }
      setCrawlResult(data);
    } catch {
      setCrawlError("Failed to connect. Check the URL and try again.");
    } finally {
      setCrawlLoading(false);
    }
  }

  /* ═══════════ Rank Tracking handlers ═══════════ */
  async function loadRankTracking() {
    setRtLoading(true);
    try {
      const res = await fetch("/api/rank-tracking");
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) setRtKeywords(await res.json());
    } finally {
      setRtLoading(false);
      setRtLoaded(true);
    }
  }

  async function handleRtAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!rtDomain.trim() || !rtKeyword.trim() || rtAdding) return;
    setRtAdding(true);
    setRtError("");
    try {
      const res = await fetch("/api/rank-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: rtDomain.trim(), keyword: rtKeyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRtError(data.error ?? "Failed to add keyword"); return; }
      setRtDomain("");
      setRtKeyword("");
      await loadRankTracking();
    } finally {
      setRtAdding(false);
    }
  }

  async function handleRtDelete(id: string) {
    setRtDeleting((prev) => new Set(prev).add(id));
    setRtKeywords((prev) => prev.filter((kw) => kw.id !== id));
    await fetch("/api/rank-tracking", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRtDeleting((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  /* ═══════════ Competitor Keywords handlers ═══════════ */
  async function handleCkCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!ckDomain.trim() || !ckCompetitor.trim() || ckLoading) return;
    setCkLoading(true);
    setCkError("");
    setCkResult(null);
    try {
      const res = await fetch("/api/competitor-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: ckDomain.trim(), competitorDomain: ckCompetitor.trim() }),
      });
      if (res.status === 401) { router.push("/auth/login"); return; }
      const data = await res.json();
      if (!res.ok) { setCkError(data.error ?? "Failed to analyze keywords"); return; }
      setCkResult(data);
    } catch { setCkError("Network error — please try again."); } finally { setCkLoading(false); }
  }

  useEffect(() => {
    if (activeTab === "rank-tracking" && !rtLoaded) {
      loadRankTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SiteNav />

      {/* ─── Hero header ─── */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-secondary/50 to-white pt-28 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,0,0,0.03),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06]">
                <Search className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Analysis Tools
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">SEO & GEO Analysis</h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Scan a single page, compare competitors side by side, or crawl an entire site.
            </p>
          </motion.div>

          {/* ─── Tab bar ─── */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.plan && (
                      <span className="ml-1 rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-foreground/50">
                        {tab.plan === "business" ? "BIZ" : "PRO"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-8">
        {activeTab === "scan" && (
          <ScanTab
            url={scanUrl}
            setUrl={setScanUrl}
            loading={scanLoading}
            onSubmit={handleScan}
          />
        )}
        {activeTab === "compare" && (
          <CompareTab
            urls={compareUrls}
            results={compareResults}
            loading={compareLoading}
            error={compareError}
            canAdd={canAddUrl}
            canCompare={canCompare}
            updateUrl={updateCompareUrl}
            addUrl={addCompareUrl}
            removeUrl={removeCompareUrl}
            runCompare={runCompare}
            userPlan={userPlan}
          />
        )}
        {activeTab === "crawl" && (
          userPlan === "free" || userPlan === "pro" ? (
            <PlanGate label="Site Crawl">
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">https://example.com</div>
                <div className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-white">Start Crawl</div>
              </div>
            </PlanGate>
          ) : (
            <CrawlTab
              url={crawlUrl}
              setUrl={setCrawlUrl}
              loading={crawlLoading}
              error={crawlError}
              result={crawlResult}
              onSubmit={handleCrawl}
            />
          )
        )}

        {/* ═══ Tab 4: Rank Tracking ═══ */}
        {activeTab === "rank-tracking" && (
          userPlan === "free" ? (
            <PlanGate label="Rank Tracking">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">example.com</div>
                  <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">Enter keyword...</div>
                  <div className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-white">Add</div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 p-4">
                      <div className="h-10 w-10 rounded-lg bg-secondary/60" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded bg-secondary/60" />
                        <div className="h-3 w-48 rounded bg-secondary/40" />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-secondary/60" />
                    </div>
                  ))}
                </div>
              </div>
            </PlanGate>
          ) : (
          <div>
            <motion.form
              onSubmit={handleRtAdd}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mb-8 rounded-2xl p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={rtDomain} onChange={(e) => setRtDomain(e.target.value)} placeholder="example.com" className="flex-1 rounded-xl" disabled={rtAdding} />
                <Input value={rtKeyword} onChange={(e) => setRtKeyword(e.target.value)} placeholder="Enter keyword..." className="flex-1 rounded-xl" disabled={rtAdding} />
                <Button type="submit" disabled={rtAdding || !rtDomain.trim() || !rtKeyword.trim()} className="rounded-xl bg-aurora-violet px-4 text-white hover:bg-aurora-violet/90">
                  {rtAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add
                </Button>
              </div>
              {rtError && <p className="mt-2 text-xs text-red-600">{rtError}</p>}
            </motion.form>

            {rtLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass flex items-center gap-3 rounded-xl p-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary/60" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-secondary/60" />
                      <div className="h-3 w-48 animate-pulse rounded bg-secondary/40" />
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded-full bg-secondary/60" />
                  </div>
                ))}
              </div>
            ) : rtKeywords.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-12 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No keywords tracked yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Add a domain and keyword above to start tracking rankings.</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {rtKeywords.map((kw, i) => {
                  const badge = positionBadge(kw.latestPosition);
                  return (
                    <motion.div key={kw.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass flex items-center gap-3 rounded-xl p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                        <TrendIcon trend={kw.trend} />
                        {kw.trend === null && <Minus className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{kw.domain} <span className="text-muted-foreground">—</span> <span className="text-muted-foreground">{kw.keyword}</span></p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {kw.latestCheckedAt ? <span>Last checked: {new Date(kw.latestCheckedAt).toLocaleDateString()}</span> : <span>Not checked yet</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                      <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground hover:text-foreground" onClick={() => handleRtDelete(kw.id)} disabled={rtDeleting.has(kw.id)}>
                        {rtDeleting.has(kw.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
          )
        )}

        {/* ═══ Tab 5: Competitor Keywords ═══ */}
        {activeTab === "competitor-keywords" && (
          userPlan === "free" ? (
            <PlanGate label="Competitor Keywords">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">Your domain (e.g. example.com)</div>
                  <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">Competitor domain (e.g. rival.com)</div>
                  <div className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-white">Compare</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["Shared Keywords", "Unique to You", "Competitor's"].map((l) => (
                    <div key={l} className="rounded-2xl border border-border/40 p-5 text-center">
                      <div className="text-3xl font-bold text-secondary/60">—</div>
                      <div className="mt-1 text-xs text-muted-foreground/50">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </PlanGate>
          ) : (
          <div>
            <motion.form
              onSubmit={handleCkCompare}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mb-8 rounded-2xl p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={ckDomain} onChange={(e) => setCkDomain(e.target.value)} placeholder="Your domain (e.g. example.com)" className="flex-1 rounded-xl" disabled={ckLoading} />
                <Input value={ckCompetitor} onChange={(e) => setCkCompetitor(e.target.value)} placeholder="Competitor domain (e.g. rival.com)" className="flex-1 rounded-xl" disabled={ckLoading} />
                <Button type="submit" disabled={ckLoading || !ckDomain.trim() || !ckCompetitor.trim()} className="rounded-xl bg-aurora-violet px-5 text-white hover:bg-aurora-violet/90">
                  {ckLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Swords className="mr-2 h-4 w-4" />}
                  Compare
                </Button>
              </div>
              {ckError && <p className="mt-2 text-xs text-red-600">{ckError}</p>}
            </motion.form>

            {ckLoading && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col items-center justify-center rounded-2xl p-12">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Analyzing keywords...</p>
              </motion.div>
            )}

            {!ckLoading && !ckResult && !ckError && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-12 text-center">
                <Swords className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Enter two domains to compare</p>
                <p className="mt-1 text-xs text-muted-foreground/60">We&apos;ll analyze the keyword overlap between your site and a competitor.</p>
              </motion.div>
            )}

            {ckResult && !ckLoading && (
              <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="text-3xl font-bold tabular-nums text-foreground">{ckResult.shared.length}</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">Shared Keywords</div>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="text-3xl font-bold tabular-nums text-emerald-600">{ckResult.uniqueToUser.length}</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">Unique to You</div>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="text-3xl font-bold tabular-nums text-red-500">{ckResult.uniqueToCompetitor.length}</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">Unique to Competitor</div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid gap-4 md:grid-cols-3">
                  <div className="glass rounded-2xl p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Shared Keywords</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ckResult.shared.length === 0 ? <p className="text-xs text-muted-foreground/50">No shared keywords found</p> : ckResult.shared.slice(0, 50).map((kw) => <Badge key={kw} variant="outline" className="rounded-lg border-border bg-secondary/30 text-[11px] text-muted-foreground">{kw}</Badge>)}
                      {ckResult.shared.length > 50 && <span className="text-[11px] text-muted-foreground/50">+{ckResult.shared.length - 50} more</span>}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Your Unique Keywords</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ckResult.uniqueToUser.length === 0 ? <p className="text-xs text-muted-foreground/50">No unique keywords found</p> : ckResult.uniqueToUser.slice(0, 50).map((kw) => <Badge key={kw} variant="outline" className="rounded-lg border-emerald-200 bg-emerald-50 text-[11px] text-foreground">{kw}</Badge>)}
                      {ckResult.uniqueToUser.length > 50 && <span className="text-[11px] text-muted-foreground/50">+{ckResult.uniqueToUser.length - 50} more</span>}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Competitor&apos;s Unique Keywords</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ckResult.uniqueToCompetitor.length === 0 ? <p className="text-xs text-muted-foreground/50">No unique keywords found</p> : ckResult.uniqueToCompetitor.slice(0, 50).map((kw) => <Badge key={kw} variant="outline" className="rounded-lg border-red-200 bg-red-50 text-[11px] text-foreground">{kw}</Badge>)}
                      {ckResult.uniqueToCompetitor.length > 50 && <span className="text-[11px] text-muted-foreground/50">+{ckResult.uniqueToCompetitor.length - 50} more</span>}
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid gap-4 md:grid-cols-2">
                  <div className="glass rounded-2xl p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Your Top Pages</div>
                    <div className="space-y-2">
                      {ckResult.userPages.length === 0 ? <p className="text-xs text-muted-foreground/50">No pages found</p> : ckResult.userPages.slice(0, 15).map((page) => (
                        <div key={page.link} className="rounded-xl bg-secondary/30 px-3 py-2.5">
                          <a href={page.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm font-medium text-foreground hover:underline">
                            <span className="line-clamp-1 flex-1">{page.title}</span>
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Competitor&apos;s Top Pages</div>
                    <div className="space-y-2">
                      {ckResult.competitorPages.length === 0 ? <p className="text-xs text-muted-foreground/50">No pages found</p> : ckResult.competitorPages.slice(0, 15).map((page) => (
                        <div key={page.link} className="rounded-xl bg-secondary/30 px-3 py-2.5">
                          <a href={page.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm font-medium text-foreground hover:underline">
                            <span className="line-clamp-1 flex-1">{page.title}</span>
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
          )
        )}
      </main>

      {/* ─── Footer ─── */}
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

/* ═══════════════════════════════════════════════════════════════════
   Tab 1 — Scan
   ═══════════════════════════════════════════════════════════════════ */

function isValidUrl(input: string): boolean {
  const s = input.trim();
  if (!s) return false;
  // Must contain a dot with something on both sides (e.g. "a.b")
  if (!/^[^\s]+\.[^\s]+$/.test(s) && !/^https?:\/\/.+\..+/.test(s)) return false;
  try {
    new URL(s.startsWith("http") ? s : `https://${s}`);
    return true;
  } catch {
    return false;
  }
}

function ScanTab({
  url,
  setUrl,
  loading,
  onSubmit,
}: {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = isValidUrl(url) && !loading;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-5 w-5 text-foreground" />
        <h2 className="text-lg font-semibold">Single Page Scan</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter a URL to run a full SEO & GEO analysis with 103 checks.
      </p>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all focus:border-aurora-violet/40 focus:ring-2 focus:ring-aurora-violet/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) onSubmit();
            }}
          />
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-foreground/85 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 2 — Compare
   ═══════════════════════════════════════════════════════════════════ */

function CompareTab({
  urls,
  results,
  loading,
  error,
  canAdd,
  canCompare,
  updateUrl,
  addUrl,
  removeUrl,
  runCompare,
  userPlan,
}: {
  urls: string[];
  results: CompareResult[] | null;
  loading: boolean;
  error: string | null;
  canAdd: boolean;
  canCompare: boolean;
  updateUrl: (i: number, v: string) => void;
  addUrl: () => void;
  removeUrl: (i: number) => void;
  runCompare: () => void;
  userPlan: PlanId;
}) {
  const isFree = userPlan === "free";
  const successResults = results?.filter((r): r is AnalysisResult => !isCompareError(r)) ?? [];

  const radarData = (() => {
    if (successResults.length === 0) return [];
    const categories = ["Meta Tags", "Content", "Headings", "Links", "Technical", "Structure", "AI Readability", "Authority"];
    return categories.map((cat) => {
      const point: Record<string, string | number> = { category: cat.replace("AI ", "") };
      successResults.forEach((r, i) => {
        const checks = [...r.seoChecks, ...r.geoChecks].filter((c) => c.category === cat);
        const avg = checks.length > 0 ? Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length) : 0;
        point[`site${i}`] = avg;
      });
      return point;
    });
  })();

  const barData = successResults.map((r, i) => ({
    name: domainFromUrl(r.url),
    overall: r.overallScore,
    seo: r.seoScore,
    geo: r.geoScore,
    index: i,
  }));

  const winner =
    successResults.length >= 2
      ? successResults.reduce((best, r) => (r.overallScore > best.overallScore ? r : best))
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center gap-2">
        <Swords className="h-5 w-5 text-foreground" />
        <h2 className="text-lg font-semibold">Competitor Comparison</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Compare 2-3 websites side by side.</p>

      {/* ── Free user: upgrade overlay ── */}
      {isFree ? (
        <PlanGate label="Competitor Comparison">
          <div className="space-y-3">
            {["yoursite.com", "competitor.com"].map((ph, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${SITE_COLORS[i].bg} text-xs font-bold text-white`}>{i + 1}</div>
                <div className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-muted-foreground/50">{ph}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <div className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-white">Compare</div>
          </div>
        </PlanGate>
      ) : (
      /* ── Paid user: normal input form ── */
      <div className="mb-8 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
        <div className="space-y-3">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${SITE_COLORS[i].bg} text-xs font-bold text-white`}
              >
                {i + 1}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder={i === 0 ? "yoursite.com" : "competitor.com"}
                className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all focus:border-aurora-violet/40 focus:ring-2 focus:ring-aurora-violet/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCompare && !loading) runCompare();
                }}
              />
              {urls.length > 2 && (
                <button
                  onClick={() => removeUrl(i)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {canAdd && (
            <button
              onClick={addUrl}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-aurora-violet/40 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add URL
            </button>
          )}
          <button
            onClick={runCompare}
            disabled={!canCompare || loading}
            className="ml-auto rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-foreground/85 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              "Compare"
            )}
          </button>
        </div>
      </div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-foreground"
        >
          {error}
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-aurora-violet border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">
            Scanning {urls.filter((u) => u.trim()).length} sites in parallel...
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            137 checks per site — this may take 15-30 seconds
          </p>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Winner banner */}
            {winner && successResults.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4"
              >
                <Trophy className="h-5 w-5 text-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {domainFromUrl(winner.url)} wins with {winner.overallScore}/100
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SEO: {winner.seoScore} · GEO: {winner.geoScore}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error results */}
            {results.filter(isCompareError).map((r) => (
              <div key={r.url} className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
                <span className="font-medium text-foreground">{domainFromUrl(r.url)}</span>
                <span className="text-muted-foreground"> — {r.error}</span>
              </div>
            ))}

            {successResults.length >= 2 && (
              <>
                {/* Score cards */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-6 grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${successResults.length}, 1fr)` }}
                >
                  {successResults.map((r, i) => (
                    <div key={r.url} className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${SITE_COLORS[i].bg}`} />
                        <p className="truncate text-sm font-semibold">{domainFromUrl(r.url)}</p>
                        {winner?.url === r.url && <Trophy className="ml-auto h-4 w-4 text-foreground" />}
                      </div>

                      <div className="flex items-end gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Overall</p>
                          <p className={`text-3xl font-bold tabular-nums ${scoreColor(r.overallScore)}`}>{r.overallScore}</p>
                        </div>
                        <div className="flex gap-4 pb-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground">SEO</p>
                            <p className={`text-lg font-semibold tabular-nums ${scoreColor(r.seoScore)}`}>{r.seoScore}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">GEO</p>
                            <p className={`text-lg font-semibold tabular-nums ${scoreColor(r.geoScore)}`}>{r.geoScore}</p>
                          </div>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Errors", value: r.stats.errors, color: "text-foreground" },
                          { label: "Warnings", value: r.stats.warnings, color: "text-foreground" },
                          { label: "Passed", value: r.stats.passed, color: "text-foreground" },
                          { label: "Total", value: r.stats.total, color: "text-muted-foreground" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg bg-secondary/30 px-2 py-1.5">
                            <p className={`text-sm font-semibold tabular-nums ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Charts row */}
                <div className="mb-6 grid gap-4 lg:grid-cols-2">
                  {/* Radar chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
                  >
                    <h3 className="mb-3 text-sm font-semibold">Category Radar</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="oklch(0.4 0 0 / 0.2)" />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }} />
                        {successResults.map((_, i) => (
                          <Radar
                            key={i}
                            name={domainFromUrl(successResults[i].url)}
                            dataKey={`site${i}`}
                            stroke={SITE_COLORS[i].stroke}
                            fill={SITE_COLORS[i].fill}
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        ))}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0 0 / 0.9)",
                            border: "1px solid oklch(0.3 0 0)",
                            borderRadius: "10px",
                            fontSize: "12px",
                            color: "oklch(0.85 0 0)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.6 0 0)" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Bar chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
                  >
                    <h3 className="mb-3 text-sm font-semibold">Score Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0 0 / 0.15)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.15 0 0 / 0.9)",
                            border: "1px solid oklch(0.3 0 0)",
                            borderRadius: "10px",
                            fontSize: "12px",
                            color: "oklch(0.85 0 0)",
                          }}
                        />
                        <Bar dataKey="overall" name="Overall" radius={[4, 4, 0, 0]}>
                          {barData.map((entry) => (
                            <Cell key={entry.name} fill={SITE_COLORS[entry.index].stroke} />
                          ))}
                        </Bar>
                        <Bar dataKey="seo" name="SEO" radius={[4, 4, 0, 0]} opacity={0.6}>
                          {barData.map((entry) => (
                            <Cell key={entry.name} fill={SITE_COLORS[entry.index].stroke} />
                          ))}
                        </Bar>
                        <Bar dataKey="geo" name="GEO" radius={[4, 4, 0, 0]} opacity={0.35}>
                          {barData.map((entry) => (
                            <Cell key={entry.name} fill={SITE_COLORS[entry.index].stroke} />
                          ))}
                        </Bar>
                        <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.6 0 0)" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                {/* Category breakdown table */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm"
                >
                  <div className="border-b border-border/50 px-5 py-4">
                    <h3 className="text-sm font-semibold">Category Breakdown</h3>
                  </div>

                  {/* Table header */}
                  <div
                    className="grid border-b border-border/30 px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    style={{ gridTemplateColumns: `2fr repeat(${successResults.length}, 1fr)` }}
                  >
                    <span>Category</span>
                    {successResults.map((r) => (
                      <span key={r.url} className="text-center">
                        {domainFromUrl(r.url)}
                      </span>
                    ))}
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/20">
                    {(() => {
                      const allCats = new Set<string>();
                      successResults.forEach((r) => {
                        [...r.seoChecks, ...r.geoChecks].forEach((c) => allCats.add(c.category));
                      });

                      return Array.from(allCats).map((cat) => {
                        const scores = successResults.map((r) => {
                          const checks = [...r.seoChecks, ...r.geoChecks].filter((c) => c.category === cat);
                          return checks.length > 0
                            ? Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length)
                            : null;
                        });
                        const maxScore = Math.max(...scores.filter((s): s is number => s !== null));

                        return (
                          <div
                            key={cat}
                            className="grid items-center px-5 py-2.5"
                            style={{ gridTemplateColumns: `2fr repeat(${successResults.length}, 1fr)` }}
                          >
                            <span className="text-sm text-foreground">{cat}</span>
                            {scores.map((score, i) => (
                              <div key={i} className="flex items-center justify-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary/50">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${score ?? 0}%`,
                                      backgroundColor: SITE_COLORS[i].stroke,
                                      opacity: score === maxScore ? 1 : 0.5,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-sm font-medium tabular-nums ${
                                    score !== null && score === maxScore ? scoreColor(score) : "text-muted-foreground"
                                  }`}
                                >
                                  {score ?? "\u2014"}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 3 — Crawl
   ═══════════════════════════════════════════════════════════════════ */

function CrawlTab({
  url,
  setUrl,
  loading,
  error,
  result,
  onSubmit,
}: {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  error: string;
  result: SiteCrawlResult | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center gap-2">
        <Map className="h-5 w-5 text-foreground" />
        <h2 className="text-lg font-semibold">Site Crawl</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Scan up to 20 pages from sitemap or internal links. Get a site-wide SEO & GEO health overview.
      </p>

      {/* Input */}
      <form onSubmit={onSubmit} className="mb-8">
        <div className="flex gap-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 rounded-xl"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
            {loading ? "Crawling..." : "Start Crawl"}
          </Button>
        </div>
        {loading && (
          <p className="mt-2 text-xs text-muted-foreground">Scanning pages in parallel — this may take up to 2 minutes...</p>
        )}
      </form>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="h-5 w-5 text-foreground" />
          <p className="text-sm text-foreground">{error}</p>
        </motion.div>
      )}

      {/* Results */}
      {result && <CrawlResults result={result} />}
    </motion.div>
  );
}

/* ── Crawl Results sub-component ── */

function CrawlResults({ result }: { result: SiteCrawlResult }) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Aggregate stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className={`text-3xl font-bold tabular-nums ${scoreColor(result.aggregate.avgOverall)}`}>
              {result.aggregate.avgOverall}
            </p>
            <p className="text-xs text-muted-foreground">Avg Overall</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold tabular-nums ${scoreColor(result.aggregate.avgSeo)}`}>
              {result.aggregate.avgSeo}
            </p>
            <p className="text-xs text-muted-foreground">Avg SEO</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold tabular-nums ${scoreColor(result.aggregate.avgGeo)}`}>
              {result.aggregate.avgGeo}
            </p>
            <p className="text-xs text-muted-foreground">Avg GEO</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">{result.pagesScanned}</p>
            <p className="text-xs text-muted-foreground">of {result.pagesDiscovered} pages</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <span>{result.sitemapFound ? "Sitemap found" : "No sitemap \u2014 used link discovery"}</span>
          <span>&bull;</span>
          <span>{result.aggregate.totalErrors} total errors</span>
          <span>&bull;</span>
          <span>{result.aggregate.totalWarnings} total warnings</span>
        </div>
      </motion.div>

      {/* Page list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Page-by-Page Results</h3>
        {result.pages
          .sort((a, b) => a.overallScore - b.overallScore)
          .map((page, i) => (
            <motion.div
              key={page.url}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="glass rounded-xl"
            >
              <button
                onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {/* Status icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    page.overallScore >= 80 ? "bg-emerald-50" : page.overallScore >= 50 ? "bg-amber-50" : "bg-red-50"
                  }`}
                >
                  {page.overallScore >= 80 ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : page.overallScore >= 50 ? (
                    <AlertTriangle className="h-4 w-4 text-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 text-foreground" />
                  )}
                </div>

                {/* Page info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{page.pageTitle}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{page.url}</p>
                </div>

                {/* Scores */}
                <div className="hidden gap-3 sm:flex">
                  <div className="text-center">
                    <p className={`text-sm font-bold tabular-nums ${scoreColor(page.overallScore)}`}>{page.overallScore}</p>
                    <p className="text-[9px] text-muted-foreground">Overall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tabular-nums text-muted-foreground">{page.seoScore}</p>
                    <p className="text-[9px] text-muted-foreground">SEO</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tabular-nums text-muted-foreground">{page.geoScore}</p>
                    <p className="text-[9px] text-muted-foreground">GEO</p>
                  </div>
                </div>

                {page.errors > 0 && (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] text-foreground">
                    {page.errors} errors
                  </Badge>
                )}

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    expandedPage === page.url ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedPage === page.url && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border/50 px-4 pb-4 pt-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span>
                      SEO: <strong>{page.seoScore}</strong>
                    </span>
                    <span>
                      GEO: <strong>{page.geoScore}</strong>
                    </span>
                    <span>
                      Errors: <strong className="text-foreground">{page.errors}</strong>
                    </span>
                    <span>
                      Warnings: <strong className="text-foreground">{page.warnings}</strong>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-xl text-xs"
                    onClick={() => window.open(`/results?url=${encodeURIComponent(page.url)}`, "_blank")}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Full Analysis
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
      </div>
    </div>
  );
}
