"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Quote,
  Target,
  Zap,
  Activity,
  TrendingUp,
  Shield,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { ScoreRing } from "@/components/score-ring";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AIOverviewSummary } from "@/lib/ai-overview-tracker";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface CitationSimulation {
  query: string;
  wouldCite: boolean;
  confidence: number;
  citedParagraphs: { text: string; reason: string }[];
  missingFactors: string[];
  improvementSuggestions: string[];
  competitiveEdge: string;
}

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

/* ================================================================== */
/*  Tab definitions                                                    */
/* ================================================================== */

type TabKey = "ai-overview" | "citation-sim" | "citation-tracking";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "ai-overview", label: "AI Overview", icon: Eye },
  { key: "citation-sim", label: "Citation Sim", icon: Target },
  { key: "citation-tracking", label: "Citation Tracking", icon: Activity },
];

/* ================================================================== */
/*  Shared sub-components                                              */
/* ================================================================== */

/* ─── TrendSparkline (for Citation Tracking) ─── */

function TrendSparkline({ history }: { history: HistoryPoint[] }) {
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

  function yPos(p: HistoryPoint) {
    if (!p.hasAIOverview) return padding + usableHeight / 2;
    return p.isCited ? padding + 2 : padding + usableHeight - 2;
  }

  function dotColor(p: HistoryPoint) {
    if (!p.hasAIOverview) return "#9ca3af";
    return p.isCited ? "#22c55e" : "#ef4444";
  }

  const coords = points.map((p, i) => ({
    x: padding + i * step,
    y: yPos(p),
    color: dotColor(p),
    point: p,
  }));

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

/* ─── StatusBadge (for Citation Tracking) ─── */

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

/* ================================================================== */
/*  AI Overview Results                                                */
/* ================================================================== */

function AIOverviewResults({ data }: { data: AIOverviewSummary }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {data.stats.totalQueries}
            </p>
            <p className="text-[11px] text-muted-foreground">Queries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {data.stats.queriesWithAIO}
            </p>
            <p className="text-[11px] text-muted-foreground">Have AI Overview</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {data.stats.domainCitedCount}
            </p>
            <p className="text-[11px] text-muted-foreground">You&apos;re Cited</p>
          </div>
          <div className="text-center">
            <p
              className={`text-2xl font-bold tabular-nums ${
                data.stats.citationRate >= 50
                  ? "text-foreground"
                  : data.stats.citationRate > 0
                  ? "text-foreground"
                  : "text-foreground"
              }`}
            >
              {data.stats.citationRate}%
            </p>
            <p className="text-[11px] text-muted-foreground">Citation Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-muted-foreground">
              {data.stats.avgOrganicPosition ?? "\u2014"}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg Organic Pos</p>
          </div>
        </div>
      </motion.div>

      {/* Query results */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Per-Query Results
        </h3>
        {data.queries.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.5) }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  q.domainCited
                    ? "bg-emerald-50"
                    : q.hasAIOverview
                    ? "bg-amber-50"
                    : "bg-secondary/50"
                }`}
              >
                {q.domainCited ? (
                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                ) : q.hasAIOverview ? (
                  <XCircle className="h-4 w-4 text-foreground" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  &ldquo;{q.query}&rdquo;
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {q.hasAIOverview ? (
                    <Badge
                      variant="outline"
                      className="bg-aurora-violet/5 text-foreground border-aurora-violet/20 text-[10px]"
                    >
                      AI Overview ({q.totalSources} sources)
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      No AI Overview
                    </Badge>
                  )}

                  {q.domainCited ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-foreground border-emerald-200 text-[10px]"
                    >
                      Cited (#{q.position})
                    </Badge>
                  ) : (
                    q.hasAIOverview && (
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-foreground border-red-200 text-[10px]"
                      >
                        Not Cited
                      </Badge>
                    )
                  )}

                  {q.topOrganicPosition && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Organic #{q.topOrganicPosition}
                    </Badge>
                  )}
                </div>

                {q.snippet && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    &ldquo;{q.snippet}&rdquo;
                  </p>
                )}

                {q.citedUrl && (
                  <a
                    href={q.citedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-foreground hover:underline"
                  >
                    {q.citedUrl.length > 60
                      ? q.citedUrl.slice(0, 57) + "..."
                      : q.citedUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Citation Sim Results                                               */
/* ================================================================== */

function CitationResults({ data }: { data: CitationSimulation }) {
  return (
    <div className="space-y-6">
      {/* Would Cite card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <ScoreRing
            score={data.confidence}
            label="Confidence"
            size={140}
            color={data.wouldCite ? "#22c55e" : "#ef4444"}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2 flex items-center justify-center gap-3 sm:justify-start">
              {data.wouldCite ? (
                <CheckCircle2 className="h-8 w-8 text-foreground" />
              ) : (
                <XCircle className="h-8 w-8 text-foreground" />
              )}
              <span className="text-3xl font-bold text-foreground">
                {data.wouldCite ? "Would Cite" : "Would Not Cite"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              For the query{" "}
              <span className="font-medium text-foreground">
                &ldquo;{data.query}&rdquo;
              </span>
              , an AI search engine has a{" "}
              <span className="font-semibold tabular-nums">
                {data.confidence}%
              </span>{" "}
              likelihood of citing your page.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cited Paragraphs */}
      {data.citedParagraphs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Quote className="h-4 w-4 text-foreground" />
            Cited Paragraphs
          </h3>
          <div className="space-y-4">
            {data.citedParagraphs.map((para, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="relative rounded-xl border border-border/60 bg-background/50 p-4"
              >
                <div className="absolute -left-px top-3 h-8 w-1 rounded-r-full bg-aurora-violet" />
                <p className="mb-2 pl-3 text-sm italic text-foreground/90">
                  &ldquo;{para.text}&rdquo;
                </p>
                <Badge
                  variant="outline"
                  className="ml-3 border-aurora-violet/20 bg-aurora-violet/5 text-[10px] text-foreground"
                >
                  {para.reason}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Missing Factors */}
      {data.missingFactors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-foreground" />
            Missing Factors
          </h3>
          <ul className="space-y-2">
            {data.missingFactors.map((factor, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {factor}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Improvement Suggestions */}
      {data.improvementSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-foreground" />
            Improvement Suggestions
          </h3>
          <ul className="space-y-3">
            {data.improvementSuggestions.map((suggestion, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.04 }}
                className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aurora-violet/10 text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground/85">{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Competitive Edge */}
      {data.competitiveEdge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-aurora-violet/20 bg-aurora-violet/5 p-6"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style={{ background: "#7850DC" }}
          />
          <h3 className="relative mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="h-4 w-4" />
            Competitive Edge
          </h3>
          <p className="relative text-sm leading-relaxed text-foreground/85">
            {data.competitiveEdge}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Tab 1 — AI Overview                                                */
/* ================================================================== */

function AIOverviewTab() {
  const [domain, setDomain] = useState("");
  const [queries, setQueries] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIOverviewSummary | null>(null);

  function addQuery() {
    if (queries.length < 20) {
      setQueries([...queries, ""]);
    }
  }

  function removeQuery(idx: number) {
    if (queries.length > 1) {
      setQueries(queries.filter((_, i) => i !== idx));
    }
  }

  function updateQuery(idx: number, value: string) {
    const updated = [...queries];
    updated[idx] = value;
    setQueries(updated);
  }

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const validQueries = queries.map((q) => q.trim()).filter(Boolean);
    if (!domain.trim() || validQueries.length === 0 || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), queries: validQueries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tracking failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Input form */}
      <motion.form
        onSubmit={handleTrack}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">
            Your Domain
          </label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="rounded-xl"
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">
            Search Queries
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Enter keywords that your target audience would search for.
          </p>
          <div className="space-y-2">
            {queries.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={q}
                  onChange={(e) => updateQuery(i, e.target.value)}
                  placeholder={`Query ${i + 1}, e.g. "best seo tools 2026"`}
                  className="flex-1 rounded-xl"
                  disabled={loading}
                />
                {queries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuery(i)}
                    className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {queries.length < 20 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addQuery}
              className="mt-2 rounded-lg text-xs text-muted-foreground"
              disabled={loading}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Query
            </Button>
          )}
        </div>

        <Button
          type="submit"
          disabled={
            loading ||
            !domain.trim() ||
            queries.every((q) => !q.trim())
          }
          className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {loading ? "Checking..." : "Track AI Overviews"}
        </Button>

        {loading && (
          <p className="mt-2 text-xs text-muted-foreground">
            Querying Google for each keyword — this may take a moment...
          </p>
        )}

        {error && (
          <p className="mt-2 text-xs text-foreground">{error}</p>
        )}
      </motion.form>

      {/* Results */}
      {result && <AIOverviewResults data={result} />}
    </div>
  );
}

/* ================================================================== */
/*  Tab 2 — Citation Sim                                               */
/* ================================================================== */

function CitationSimTab() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CitationSimulation | null>(null);

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !query.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/citation-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Simulation failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Input form */}
      <motion.form
        onSubmit={handleSimulate}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">Page URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/your-page"
            className="rounded-xl"
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium">
            Search Query
          </label>
          <p className="mb-1.5 text-xs text-muted-foreground">
            What would someone search to find this page?
          </p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "best project management tools for startups"'
            className="rounded-xl"
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !url.trim() || !query.trim()}
          className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {loading ? "Simulating..." : "Simulate"}
        </Button>

        {loading && (
          <p className="mt-2 text-xs text-muted-foreground">
            Analyzing your page against the query — this may take a moment...
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </motion.form>

      {/* Results */}
      {result && <CitationResults data={result} />}
    </div>
  );
}

/* ================================================================== */
/*  Tab 3 — Citation Tracking                                          */
/* ================================================================== */

function CitationTrackingTab() {
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

  const fetchData = useCallback(
    async (d: string) => {
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
    },
    [router],
  );

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
    <div className="space-y-6">
      {/* Domain search + Add Query form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
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
              placeholder='Add a query to track, e.g. "best SEO tools"'
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
          className="glass flex items-center gap-3 rounded-2xl p-5 text-foreground"
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
              <ScoreRing
                score={data.overallCitationRate}
                label="Citation Rate"
                size={120}
                strokeWidth={7}
                color="oklch(0.65 0.22 285)"
              />
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

                    <div className="flex items-center gap-2">
                      <TrendSparkline history={q.history} />
                    </div>

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
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function AISearchPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ai-overview");
  const t = useTranslation();

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
                <Bot className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                AI Search Intelligence
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              AI Search Tools
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Track AI Overview presence, simulate citations, and monitor your
              citation status over time.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="border-b border-border/40 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-3">
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
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {activeTab === "ai-overview" && <AIOverviewTab />}
        {activeTab === "citation-sim" && <CitationSimTab />}
        {activeTab === "citation-tracking" && (
          <Suspense>
            <CitationTrackingTab />
          </Suspense>
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
