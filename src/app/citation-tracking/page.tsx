"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  Activity,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import { ScoreRing } from "@/components/score-ring";

/* ─── Types ─── */

interface HistoryPoint {
  checkedAt: string;
  isCited: boolean;
  position: number | null;
  hasAIOverview: boolean;
  totalSources: number;
  organicPosition: number | null;
  snippet: string | null;
}

interface TrackedQuery {
  query: string;
  history: HistoryPoint[];
  currentStatus: "cited" | "not_cited" | "no_overview";
  citationRate: number;
}

interface CitationData {
  domain: string;
  queries: TrackedQuery[];
  overallCitationRate: number;
  totalChecks: number;
}

/* ─── Sparkline SVG ─── */

function TrendSparkline({ history }: { history: HistoryPoint[] }) {
  // Take last 14 data points
  const points = history.slice(-14);
  if (points.length === 0) {
    return (
      <div className="flex h-8 items-center justify-center text-[10px] text-muted-foreground">
        No data yet
      </div>
    );
  }

  const width = 200;
  const height = 32;
  const padding = 6;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const step = points.length > 1 ? usableWidth / (points.length - 1) : 0;

  // Y positions: cited = top, not cited = bottom, no overview = middle
  function yPos(p: HistoryPoint) {
    if (!p.hasAIOverview) return padding + usableHeight / 2;
    return p.isCited ? padding + 2 : padding + usableHeight - 2;
  }

  function dotColor(p: HistoryPoint) {
    if (!p.hasAIOverview) return "#9ca3af"; // gray
    return p.isCited ? "#22c55e" : "#ef4444"; // green / red
  }

  const coords = points.map((p, i) => ({
    x: padding + i * step,
    y: yPos(p),
    color: dotColor(p),
    point: p,
  }));

  // Build the line path
  const linePath =
    coords.length > 1
      ? coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
      : "";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[200px]"
    >
      {/* Connecting line */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="oklch(0.65 0.22 285 / 0.3)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {/* Dots */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill={c.color}>
          <title>
            {new Date(c.point.checkedAt).toLocaleDateString()} —{" "}
            {!c.point.hasAIOverview
              ? "No AI Overview"
              : c.point.isCited
              ? `Cited #${c.point.position}`
              : "Not cited"}
          </title>
        </circle>
      ))}
    </svg>
  );
}

/* ─── Status badge ─── */

function StatusBadge({ status }: { status: TrackedQuery["currentStatus"] }) {
  const config = {
    cited: {
      label: "Cited",
      className: "border-emerald-200 bg-emerald-50 text-foreground",
    },
    not_cited: {
      label: "Not Cited",
      className: "border-red-200 bg-red-50 text-foreground",
    },
    no_overview: {
      label: "No Overview",
      className: "border-border bg-secondary/30 text-muted-foreground",
    },
  }[status];

  return (
    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
      {config.label}
    </Badge>
  );
}

/* ─── Page ─── */

export default function CitationTrackingPage() {
  return (
    <Suspense>
      <CitationTrackingContent />
    </Suspense>
  );
}

function CitationTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [domain, setDomain] = useState(searchParams.get("domain") ?? "");
  const [data, setData] = useState<CitationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add query form
  const [newQuery, setNewQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchData = useCallback(async (d: string) => {
    if (!d.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/citation-tracking?domain=${encodeURIComponent(d.trim())}&days=30`,
      );
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to load data");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Load data on mount if domain is in URL
  useEffect(() => {
    const d = searchParams.get("domain");
    if (d) {
      setDomain(d);
      fetchData(d);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (domain.trim()) {
      fetchData(domain.trim());
    }
  }

  async function handleAddQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuery.trim() || adding || !domain.trim()) return;
    setAdding(true);
    setAddError("");

    try {
      const res = await fetch("/api/citation-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), query: newQuery.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.error ?? "Failed to add query");
        return;
      }
      setNewQuery("");
      // Refresh data
      await fetchData(domain.trim());
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteQuery(query: string) {
    try {
      const res = await fetch("/api/citation-tracking", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), query }),
      });
      if (res.ok) {
        // Remove from local state immediately
        setData((prev) =>
          prev
            ? { ...prev, queries: prev.queries.filter((q) => q.query !== query) }
            : prev,
        );
      }
    } catch {
      // silent fail — data will refresh on next load
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
        <div
          className="absolute -top-[100px] -right-[100px] h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.2 285), transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-[80px] -left-[80px] h-[400px] w-[400px] rounded-full opacity-[0.08] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.18 250), transparent 65%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <UserNav />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-6 w-6 text-foreground" />
              Citation Tracking
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your AI search citation status over time
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Domain search + Add Query form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-6 rounded-2xl p-5"
        >
          {/* Domain input */}
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 rounded-xl"
            />
            <Button
              type="submit"
              disabled={loading || !domain.trim()}
              className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Load
            </Button>
          </form>

          {/* Add query (shown only when domain is loaded) */}
          {data && (
            <form
              onSubmit={handleAddQuery}
              className="mt-4 flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row"
            >
              <Input
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                placeholder="Add a query to track, e.g. &quot;best SEO tools&quot;"
                className="flex-1 rounded-xl"
                disabled={adding}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={adding || !newQuery.trim()}
                className="rounded-xl"
              >
                {adding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Track Query
              </Button>
            </form>
          )}
          {addError && (
            <p className="mt-2 flex items-center gap-1 text-xs text-foreground">
              <AlertCircle className="h-3 w-3" />
              {addError}
            </p>
          )}
        </motion.div>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mb-6 flex items-center gap-3 rounded-2xl p-5 text-foreground"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Dashboard */}
        {!loading && data && (
          <div className="space-y-6">
            {/* Overview stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
                {/* Citation rate ring */}
                <ScoreRing
                  score={data.overallCitationRate}
                  label="Citation Rate"
                  size={120}
                  strokeWidth={7}
                  color="oklch(0.65 0.22 285)"
                />

                {/* Stat cards */}
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-secondary/30 p-4 text-center">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {data.totalChecks}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Total Checks
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/30 p-4 text-center">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {data.queries.length}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Queries Tracked
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-secondary/30 p-4 text-center sm:col-span-1">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {data.queries.filter((q) => q.currentStatus === "cited").length}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Currently Cited
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Per-query cards */}
            {data.queries.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-12 text-center"
              >
                <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No queries tracked yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Add a search query above to start tracking citations
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Tracked Queries
                </h2>
                {data.queries.map((q, i) => (
                  <motion.div
                    key={q.query}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.04 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* Query info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            &ldquo;{q.query}&rdquo;
                          </p>
                          <StatusBadge status={q.currentStatus} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="font-medium tabular-nums">
                            {q.citationRate}% citation rate
                          </span>
                          <span className="text-border">|</span>
                          <span>
                            {q.history.length} check{q.history.length !== 1 && "s"}
                          </span>
                          {q.history.length > 0 && (
                            <>
                              <span className="text-border">|</span>
                              <span>
                                Last:{" "}
                                {new Date(
                                  q.history[q.history.length - 1].checkedAt,
                                ).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div className="flex items-center gap-2">
                        <TrendSparkline history={q.history} />
                      </div>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleDeleteQuery(q.query)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-5 pt-2 text-[11px] text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Cited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Not Cited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
                No AI Overview
              </span>
            </motion.div>
          </div>
        )}

        {/* Empty state — no domain searched yet */}
        {!loading && !data && !error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              Enter a domain to view citation tracking data
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              The domain must be in your monitored sites list
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
