"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Map,
  Crown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import type { SiteCrawlResult } from "@/lib/site-crawl";

export default function CrawlPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gated, setGated] = useState<"unauthenticated" | "upgrade" | null>(null);
  const [result, setResult] = useState<SiteCrawlResult | null>(null);

  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError("");
    setGated(null);
    setResult(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), maxPages: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setGated("unauthenticated");
          return;
        }
        if (res.status === 403) {
          setGated("upgrade");
          return;
        }
        setError(data.error ?? "Crawl failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect. Check the URL and try again.");
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <UserNav />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Map className="h-6 w-6 text-foreground" />
              Site Crawl
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan up to 20 pages from sitemap or internal links. Get a site-wide
              SEO & GEO health overview.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl"
          >
            Back
          </Button>
        </div>

        {/* Input */}
        <form onSubmit={handleCrawl} className="mb-8">
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              {loading ? "Crawling..." : "Start Crawl"}
            </Button>
          </div>
          {loading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Scanning pages in parallel — this may take up to 2 minutes...
            </p>
          )}
        </form>

        {/* Upgrade / Login gate */}
        {gated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/30 via-background to-aurora-violet/[0.04] p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora-violet/10">
              {gated === "unauthenticated" ? (
                <Sparkles className="h-6 w-6 text-brand-purple" />
              ) : (
                <Crown className="h-6 w-6 text-brand-purple" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {gated === "unauthenticated"
                ? "Sign in to use Site Crawl"
                : "Site Crawl is a Business feature"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {gated === "unauthenticated"
                ? "Create a free account to start crawling your site. Get page-by-page SEO & GEO scores across up to 20 pages."
                : "Crawl up to 20 pages at once and get a site-wide health overview with aggregate scores, error counts, and page-by-page breakdowns."}
            </p>
            <Button
              onClick={() =>
                router.push(gated === "unauthenticated" ? "/auth/signup" : "/pricing")
              }
              className="mt-5 rounded-xl bg-foreground px-6 py-5 text-background hover:bg-foreground/85"
            >
              {gated === "unauthenticated" ? (
                <>
                  Sign Up Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  View Business Plan
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="h-5 w-5 text-foreground" />
            <p className="text-sm text-foreground">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        {result && <CrawlResults result={result} />}
      </div>
    </div>
  );
}

function CrawlResults({ result }: { result: SiteCrawlResult }) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Aggregate stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p
              className={`text-3xl font-bold tabular-nums ${scoreColor(
                result.aggregate.avgOverall,
              )}`}
            >
              {result.aggregate.avgOverall}
            </p>
            <p className="text-xs text-muted-foreground">Avg Overall</p>
          </div>
          <div className="text-center">
            <p
              className={`text-3xl font-bold tabular-nums ${scoreColor(
                result.aggregate.avgSeo,
              )}`}
            >
              {result.aggregate.avgSeo}
            </p>
            <p className="text-xs text-muted-foreground">Avg SEO</p>
          </div>
          <div className="text-center">
            <p
              className={`text-3xl font-bold tabular-nums ${scoreColor(
                result.aggregate.avgGeo,
              )}`}
            >
              {result.aggregate.avgGeo}
            </p>
            <p className="text-xs text-muted-foreground">Avg GEO</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {result.pagesScanned}
            </p>
            <p className="text-xs text-muted-foreground">
              of {result.pagesDiscovered} pages
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <span>
            {result.sitemapFound ? "Sitemap found" : "No sitemap — used link discovery"}
          </span>
          <span>•</span>
          <span>{result.aggregate.totalErrors} total errors</span>
          <span>•</span>
          <span>{result.aggregate.totalWarnings} total warnings</span>
        </div>
      </motion.div>

      {/* Page list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Page-by-Page Results
        </h3>
        {result.pages
          .sort((a, b) => a.overallScore - b.overallScore)
          .map((page, i) => (
            <motion.div
              key={page.url}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="glass rounded-xl"
            >
              <button
                onClick={() =>
                  setExpandedPage(
                    expandedPage === page.url ? null : page.url,
                  )
                }
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {/* Status icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    page.overallScore >= 80
                      ? "bg-emerald-50"
                      : page.overallScore >= 50
                      ? "bg-amber-50"
                      : "bg-red-50"
                  }`}
                >
                  {page.overallScore >= 80 ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                  ) : page.overallScore >= 50 ? (
                    <AlertTriangle className="h-4 w-4 text-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 text-foreground" />
                  )}
                </div>

                {/* Page info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {page.pageTitle}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {page.url}
                  </p>
                </div>

                {/* Scores */}
                <div className="hidden gap-3 sm:flex">
                  <div className="text-center">
                    <p
                      className={`text-sm font-bold tabular-nums ${scoreColor(
                        page.overallScore,
                      )}`}
                    >
                      {page.overallScore}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Overall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tabular-nums text-muted-foreground">
                      {page.seoScore}
                    </p>
                    <p className="text-[9px] text-muted-foreground">SEO</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tabular-nums text-muted-foreground">
                      {page.geoScore}
                    </p>
                    <p className="text-[9px] text-muted-foreground">GEO</p>
                  </div>
                </div>

                {page.errors > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-foreground border-red-200 text-[10px]"
                  >
                    {page.errors} errors
                  </Badge>
                )}

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    expandedPage === page.url ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedPage === page.url && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-border/50 px-4 pb-4 pt-3"
                >
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span>
                      SEO: <strong>{page.seoScore}</strong>
                    </span>
                    <span>
                      GEO: <strong>{page.geoScore}</strong>
                    </span>
                    <span>
                      Errors: <strong className="text-foreground">{page.errors}</strong>
                    </span>
                    <span>
                      Warnings: <strong className="text-foreground">{page.warnings}</strong>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-xl text-xs"
                    onClick={() =>
                      window.open(
                        `/results?url=${encodeURIComponent(page.url)}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Full Analysis
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-foreground";
  if (score >= 50) return "text-foreground";
  return "text-foreground";
}
