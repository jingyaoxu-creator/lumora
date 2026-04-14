"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  MessageSquarePlus,
  Lightbulb,
  Wrench,
  Bug,
  X,
  Loader2,
  Trash2,
  Shield,
  MessageCircle,
  Rocket,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

/* ─── Types ─── */

interface FeedbackPost {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  content: string;
  category: "feature" | "improvement" | "bug";
  status: "open" | "planned" | "in_progress" | "done" | "declined";
  vote_count: number;
  created_at: string;
}

/* ─── Helpers ─── */

const CATEGORY_META: Record<string, { labelKey: string; icon: typeof Lightbulb; color: string }> = {
  feature: { labelKey: "feedback.feature", icon: Lightbulb, color: "bg-foreground/10 text-foreground" },
  improvement: { labelKey: "feedback.improvement", icon: Wrench, color: "bg-brand-blue/10 text-foreground" },
  bug: { labelKey: "feedback.bug", icon: Bug, color: "bg-red-500/10 text-foreground" },
};

const STATUS_META: Record<string, { labelKey: string; color: string; icon: typeof Clock }> = {
  open: { labelKey: "feedback.underReview", color: "bg-secondary text-muted-foreground", icon: Clock },
  planned: { labelKey: "feedback.planned", color: "bg-brand-blue/10 text-foreground", icon: Rocket },
  in_progress: { labelKey: "feedback.inProgress", color: "bg-amber-500/10 text-foreground", icon: Code2 },
  done: { labelKey: "feedback.done", color: "bg-emerald-500/10 text-foreground", icon: CheckCircle2 },
  declined: { labelKey: "feedback.declined", color: "bg-red-500/10 text-foreground", icon: XCircle },
};

const STATUS_TABS = ["all", "open", "planned", "in_progress", "done", "declined"] as const;

function timeAgo(dateStr: string, t: (key: string) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("feedback.minutesAgo").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("feedback.hoursAgo").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t("feedback.daysAgo").replace("{n}", String(days));
  return t("feedback.monthsAgo").replace("{n}", String(Math.floor(days / 30)));
}

/* ─── Component ─── */

