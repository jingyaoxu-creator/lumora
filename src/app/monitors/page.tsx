"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Bell,
  BellOff,
  Clock,
  Loader2,
  ExternalLink,
  Eye,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AtSign,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

/* ─── Types ─── */

interface Monitor {
  id: string;
  url: string;
  domain: string;
  frequency: "daily" | "weekly";
  notify_on_drop: boolean;
  drop_threshold: number;
  last_score: number | null;
  last_scanned_at: string | null;
  created_at: string;
}

interface DailyVolatility {
  date: string;
  score: number;
}

interface BrandTerm {
  id: string;
  user_id: string;
  term: string;
  exclude_domain: string | null;
  created_at: string;
}

interface BrandMention {
  id: string;
  user_id: string;
  brand_term: string;
  source_url: string;
  source_domain: string;
  title: string;
  snippet: string;
  found_at: string;
}

/* ─── Tab definitions ─── */

const TABS = [
  { key: "site-monitoring", label: "Site Monitoring", icon: Eye, plan: "pro" as const },
  { key: "serp-volatility", label: "SERP Volatility", icon: Activity, plan: null },
  { key: "brand-mentions", label: "Brand Mentions", icon: AtSign, plan: "pro" as const },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ─── Volatility helpers ─── */

function volatilityColor(score: number): string {
  if (score <= 3) return "text-emerald-600";
  if (score <= 6) return "text-amber-500";
  return "text-red-500";
}

function volatilityBg(score: number): string {
  if (score <= 3) return "bg-emerald-500";
  if (score <= 6) return "bg-amber-500";
  return "bg-red-500";
}

function volatilityLabel(score: number): string {
  if (score <= 3) return "Stable";
  if (score <= 6) return "Moderate";
  return "Turbulent";
}

/* ─── Component ─── */

export default function MonitorsPage() {
  const router = useRouter();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("site-monitoring");

  /* ── Site monitoring state ── */
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [error, setError] = useState("");

  /* ── SERP volatility state ── */
  const [volatilityData, setVolatilityData] = useState<DailyVolatility[]>([]);
  const [loadingVolatility, setLoadingVolatility] = useState(true);
  const [volatilityError, setVolatilityError] = useState(false);

  /* ── Brand mentions state ── */
  const [bmTerms, setBmTerms] = useState<BrandTerm[]>([]);
  const [bmMentions, setBmMentions] = useState<BrandMention[]>([]);
  const [bmLoading, setBmLoading] = useState(false);
  const [bmAdding, setBmAdding] = useState(false);
  const [bmNewTerm, setBmNewTerm] = useState("");
  const [bmExcludeDomain, setBmExcludeDomain] = useState("");
  const [bmError, setBmError] = useState("");
  const [bmLoaded, setBmLoaded] = useState(false);

  /* ── Load monitors ── */
  async function loadMonitors() {
    try {
      const res = await fetch("/api/monitors");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        setMonitors(await res.json());
      }
    } finally {
      setLoadingMonitors(false);
    }
  }

  /* ── Load volatility ── */
  async function loadVolatility() {
    try {
      const res = await fetch("/api/serp-volatility");
      if (res.ok) {
        const data = await res.json();
        setVolatilityData(Array.isArray(data) ? data : data.days ?? []);
      } else {
        setVolatilityError(true);
      }
    } catch {
      setVolatilityError(true);
    } finally {
      setLoadingVolatility(false);
    }
  }

  useEffect(() => {
    loadMonitors();
    loadVolatility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "brand-mentions" && !bmLoaded) {
      loadBrandMentions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ── Add monitor ── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim() || adding) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          frequency,
          notifyOnDrop: true,
          dropThreshold: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add monitor");
        return;
      }
      setNewUrl("");
      await loadMonitors();
    } finally {
      setAdding(false);
    }
  }

  /* ── Delete monitor ── */
  async function handleDelete(id: string) {
    await fetch("/api/monitors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }

  /* ── Load brand mentions ── */
  async function loadBrandMentions() {
    setBmLoading(true);
    try {
      const res = await fetch("/api/brand-mentions");
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) {
        const data = await res.json();
        setBmTerms(data.terms ?? []);
        setBmMentions(data.mentions ?? []);
      }
    } finally {
      setBmLoading(false);
      setBmLoaded(true);
    }
  }

  async function handleBmAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!bmNewTerm.trim() || bmAdding) return;
    setBmAdding(true);
    setBmError("");
    try {
      const res = await fetch("/api/brand-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-term", term: bmNewTerm.trim(), excludeDomain: bmExcludeDomain.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setBmError(data.error ?? "Failed to add brand term"); return; }
      setBmNewTerm("");
      setBmExcludeDomain("");
      await loadBrandMentions();
    } finally {
      setBmAdding(false);
    }
  }

  async function handleBmDelete(term: BrandTerm) {
    await fetch("/api/brand-mentions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: term.id }),
    });
    setBmTerms((prev) => prev.filter((t) => t.id !== term.id));
    setBmMentions((prev) => prev.filter((m) => m.brand_term !== term.term));
  }

  async function handleBmRefresh(term: string) {
    setBmError("");
    try {
      const res = await fetch("/api/brand-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", term }),
      });
      if (res.ok) { await loadBrandMentions(); }
      else { const data = await res.json(); setBmError(data.error ?? "Failed to refresh"); }
    } catch { setBmError("Failed to refresh mentions"); }
  }

  /* ── Current volatility (latest day) ── */
  const latestVolatility =
    volatilityData.length > 0
      ? volatilityData[volatilityData.length - 1]
      : null;

  /* ── Max bar height for chart scaling ── */
  const maxScore = volatilityData.length > 0
    ? Math.max(...volatilityData.map((d) => d.score), 1)
    : 10;

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SiteNav />

      {/* ─── Hero header ─── */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-secondary/50 to-white pt-28 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,0,0,0.03),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06]">
                <Eye className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Monitoring Hub
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              {t("monitoring.title") !== "monitoring.title"
                ? t("monitoring.title")
                : "Site Monitoring & Intelligence"}
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {t("features.monitoring.subtitle") !== "features.monitoring.subtitle"
                ? t("features.monitoring.subtitle")
                : "Track your sites, detect score regressions, and monitor SERP volatility — all in one place."}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="border-b border-border/40 bg-white">
        <div className="mx-auto max-w-4xl px-6 pt-4 pb-0">
          <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
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
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {/* ═══ Tab 1: Site Monitoring ═══ */}
        {activeTab === "site-monitoring" && (
          <div>
            {/* Add new monitor */}
            <motion.form
              onSubmit={handleAdd}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mb-8 rounded-2xl p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 rounded-xl"
                  disabled={adding}
                />
                <div className="flex gap-2">
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as "daily" | "weekly")
                    }
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={adding || !newUrl.trim()}
                    className="rounded-xl bg-aurora-violet px-4 text-white hover:bg-aurora-violet/90"
                  >
                    {adding ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-xs text-foreground">{error}</p>
              )}
            </motion.form>

            {/* Monitor list */}
            {loadingMonitors ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : monitors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-12 text-center"
              >
                <Eye className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No monitored sites yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Add a URL above to start automatic monitoring
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {monitors.map((monitor, i) => (
                  <motion.div
                    key={monitor.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass flex items-center gap-3 rounded-xl p-4"
                  >
                    {/* Score */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        monitor.last_score === null
                          ? "bg-secondary/50 text-muted-foreground"
                          : monitor.last_score >= 80
                          ? "bg-emerald-50 text-foreground"
                          : monitor.last_score >= 50
                          ? "bg-amber-50 text-foreground"
                          : "bg-red-50 text-foreground"
                      }`}
                    >
                      {monitor.last_score ?? "—"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {monitor.domain}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">{monitor.frequency}</span>
                        {monitor.last_scanned_at && (
                          <>
                            <span>•</span>
                            <span>
                              Last:{" "}
                              {new Date(
                                monitor.last_scanned_at,
                              ).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        monitor.notify_on_drop
                          ? "border-emerald-200 bg-emerald-50 text-foreground"
                          : "border-border bg-secondary/30 text-muted-foreground"
                      }`}
                    >
                      {monitor.notify_on_drop ? (
                        <Bell className="mr-1 h-3 w-3" />
                      ) : (
                        <BellOff className="mr-1 h-3 w-3" />
                      )}
                      {monitor.notify_on_drop
                        ? `Alert on -${monitor.drop_threshold}`
                        : "No alerts"}
                    </Badge>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() =>
                        router.push(
                          `/results?url=${encodeURIComponent(monitor.url)}`,
                        )
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleDelete(monitor.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 2: SERP Volatility ═══ */}
        {activeTab === "serp-volatility" && (
          <div>
            {loadingVolatility ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : volatilityError || volatilityData.length === 0 ? (
              /* ── Empty state ── */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-12 text-center"
              >
                <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No volatility data yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Data is collected automatically each day.
                </p>
              </motion.div>
            ) : (
              /* ── Volatility dashboard ── */
              <div className="space-y-6">
                {/* Current score card */}
                {latestVolatility && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6"
                  >
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                      Current Volatility
                    </div>
                    <div className="flex items-end gap-3">
                      <span
                        className={`text-5xl font-bold tabular-nums ${volatilityColor(
                          latestVolatility.score,
                        )}`}
                      >
                        {latestVolatility.score.toFixed(1)}
                      </span>
                      <span className="mb-1.5 text-sm text-muted-foreground">
                        / 10
                      </span>
                      <Badge
                        className={`mb-1.5 ml-auto rounded-lg px-2.5 py-0.5 text-xs font-medium text-white ${volatilityBg(
                          latestVolatility.score,
                        )}`}
                      >
                        {latestVolatility.score <= 3 && (
                          <Minus className="mr-1 h-3 w-3" />
                        )}
                        {latestVolatility.score > 3 &&
                          latestVolatility.score <= 6 && (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          )}
                        {latestVolatility.score > 6 && (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {volatilityLabel(latestVolatility.score)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last updated:{" "}
                      {new Date(latestVolatility.date).toLocaleDateString(
                        undefined,
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </motion.div>
                )}

                {/* 7-day bar chart */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="glass rounded-2xl p-6"
                >
                  <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                    Last 7 Days
                  </div>

                  {/* Scale labels */}
                  <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground/40">
                    <span>0</span>
                    <span>10</span>
                  </div>

                  {/* Bars */}
                  <div className="flex items-end gap-2">
                    {volatilityData.slice(-7).map((day, i) => {
                      const heightPercent = Math.max(
                        (day.score / maxScore) * 100,
                        4,
                      );
                      return (
                        <div
                          key={day.date}
                          className="flex flex-1 flex-col items-center gap-1.5"
                        >
                          {/* Score label */}
                          <span
                            className={`text-[11px] font-semibold tabular-nums ${volatilityColor(
                              day.score,
                            )}`}
                          >
                            {day.score.toFixed(1)}
                          </span>

                          {/* Bar */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}px` }}
                            transition={{
                              delay: i * 0.06,
                              duration: 0.4,
                              ease: "easeOut",
                            }}
                            className={`w-full max-w-[48px] rounded-md ${volatilityBg(
                              day.score,
                            )}`}
                            style={{
                              minHeight: 4,
                              height: `${heightPercent}px`,
                            }}
                          />

                          {/* Date label */}
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(day.date).toLocaleDateString(undefined, {
                              weekday: "short",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      0–3 Stable
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                      3–6 Moderate
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      6–10 Turbulent
                    </span>
                  </div>
                </motion.div>

                {/* Daily list */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass rounded-2xl p-6"
                >
                  <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                    Daily Breakdown
                  </div>
                  <div className="space-y-2">
                    {volatilityData
                      .slice(-7)
                      .reverse()
                      .map((day, i) => (
                        <motion.div
                          key={day.date}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3"
                        >
                          <span className="text-sm text-muted-foreground">
                            {new Date(day.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold tabular-nums ${volatilityColor(
                                day.score,
                              )}`}
                            >
                              {day.score.toFixed(1)}
                            </span>
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${volatilityBg(
                                day.score,
                              )}`}
                            />
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 3: Brand Mentions ═══ */}
        {activeTab === "brand-mentions" && (
          <div>
            <motion.form
              onSubmit={handleBmAdd}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mb-8 rounded-2xl p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={bmNewTerm} onChange={(e) => setBmNewTerm(e.target.value)} placeholder="Brand name or term" className="flex-1 rounded-xl" disabled={bmAdding} />
                <Input value={bmExcludeDomain} onChange={(e) => setBmExcludeDomain(e.target.value)} placeholder="Exclude domain (optional)" className="flex-1 rounded-xl" disabled={bmAdding} />
                <Button type="submit" disabled={bmAdding || !bmNewTerm.trim()} className="rounded-xl bg-aurora-violet px-4 text-white hover:bg-aurora-violet/90">
                  {bmAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add
                </Button>
              </div>
              {bmError && <p className="mt-2 text-xs text-red-600">{bmError}</p>}
            </motion.form>

            {bmTerms.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6 flex flex-wrap items-center gap-2">
                {bmTerms.map((term) => (
                  <Badge key={term.id} variant="outline" className="flex items-center gap-1.5 rounded-lg border-border bg-secondary/40 px-3 py-1.5 text-sm">
                    <AtSign className="h-3 w-3 text-muted-foreground" />
                    {term.term}
                    <button type="button" onClick={() => handleBmRefresh(term.term)} className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground" title="Refresh mentions">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => handleBmDelete(term)} className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground" title="Remove term">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </motion.div>
            )}

            {bmLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass animate-pulse rounded-xl p-4">
                    <div className="mb-2 h-4 w-2/3 rounded bg-secondary/60" />
                    <div className="mb-2 h-3 w-1/4 rounded bg-secondary/40" />
                    <div className="h-3 w-full rounded bg-secondary/30" />
                  </div>
                ))}
              </div>
            ) : bmMentions.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-12 text-center">
                <AtSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No brand terms tracked yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Add a brand name above to discover where it&apos;s being mentioned.</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {bmMentions.map((mention, i) => (
                  <motion.div key={mention.id ?? `${mention.source_url}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass rounded-xl p-4">
                    <div className="mb-1.5 flex items-start gap-2">
                      <a href={mention.source_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium hover:underline">
                        <span className="truncate">{mention.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                    </div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-md border-border bg-secondary/30 text-[10px] text-muted-foreground">{mention.source_domain}</Badge>
                      <Badge variant="outline" className="rounded-md border-aurora-violet/20 bg-aurora-violet/5 text-[10px] text-foreground">
                        <AtSign className="mr-0.5 h-2.5 w-2.5" />{mention.brand_term}
                      </Badge>
                      {mention.found_at && <span className="text-[10px] text-muted-foreground/60">{new Date(mention.found_at).toLocaleDateString()}</span>}
                    </div>
                    {mention.snippet && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{mention.snippet}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
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
