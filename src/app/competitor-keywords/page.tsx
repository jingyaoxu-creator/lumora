"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Loader2, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";

/* ─── Types ─── */

interface PageEntry {
  title: string;
  link: string;
  snippet: string;
}

interface ComparisonResult {
  domain: string;
  competitorDomain: string;
  shared: string[];
  uniqueToUser: string[];
  uniqueToCompetitor: string[];
  userPages: PageEntry[];
  competitorPages: PageEntry[];
  timestamp: string;
}

/* ─── Component ─── */

export default function CompetitorKeywordsPage() {
  const router = useRouter();

  const [domain, setDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim() || !competitorDomain.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/competitor-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          competitorDomain: competitorDomain.trim(),
        }),
      });

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to analyze keywords");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

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
                <Swords className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Competitive Intelligence
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              Competitor Keyword Analysis
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Compare your keyword footprint against competitors to discover gaps
              and opportunities.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {/* ── Comparison form ── */}
        <motion.form
          onSubmit={handleCompare}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Your domain (e.g. example.com)"
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Input
              value={competitorDomain}
              onChange={(e) => setCompetitorDomain(e.target.value)}
              placeholder="Competitor domain (e.g. rival.com)"
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !domain.trim() || !competitorDomain.trim()}
              className="rounded-xl bg-aurora-violet px-5 text-white hover:bg-aurora-violet/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Swords className="mr-2 h-4 w-4" />
              )}
              Compare
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </motion.form>

        {/* ── Loading state ── */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass flex flex-col items-center justify-center rounded-2xl p-12"
          >
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Analyzing keywords...
            </p>
          </motion.div>
        )}

        {/* ── Empty state (before any search) ── */}
        {!loading && !result && !error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Swords className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              Enter two domains to compare
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              We&apos;ll analyze the keyword overlap between your site and a
              competitor.
            </p>
          </motion.div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Summary stats row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="glass rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {result.shared.length}
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  Shared Keywords
                </div>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold tabular-nums text-emerald-600">
                  {result.uniqueToUser.length}
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  Unique to You
                </div>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold tabular-nums text-red-500">
                  {result.uniqueToCompetitor.length}
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  Unique to Competitor
                </div>
              </div>
            </motion.div>

            {/* Three keyword columns */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid gap-4 md:grid-cols-3"
            >
              {/* Shared */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Shared Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.shared.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No shared keywords found
                    </p>
                  ) : (
                    result.shared.slice(0, 50).map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="rounded-lg border-border bg-secondary/30 text-[11px] text-muted-foreground"
                      >
                        {kw}
                      </Badge>
                    ))
                  )}
                  {result.shared.length > 50 && (
                    <span className="text-[11px] text-muted-foreground/50">
                      +{result.shared.length - 50} more
                    </span>
                  )}
                </div>
              </div>

              {/* Unique to user */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Your Unique Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.uniqueToUser.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No unique keywords found
                    </p>
                  ) : (
                    result.uniqueToUser.slice(0, 50).map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="rounded-lg border-emerald-200 bg-emerald-50 text-[11px] text-foreground"
                      >
                        {kw}
                      </Badge>
                    ))
                  )}
                  {result.uniqueToUser.length > 50 && (
                    <span className="text-[11px] text-muted-foreground/50">
                      +{result.uniqueToUser.length - 50} more
                    </span>
                  )}
                </div>
              </div>

              {/* Unique to competitor (opportunities) */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Competitor&apos;s Unique Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.uniqueToCompetitor.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No unique keywords found
                    </p>
                  ) : (
                    result.uniqueToCompetitor.slice(0, 50).map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="rounded-lg border-red-200 bg-red-50 text-[11px] text-foreground"
                      >
                        {kw}
                      </Badge>
                    ))
                  )}
                  {result.uniqueToCompetitor.length > 50 && (
                    <span className="text-[11px] text-muted-foreground/50">
                      +{result.uniqueToCompetitor.length - 50} more
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Top Pages comparison */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {/* User pages */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Your Top Pages
                </div>
                <div className="space-y-2">
                  {result.userPages.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No pages found
                    </p>
                  ) : (
                    result.userPages.slice(0, 15).map((page, i) => (
                      <motion.div
                        key={page.link}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-xl bg-secondary/30 px-3 py-2.5"
                      >
                        <a
                          href={page.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm font-medium text-foreground hover:underline"
                        >
                          <span className="line-clamp-1 flex-1">
                            {page.title}
                          </span>
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Competitor pages */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Competitor&apos;s Top Pages
                </div>
                <div className="space-y-2">
                  {result.competitorPages.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50">
                      No pages found
                    </p>
                  ) : (
                    result.competitorPages.slice(0, 15).map((page, i) => (
                      <motion.div
                        key={page.link}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-xl bg-secondary/30 px-3 py-2.5"
                      >
                        <a
                          href={page.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm font-medium text-foreground hover:underline"
                        >
                          <span className="line-clamp-1 flex-1">
                            {page.title}
                          </span>
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
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
