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
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreRing } from "@/components/score-ring";
import { CheckResultCard } from "@/components/check-result-card";
import { AnalysisLoading } from "@/components/analysis-loading";
import type { AnalysisResult, AIResponse, AISuggestion } from "@/lib/types";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url") ?? "";

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      router.push("/");
      return;
    }

    async function analyze() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Analysis failed");
          return;
        }
        setAnalysis(data);

        // Auto-fetch AI suggestions
        setAiLoading(true);
        try {
          const aiRes = await fetch("/api/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            setAiResponse(aiData);
          }
        } catch {
          // AI suggestions are optional
        } finally {
          setAiLoading(false);
        }
      } catch {
        setError("Failed to connect. Check the URL and try again.");
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [url, router]);

  if (loading) return <AnalysisLoading />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10">
            <AlertCircle className="h-7 w-7 text-red-600" />
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
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4 -ml-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          New Analysis
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {analysis.pageTitle}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
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

        {/* Quick stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
          {[
            {
              label: "Passing",
              value: [...analysis.seoChecks, ...analysis.geoChecks].filter(
                (c) => c.status === "pass"
              ).length,
              total: analysis.seoChecks.length + analysis.geoChecks.length,
              color: "text-emerald-600",
            },
            {
              label: "Warnings",
              value: [...analysis.seoChecks, ...analysis.geoChecks].filter(
                (c) => c.status === "warning"
              ).length,
              total: analysis.seoChecks.length + analysis.geoChecks.length,
              color: "text-amber-600",
            },
            {
              label: "Failing",
              value: [...analysis.seoChecks, ...analysis.geoChecks].filter(
                (c) => c.status === "fail"
              ).length,
              total: analysis.seoChecks.length + analysis.geoChecks.length,
              color: "text-red-600",
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {stat.label}{" "}
                <span className="text-muted-foreground/50">
                  / {stat.total}
                </span>
              </p>
            </div>
          ))}
        </div>
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
            <TabsTrigger
              value="ai"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="space-y-2">
            {analysis.seoChecks.map((check, i) => (
              <CheckResultCard key={check.id} check={check} index={i} />
            ))}
          </TabsContent>

          <TabsContent value="geo" className="space-y-2">
            {analysis.geoChecks.map((check, i) => (
              <CheckResultCard key={check.id} check={check} index={i} />
            ))}
          </TabsContent>

          <TabsContent value="ai">
            <AISuggestionsPanel
              response={aiResponse}
              loading={aiLoading}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Spacer */}
      <div className="h-20" />
    </div>
  );
}

/* ─── AI Suggestions Panel ─── */

function AISuggestionsPanel({
  response,
  loading,
}: {
  response: AIResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="glass flex items-center gap-3 rounded-2xl p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="h-5 w-5 text-aurora-violet" />
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
            <Lightbulb className="h-4 w-4 text-aurora-violet" />
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
      {response.suggestions.map((suggestion, i) => (
        <SuggestionCard key={i} suggestion={suggestion} index={i} />
      ))}

      {response.suggestions.length === 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
          <p className="text-sm font-medium text-emerald-600">
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
    color: "text-red-600",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  high: {
    color: "text-orange-600",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  medium: {
    color: "text-amber-600",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  low: {
    color: "text-blue-600",
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
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Lumora</span>
        </div>
      </header>

      <Suspense fallback={<AnalysisLoading />}>
        <ResultsContent />
      </Suspense>
    </div>
  );
}
