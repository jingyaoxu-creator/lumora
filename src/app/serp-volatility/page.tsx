"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Loader2,
  Shield,
  Minus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";

/* ─── Types ─── */

interface VolatilityRecord {
  id: string;
  check_date: string;
  category: string;
  score: number;
  details: string | null;
  checked_at: string;
}

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

/* ─── Helpers ─── */

/** Abbreviate a date string to e.g. "Apr 5" */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Group records by category and pick the latest per category */
function groupByCategory(
  records: VolatilityRecord[],
): Map<string, VolatilityRecord[]> {
  const map = new Map<string, VolatilityRecord[]>();
  for (const r of records) {
    const cat = r.category || "General";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(r);
  }
  return map;
}

/* ─── Component ─── */

export default function SerpVolatilityPage() {
  const [data, setData] = useState<VolatilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/serp-volatility");
        if (res.ok) {
          const json = await res.json();
          // API returns descending order — reverse to ascending for chart
          const arr: VolatilityRecord[] = Array.isArray(json) ? json : [];
          setData(arr.slice().reverse());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derived values ── */
  const latestRecord = data.length > 0 ? data[data.length - 1] : null;
  const maxScore =
    data.length > 0 ? Math.max(...data.map((d) => d.score), 1) : 10;
  const last30 = data.slice(-30);

  /* ── Category breakdown ── */
  const categoryMap = groupByCategory(data);
  const hasMultipleCategories = categoryMap.size > 1;

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
                <Activity className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                SERP Intelligence
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              SERP Volatility Monitor
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Track daily fluctuations in Google search results to identify
              algorithm updates and ranking shifts.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {loading ? (
          /* ── Loading state: skeleton shimmer ── */
          <div className="space-y-6">
            {/* Status card skeleton */}
            <div className="glass animate-pulse rounded-2xl p-6">
              <div className="mb-3 h-3 w-32 rounded bg-secondary/60" />
              <div className="flex items-end gap-3">
                <div className="h-12 w-24 rounded-lg bg-secondary/60" />
                <div className="mb-1.5 h-4 w-10 rounded bg-secondary/40" />
                <div className="mb-1.5 ml-auto h-6 w-20 rounded-lg bg-secondary/60" />
              </div>
              <div className="mt-3 h-3 w-48 rounded bg-secondary/40" />
            </div>

            {/* Chart skeleton */}
            <div className="glass animate-pulse rounded-2xl p-6">
              <div className="mb-4 h-3 w-24 rounded bg-secondary/60" />
              <div className="flex items-end gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-secondary/40"
                    style={{ height: `${20 + Math.random() * 60}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : error || data.length === 0 ? (
          /* ── Empty / Error state ── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              No volatility data available yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Data is collected automatically each day.
            </p>
          </motion.div>
        ) : (
          /* ── Dashboard ── */
          <div className="space-y-6">
            {/* ── Current status card ── */}
            {latestRecord && (
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
                      latestRecord.score,
                    )}`}
                  >
                    {latestRecord.score.toFixed(1)}
                  </span>
                  <span className="mb-1.5 text-sm text-muted-foreground">
                    / 10
                  </span>
                  <Badge
                    className={`mb-1.5 ml-auto rounded-lg px-2.5 py-0.5 text-xs font-medium text-white ${volatilityBg(
                      latestRecord.score,
                    )}`}
                  >
                    {latestRecord.score <= 3 && (
                      <Minus className="mr-1 h-3 w-3" />
                    )}
                    {latestRecord.score > 3 && latestRecord.score <= 6 && (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    )}
                    {latestRecord.score > 6 && (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {volatilityLabel(latestRecord.score)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last updated:{" "}
                  {new Date(latestRecord.check_date).toLocaleDateString(
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

            {/* ── 30-day bar chart ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Last 30 Days
              </div>

              {/* Scale labels */}
              <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground/40">
                <span>0</span>
                <span>10</span>
              </div>

              {/* Bars */}
              <div className="flex items-end gap-[3px]">
                {last30.map((day, i) => {
                  const heightPercent = Math.max(
                    (day.score / maxScore) * 100,
                    4,
                  );
                  return (
                    <div
                      key={`${day.check_date}-${day.id}`}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      {/* Bar */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}px` }}
                        transition={{
                          delay: i * 0.02,
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                        className={`w-full rounded-sm ${volatilityBg(
                          day.score,
                        )}`}
                        style={{ minHeight: 4, height: `${heightPercent}px` }}
                        title={`${shortDate(day.check_date)}: ${day.score.toFixed(1)}`}
                      />

                      {/* Date label — show every 5th to avoid crowding */}
                      {i % 5 === 0 ? (
                        <span className="text-[9px] leading-none text-muted-foreground/50">
                          {shortDate(day.check_date)}
                        </span>
                      ) : (
                        <span className="text-[9px] leading-none text-transparent select-none">
                          .
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  0-3 Stable
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  3-6 Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  6-10 Turbulent
                </span>
              </div>
            </motion.div>

            {/* ── Category breakdown (only if multiple categories exist) ── */}
            {hasMultipleCategories && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Category Breakdown
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from(categoryMap.entries()).map(
                    ([category, records]) => {
                      // Records are in ascending order; latest is last
                      const latest = records[records.length - 1];
                      // Compute trend: compare latest to second-latest
                      const prev =
                        records.length >= 2
                          ? records[records.length - 2]
                          : null;
                      const trend = prev
                        ? latest.score - prev.score
                        : 0;

                      return (
                        <div
                          key={category}
                          className="flex items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3"
                        >
                          {/* Score dot */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${volatilityBg(
                              latest.score,
                            )}`}
                          >
                            {latest.score.toFixed(1)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {category}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{volatilityLabel(latest.score)}</span>
                              {trend !== 0 && (
                                <>
                                  <span>·</span>
                                  <span
                                    className={
                                      trend > 0
                                        ? "text-red-500"
                                        : "text-emerald-600"
                                    }
                                  >
                                    {trend > 0 ? "+" : ""}
                                    {trend.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Trend icon */}
                          {trend > 0.5 && (
                            <TrendingUp className="h-4 w-4 shrink-0 text-red-400" />
                          )}
                          {trend < -0.5 && (
                            <TrendingDown className="h-4 w-4 shrink-0 text-emerald-500" />
                          )}
                          {Math.abs(trend) <= 0.5 && (
                            <Minus className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </motion.div>
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
