"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Quote,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import { ScoreRing } from "@/components/score-ring";

interface CitationSimulation {
  query: string;
  wouldCite: boolean;
  confidence: number;
  citedParagraphs: { text: string; reason: string }[];
  missingFactors: string[];
  improvementSuggestions: string[];
  competitiveEdge: string;
}

export default function CitationSimPage() {
  const router = useRouter();
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
              <Target className="h-6 w-6 text-foreground" />
              AI Citation Simulator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Test if AI search engines would cite your page for a given query.
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
          onSubmit={handleSimulate}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-6"
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results                                                           */
/* ------------------------------------------------------------------ */

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
          {/* Confidence ring */}
          <ScoreRing
            score={data.confidence}
            label="Confidence"
            size={140}
            color={data.wouldCite ? "#22c55e" : "#ef4444"}
          />

          {/* Verdict */}
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2 flex items-center justify-center gap-3 sm:justify-start">
              {data.wouldCite ? (
                <CheckCircle2 className="h-8 w-8 text-foreground" />
              ) : (
                <XCircle className="h-8 w-8 text-foreground" />
              )}
              <span
                className={`text-3xl font-bold ${
                  data.wouldCite ? "text-foreground" : "text-foreground"
                }`}
              >
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
          {/* Decorative glow */}
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
