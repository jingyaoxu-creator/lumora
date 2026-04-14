"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import type { AIOverviewSummary } from "@/lib/ai-overview-tracker";

export default function AIOverviewPage() {
  const router = useRouter();
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
              <Eye className="h-6 w-6 text-foreground" />
              AI Overview Tracker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Check if your site appears in Google&apos;s AI Overview for your
              target keywords.
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

        {/* Input form */}
        <motion.form
          onSubmit={handleTrack}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-6"
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
    </div>
  );
}

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
            <p
              className={`text-2xl font-bold tabular-nums ${
                data.stats.domainCitedCount > 0
                  ? "text-foreground"
                  : "text-foreground"
              }`}
            >
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
              {data.stats.avgOrganicPosition ?? "—"}
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
              {/* Status icon */}
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
