"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  X,
  Swords,
  Trophy,
  Loader2,
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
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import type { AnalysisResult } from "@/lib/types";

/* ─── Constants ─── */
const SITE_COLORS = [
  { stroke: "oklch(0.62 0.25 290)", fill: "oklch(0.62 0.25 290 / 0.3)", label: "text-foreground", bg: "bg-aurora-violet" },
  { stroke: "oklch(0.65 0.2 250)", fill: "oklch(0.65 0.2 250 / 0.3)", label: "text-foreground", bg: "bg-aurora-blue" },
  { stroke: "oklch(0.72 0.15 200)", fill: "oklch(0.72 0.15 200 / 0.3)", label: "text-foreground", bg: "bg-aurora-cyan" },
];

type CompareResult = AnalysisResult | { url: string; error: string };

function isError(r: CompareResult): r is { url: string; error: string } {
  return "error" in r;
}

/* ─── Helpers ─── */
function scoreColor(s: number) {
  if (s >= 80) return "text-foreground";
  if (s >= 50) return "text-foreground";
  return "text-foreground";
}

function scoreBg(s: number) {
  if (s >= 80) return "bg-emerald-500";
  if (s >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function domainFromUrl(url: string) {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", ""); }
  catch { return url; }
}

/* ─── Component ─── */
export default function ComparePage() {
  const router = useRouter();
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = urls.length < 3;
  const canCompare = urls.filter((u) => u.trim().length > 0).length >= 2;

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function addUrl() {
    if (canAdd) setUrls((prev) => [...prev, ""]);
  }

  function removeUrl(index: number) {
    if (urls.length > 2) setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function runCompare() {
    const validUrls = urls.filter((u) => u.trim().length > 0);
    if (validUrls.length < 2) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compare failed");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Successful results only
  const successResults = results?.filter((r): r is AnalysisResult => !isError(r)) ?? [];

  // Build radar data from all successful results
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

  // Score comparison bar data
  const barData = successResults.map((r, i) => ({
    name: domainFromUrl(r.url),
    overall: r.overallScore,
    seo: r.seoScore,
    geo: r.geoScore,
    index: i,
  }));

  // Winner determination
  const winner = successResults.length >= 2
    ? successResults.reduce((best, r) => (r.overallScore > best.overallScore ? r : best))
    : null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Aurora bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] left-[20%] h-[600px] w-[600px] rounded-full opacity-[0.06] blur-[140px]"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.25 290), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-[100px] right-[15%] h-[500px] w-[500px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.15 200), transparent 65%)" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <UserNav />
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-foreground" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Competitor Comparison</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Compare 2-3 websites side by side</p>
            </div>
          </div>
          <button onClick={() => router.back()} className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </motion.div>

        {/* ─── Input form ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
        >
          <div className="space-y-3">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${SITE_COLORS[i].bg} text-xs font-bold text-white`}>
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
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-foreground">
            {error}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-aurora-violet border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">
              Scanning {urls.filter((u) => u.trim()).length} sites in parallel...
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              137 checks per site — this may take 15-30 seconds
            </p>
          </motion.div>
        )}

        {/* ─── Results ─── */}
        <AnimatePresence>
          {results && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
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
              {results.filter(isError).map((r) => (
                <div key={r.url} className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{domainFromUrl(r.url)}</span>
                  <span className="text-muted-foreground"> — {r.error}</span>
                </div>
              ))}

              {successResults.length >= 2 && (
                <>
                  {/* ─── Score cards ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6 grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${successResults.length}, 1fr)` }}
                  >
                    {successResults.map((r, i) => (
                      <div
                        key={r.url}
                        className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${SITE_COLORS[i].bg}`} />
                          <p className="truncate text-sm font-semibold">{domainFromUrl(r.url)}</p>
                          {winner?.url === r.url && (
                            <Trophy className="ml-auto h-4 w-4 text-foreground" />
                          )}
                        </div>

                        <div className="flex items-end gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Overall</p>
                            <p className={`text-3xl font-bold tabular-nums ${scoreColor(r.overallScore)}`}>
                              {r.overallScore}
                            </p>
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

                  {/* ─── Charts row ─── */}
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
                          <PolarAngleAxis
                            dataKey="category"
                            tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                          />
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
                          <Legend
                            wrapperStyle={{ fontSize: "11px", color: "oklch(0.6 0 0)" }}
                          />
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
                        <BarChart
                          data={barData}
                          margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0 0 / 0.15)" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                            axisLine={false}
                          />
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

                  {/* ─── Category breakdown table ─── */}
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
                    <div className="grid border-b border-border/30 px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      style={{ gridTemplateColumns: `2fr repeat(${successResults.length}, 1fr)` }}
                    >
                      <span>Category</span>
                      {successResults.map((r, i) => (
                        <span key={r.url} className="text-center">{domainFromUrl(r.url)}</span>
                      ))}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border/20">
                      {(() => {
                        // Gather all unique categories
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
                                  <span className={`text-sm font-medium tabular-nums ${score !== null && score === maxScore ? scoreColor(score) : "text-muted-foreground"}`}>
                                    {score ?? "—"}
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
      </main>
    </div>
  );
}
