"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";

/* --- Types --- */

interface TrackedKeyword {
  id: string;
  domain: string;
  keyword: string;
  created_at: string;
  latestPosition: number | null;
  latestUrl: string | null;
  latestCheckedAt: string | null;
  trend: "up" | "down" | "stable" | null;
}

/* --- Helpers --- */

function positionBadge(position: number | null) {
  if (position === null) {
    return {
      label: "Not ranked",
      className: "border-border bg-secondary/30 text-muted-foreground",
    };
  }
  if (position <= 10) {
    return {
      label: `#${position}`,
      className: "border-emerald-200 bg-emerald-50 text-foreground",
    };
  }
  if (position <= 30) {
    return {
      label: `#${position}`,
      className: "border-amber-200 bg-amber-50 text-foreground",
    };
  }
  return {
    label: `#${position}`,
    className: "border-red-200 bg-red-50 text-foreground",
  };
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" | null }) {
  if (trend === "up") {
    return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  if (trend === "stable") {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  return null;
}

/* --- Component --- */

export default function RankTrackingPage() {
  const router = useRouter();

  /* -- State -- */
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [domain, setDomain] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  /* -- Load keywords -- */
  async function loadKeywords() {
    try {
      const res = await fetch("/api/rank-tracking");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        setKeywords(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -- Add keyword -- */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim() || !keyword.trim() || adding) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/rank-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          keyword: keyword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add keyword");
        return;
      }
      setDomain("");
      setKeyword("");
      await loadKeywords();
    } finally {
      setAdding(false);
    }
  }

  /* -- Delete keyword -- */
  async function handleDelete(id: string) {
    // Optimistically remove from list
    setDeleting((prev) => new Set(prev).add(id));
    setKeywords((prev) => prev.filter((kw) => kw.id !== id));

    await fetch("/api/rank-tracking", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setDeleting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SiteNav />

      {/* --- Hero header --- */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-secondary/50 to-white pt-28 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,0,0,0.03),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06]">
                <Search className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Rank Tracking
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              Keyword Rank Tracking
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Track your keyword positions in Google search results and monitor
              ranking changes over time.
            </p>
          </motion.div>
        </div>
      </div>

      {/* --- Main content --- */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {/* Add keyword form */}
        <motion.form
          onSubmit={handleAdd}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 rounded-xl"
              disabled={adding}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword..."
              className="flex-1 rounded-xl"
              disabled={adding}
            />
            <Button
              type="submit"
              disabled={adding || !domain.trim() || !keyword.trim()}
              className="rounded-xl bg-aurora-violet px-4 text-white hover:bg-aurora-violet/90"
            >
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </motion.form>

        {/* Keywords list */}
        {loading ? (
          /* Skeleton shimmer cards */
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="glass flex items-center gap-3 rounded-xl p-4"
              >
                <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-secondary/60" />
                  <div className="h-3 w-48 animate-pulse rounded bg-secondary/40" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-secondary/60" />
              </div>
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              No keywords tracked yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Add a domain and keyword above to start tracking rankings.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {keywords.map((kw, i) => {
              const badge = positionBadge(kw.latestPosition);
              return (
                <motion.div
                  key={kw.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass flex items-center gap-3 rounded-xl p-4"
                >
                  {/* Trend icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                    <TrendIcon trend={kw.trend} />
                    {kw.trend === null && (
                      <Minus className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {kw.domain}{" "}
                      <span className="text-muted-foreground">—</span>{" "}
                      <span className="text-muted-foreground">{kw.keyword}</span>
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {kw.latestCheckedAt ? (
                        <span>
                          Last checked:{" "}
                          {new Date(kw.latestCheckedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Not checked yet</span>
                      )}
                    </div>
                  </div>

                  {/* Position badge */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${badge.className}`}
                  >
                    {badge.label}
                  </Badge>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleDelete(kw.id)}
                    disabled={deleting.has(kw.id)}
                  >
                    {deleting.has(kw.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- Footer --- */}
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
