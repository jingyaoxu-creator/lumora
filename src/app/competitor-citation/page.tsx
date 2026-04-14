"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CompetitorSource {
  url: string;
  domain: string;
  title: string;
  position: number;
  snippet: string;
  avgParagraphScore: number;
  topFactors: string[];
}

interface CitationGapAnalysis {
  query: string;
  userUrl: string;
  userDomain: string;
  userParagraphScore: number;
  hasAIOverview: boolean;
  userIsCited: boolean;
  competitors: CompetitorSource[];
  gaps: string[];
  strengths: string[];
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function CompetitorCitationPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CitationGapAnalysis | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !query.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/competitor-citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
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
              "radial-gradient(circle, oklch(0.65 0.18 290), transparent 65%)",
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
              <Swords className="h-6 w-6 text-foreground" />
              Competitor Citation Analysis
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              See who AI search engines cite instead of you and why.
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
          onSubmit={handleAnalyze}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-6"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">
              Your URL
            </label>
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
              The query you want to rank for in AI search results.
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
            {loading ? "Analyzing..." : "Analyze Competitors"}
          </Button>

          {loading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fetching competitor data and scoring pages — this may take a
              moment...
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
        {result && <AnalysisResults data={result} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results                                                           */
/* ------------------------------------------------------------------ */

function AnalysisResults({ data }: { data: CitationGapAnalysis }) {
  const avgCompetitorScore =
    data.competitors.length > 0
      ? Math.round(
          data.competitors.reduce((s, c) => s + c.avgParagraphScore, 0) /
            data.competitors.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-foreground" />
          Overview
        </h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* AI Overview */}
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center">
              {data.hasAIOverview ? (
                <CheckCircle2 className="h-5 w-5 text-foreground" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">AI Overview</p>
            <Badge
              variant="outline"
              className={`mt-1 text-[10px] ${
                data.hasAIOverview
                  ? "border-emerald-200 bg-emerald-50 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {data.hasAIOverview ? "Found" : "Not Found"}
            </Badge>
          </div>

          {/* User cited */}
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center">
              {data.userIsCited ? (
                <CheckCircle2 className="h-5 w-5 text-foreground" />
              ) : (
                <XCircle className="h-5 w-5 text-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">You&apos;re Cited</p>
            <Badge
              variant="outline"
              className={`mt-1 text-[10px] ${
                data.userIsCited
                  ? "border-emerald-200 bg-emerald-50 text-foreground"
                  : "border-red-200 bg-red-50 text-foreground"
              }`}
            >
              {data.userIsCited ? "Yes" : "No"}
            </Badge>
          </div>

          {/* Your score */}
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {data.userParagraphScore}
            </p>
            <p className="text-xs text-muted-foreground">Your Score</p>
          </div>

          {/* Avg competitor */}
          <div className="text-center">
            <p
              className={`text-2xl font-bold tabular-nums ${
                data.userParagraphScore >= avgCompetitorScore
                  ? "text-foreground"
                  : "text-foreground"
              }`}
            >
              {avgCompetitorScore}
            </p>
            <p className="text-xs text-muted-foreground">Avg Competitor</p>
          </div>
        </div>

        {/* Score comparison bar */}
        <div className="mt-5 rounded-xl border border-border/40 bg-background/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Your score vs competitors</span>
            <span
              className={`font-medium ${
                data.userParagraphScore >= avgCompetitorScore
                  ? "text-foreground"
                  : "text-foreground"
              }`}
            >
              {data.userParagraphScore >= avgCompetitorScore ? "+" : ""}
              {data.userParagraphScore - avgCompetitorScore} pts
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                You
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.userParagraphScore}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-aurora-violet"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                Competitors
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgCompetitorScore}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full rounded-full bg-foreground/30"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Competitor cards */}
      {data.competitors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-foreground" />
            Cited Competitors
          </h3>
          <div className="space-y-3">
            {data.competitors.map((comp, i) => {
              const userBeats =
                data.userParagraphScore >= comp.avgParagraphScore;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="rounded-xl border border-border/60 bg-background/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Position badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        comp.position === 1
                          ? "bg-amber-50 text-foreground"
                          : comp.position === 2
                            ? "bg-slate-100 text-slate-500"
                            : comp.position === 3
                              ? "bg-orange-50 text-foreground"
                              : "bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      #{comp.position}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Domain & title */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comp.domain}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            userBeats
                              ? "border-emerald-200 bg-emerald-50 text-foreground"
                              : "border-red-200 bg-red-50 text-foreground"
                          }`}
                        >
                          {userBeats ? (
                            <TrendingUp className="mr-0.5 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-0.5 h-3 w-3" />
                          )}
                          Score: {comp.avgParagraphScore}
                        </Badge>
                      </div>

                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {comp.title}
                      </p>

                      {comp.snippet && (
                        <p className="mt-1.5 text-xs italic text-muted-foreground/80">
                          &ldquo;{comp.snippet}&rdquo;
                        </p>
                      )}

                      {/* Top factors */}
                      {comp.topFactors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {comp.topFactors.map((factor, fi) => (
                            <Badge
                              key={fi}
                              variant="outline"
                              className="border-aurora-violet/20 bg-aurora-violet/5 text-[10px] text-foreground"
                            >
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Link */}
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-foreground hover:underline"
                      >
                        {comp.url.length > 60
                          ? comp.url.slice(0, 57) + "..."
                          : comp.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Gap Analysis */}
      {data.gaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="h-4 w-4 text-foreground" />
            Gap Analysis
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Key areas where competitors outperform you.
          </p>
          <ul className="space-y-2">
            {data.gaps.map((gap, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    i < Math.ceil(data.gaps.length / 2)
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
                {gap}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-foreground" />
            Your Strengths
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            What you do well that AI search engines value.
          </p>
          <ul className="space-y-2">
            {data.strengths.map((strength, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.04 }}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {strength}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
