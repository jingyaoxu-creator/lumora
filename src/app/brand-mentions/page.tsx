"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AtSign,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";

/* ─── Types ─── */

interface BrandTerm {
  id: string;
  user_id: string;
  term: string;
  exclude_domain: string | null;
  created_at: string;
}

interface BrandMention {
  id: string;
  user_id: string;
  brand_term: string;
  source_url: string;
  source_domain: string;
  title: string;
  snippet: string;
  found_at: string;
}

/* ─── Component ─── */

export default function BrandMentionsPage() {
  const router = useRouter();

  /* ── State ── */
  const [terms, setTerms] = useState<BrandTerm[]>([]);
  const [mentions, setMentions] = useState<BrandMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [excludeDomain, setExcludeDomain] = useState("");
  const [error, setError] = useState("");

  /* ── Load terms & mentions ── */
  async function loadData() {
    try {
      const res = await fetch("/api/brand-mentions");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTerms(data.terms ?? []);
        setMentions(data.mentions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Add brand term ── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.trim() || adding) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/brand-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-term",
          term: newTerm.trim(),
          excludeDomain: excludeDomain.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add brand term");
        return;
      }
      setNewTerm("");
      setExcludeDomain("");
      await loadData();
    } finally {
      setAdding(false);
    }
  }

  /* ── Delete brand term ── */
  async function handleDelete(term: BrandTerm) {
    await fetch("/api/brand-mentions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: term.id }),
    });
    setTerms((prev) => prev.filter((t) => t.id !== term.id));
    setMentions((prev) => prev.filter((m) => m.brand_term !== term.term));
  }

  /* ── Refresh a term ── */
  async function handleRefresh(term: string) {
    setError("");
    try {
      const res = await fetch("/api/brand-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", term }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to refresh mentions");
      }
    } catch {
      setError("Failed to refresh mentions");
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
                <AtSign className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Brand Intelligence
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              Brand Mentions Monitor
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Track where your brand is mentioned across the web and discover
              new citation opportunities.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">
        {/* Add brand term form */}
        <motion.form
          onSubmit={handleAdd}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="Brand name or term"
              className="flex-1 rounded-xl"
              disabled={adding}
            />
            <Input
              value={excludeDomain}
              onChange={(e) => setExcludeDomain(e.target.value)}
              placeholder="Exclude domain (optional)"
              className="flex-1 rounded-xl"
              disabled={adding}
            />
            <Button
              type="submit"
              disabled={adding || !newTerm.trim()}
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

        {/* Brand terms pills */}
        {terms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 flex flex-wrap items-center gap-2"
          >
            {terms.map((term) => (
              <Badge
                key={term.id}
                variant="outline"
                className="flex items-center gap-1.5 rounded-lg border-border bg-secondary/40 px-3 py-1.5 text-sm"
              >
                <AtSign className="h-3 w-3 text-muted-foreground" />
                {term.term}
                <button
                  type="button"
                  onClick={() => handleRefresh(term.term)}
                  className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  title="Refresh mentions"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(term)}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  title="Remove term"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </motion.div>
        )}

        {/* Mentions list */}
        {loading ? (
          /* Skeleton shimmer cards */
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="glass animate-pulse rounded-xl p-4"
              >
                <div className="mb-2 h-4 w-2/3 rounded bg-secondary/60" />
                <div className="mb-2 h-3 w-1/4 rounded bg-secondary/40" />
                <div className="h-3 w-full rounded bg-secondary/30" />
              </div>
            ))}
          </div>
        ) : mentions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <AtSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              No brand terms tracked yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Add a brand name above to discover where it&apos;s being mentioned.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {mentions.map((mention, i) => (
              <motion.div
                key={mention.id ?? `${mention.source_url}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-4"
              >
                {/* Title row */}
                <div className="mb-1.5 flex items-start gap-2">
                  <a
                    href={mention.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <span className="truncate">{mention.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                </div>

                {/* Domain + term badges */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-md border-border bg-secondary/30 text-[10px] text-muted-foreground"
                  >
                    {mention.source_domain}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-md border-aurora-violet/20 bg-aurora-violet/5 text-[10px] text-foreground"
                  >
                    <AtSign className="mr-0.5 h-2.5 w-2.5" />
                    {mention.brand_term}
                  </Badge>
                  {mention.found_at && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(mention.found_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Snippet */}
                {mention.snippet && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {mention.snippet}
                  </p>
                )}
              </motion.div>
            ))}
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