export default function FeedbackPage() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"feature" | "improvement" | "bug">("feature");

  const router = useRouter();
  const t = useTranslation();
  const formRef = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback((e: React.MouseEvent) => {
    if (showForm && formRef.current && !formRef.current.contains(e.target as Node)) {
      setShowForm(false);
    }
  }, [showForm]);

  const fetchPosts = async () => {
    const params = new URLSearchParams();
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterStatus !== "all") params.set("status", filterStatus);

    const res = await fetch(`/api/feedback?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
      setVotedIds(new Set(data.votedPostIds));
      setUserId(data.userId);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    fetch("/api/feedback/check-admin")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterStatus]);

  // Count posts by status (from all posts, ignoring filters)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    for (const p of posts) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [posts]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category }),
    });

    if (res.ok) {
      setTitle("");
      setContent("");
      setCategory("feature");
      setShowForm(false);
      await fetchPosts();
    } else if (res.status === 401) {
      router.push("/auth/login");
    }
    setSubmitting(false);
  };

  const handleVote = async (postId: string) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    setVotingId(postId);

    const res = await fetch("/api/feedback/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (res.ok) {
      const { voted } = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, vote_count: p.vote_count + (voted ? 1 : -1) }
            : p,
        ),
      );
      setVotedIds((prev) => {
        const next = new Set(prev);
        if (voted) next.add(postId);
        else next.delete(postId);
        return next;
      });
    }
    setVotingId(null);
  };

  const handleAdminStatus = async (id: string, status: string) => {
    await fetch("/api/feedback/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await fetchPosts();
  };

  const handleDelete = async (id: string) => {
    const endpoint = isAdmin ? "/api/feedback/admin" : "/api/feedback";
    await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchPosts();
  };

  const statusLabelKey = (s: string) => {
    if (s === "all") return "feedback.allStatus";
    return STATUS_META[s]?.labelKey || s;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white" onClick={handleOutsideClick}>
      <SiteNav />

      {/* ─── Hero header ─── */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-secondary/50 to-white pt-28 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,0,0,0.03),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between"
          >
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06]">
                  <MessageCircle className="h-4 w-4 text-foreground/70" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Feedback Board
                </span>
              </div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("feedback.title")}</h1>
              <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                {t("feedback.subtitle")}
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ─── Main content ─── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-6">

        {/* ─── New post form ─── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", transition: { height: { duration: 0.3 }, opacity: { duration: 0.2, delay: 0.1 } } }}
              exit={{ opacity: 0, height: 0, transition: { opacity: { duration: 0.15 }, height: { duration: 0.25, delay: 0.1 } } }}
              className="mb-6 overflow-hidden"
            >
              <div ref={formRef} className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">{t("feedback.submitNew")}</h3>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1 transition-colors hover:bg-secondary">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Category selector */}
                <div className="mb-4 flex gap-2">
                  {(["feature", "improvement", "bug"] as const).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          category === cat
                            ? meta.color
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <meta.icon className="h-3.5 w-3.5" />
                        {t(meta.labelKey)}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder={t("feedback.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="mb-3 w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-foreground/20"
                />
                <textarea
                  placeholder={t("feedback.contentPlaceholder")}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mb-4 w-full resize-none rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-foreground/20"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {content.length}/2000
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="rounded-xl bg-foreground text-white hover:bg-foreground/85"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("common.submit")
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Posts list ─── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 rounded-2xl border border-border/40 p-5">
                <div className="h-16 w-14 flex-shrink-0 animate-pulse rounded-xl bg-secondary" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-48 animate-pulse rounded-lg bg-secondary" />
                  <div className="h-3 w-full animate-pulse rounded-lg bg-secondary/70" />
                  <div className="h-3 w-24 animate-pulse rounded-lg bg-secondary/50" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          /* ─── Rich empty state ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center py-10"
          >
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-secondary/80">
              <MessageCircle className="h-11 w-11 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {t("feedback.noRequests")}
            </h3>
            <p className="mb-8 max-w-lg text-center text-[15px] leading-relaxed text-muted-foreground">
              {t("feedback.subtitle")}
            </p>
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="rounded-xl bg-foreground px-6 text-white hover:bg-foreground/85"
            >
              <MessageSquarePlus className="mr-1.5 h-4 w-4" />
              {t("feedback.submitRequest")}
            </Button>

            {/* Decorative cards to fill the space */}
            <div className="mt-14 grid w-full grid-cols-2 gap-3">
              {[
                { icon: Lightbulb, label: "Dark mode for dashboard" },
                { icon: Wrench, label: "Export reports as PDF" },
                { icon: Bug, label: "Fix mobile responsive layout" },
                { icon: Lightbulb, label: "Slack integration for alerts" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/40 px-5 py-4"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, i) => {
              const catMeta = CATEGORY_META[post.category];
              const statusMeta = STATUS_META[post.status];
              const StatusIcon = statusMeta.icon;
              const voted = votedIds.has(post.id);
              const isOwner = userId === post.user_id;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex gap-4 rounded-2xl border border-border/40 bg-white p-5 transition-colors hover:border-border/60"
                >
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(post.id)}
                    disabled={votingId === post.id}
                    className={`flex h-16 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl border transition-all ${
                      voted
                        ? "border-foreground/30 bg-foreground/10 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                    }`}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">{post.vote_count}</span>
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{post.title}</h3>
                      <Badge className={`rounded-md px-1.5 py-0 text-[10px] font-medium ${catMeta.color}`}>
                        {t(catMeta.labelKey)}
                      </Badge>
                      <Badge className={`flex items-center gap-1 rounded-md px-1.5 py-0 text-[10px] font-medium ${statusMeta.color}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {t(statusMeta.labelKey)}
                      </Badge>
                    </div>
                    <p className="mb-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium uppercase">
                        {post.author_name.charAt(0)}
                      </span>
                      <span>{post.author_name}</span>
                      <span>{timeAgo(post.created_at, t)}</span>

                      {/* Admin controls */}
                      {isAdmin && (
                        <select
                          value={post.status}
                          onChange={(e) => handleAdminStatus(post.id, e.target.value)}
                          className="rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px]"
                        >
                          <option value="open">{t("feedback.underReview")}</option>
                          <option value="planned">{t("feedback.planned")}</option>
                          <option value="in_progress">{t("feedback.inProgress")}</option>
                          <option value="done">{t("feedback.done")}</option>
                          <option value="declined">{t("feedback.declined")}</option>
                        </select>
                      )}

                      {/* Delete button (admin or owner) */}
                      {(isAdmin || isOwner) && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-muted-foreground/40 transition-colors hover:text-foreground"
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
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
