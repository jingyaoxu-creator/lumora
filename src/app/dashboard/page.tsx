"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Filter,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */
interface ScanEntry {
  id: string;
  url: string;
  page_title: string | null;
  seo_score: number | null;
  geo_score: number | null;
  overall_score: number | null;
  created_at: string;
}

interface ChartPoint {
  date: string;
  fullDate: string;
  overall: number | null;
  seo: number | null;
  geo: number | null;
}

/* ─── Helpers ─── */
function scoreColor(s: number | null) {
  if (s === null) return "text-muted-foreground";
  if (s >= 80) return "text-foreground";
  if (s >= 50) return "text-foreground";
  return "text-foreground";
}

function scoreBg(s: number | null) {
  if (s === null) return "bg-muted/50";
  if (s >= 80) return "bg-emerald-500/10";
  if (s >= 50) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function trendIcon(current: number | null, previous: number | null) {
  if (current === null || previous === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (current > previous) return <TrendingUp className="h-3.5 w-3.5 text-foreground" />;
  if (current < previous) return <TrendingDown className="h-3.5 w-3.5 text-foreground" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/* ─── Component ─── */
export default function DashboardPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Check auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      } else {
        setAuthed(true);
      }
    });
  }, [router]);

  // Fetch history
  useEffect(() => {
    if (authed !== true) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedUrl !== "all") params.set("url", selectedUrl);
    params.set("limit", "200");

    fetch(`/api/scan-history?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setScans(data.scans ?? []);
        if (data.urls) setUrls(data.urls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed, selectedUrl]);

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-violet border-t-transparent" />
      </div>
    );
  }

  /* ─── Prepare chart data ─── */
  const chartData: ChartPoint[] = [...scans]
    .reverse()
    .map((s) => ({
      date: formatDate(s.created_at),
      fullDate: formatDateTime(s.created_at),
      overall: s.overall_score,
      seo: s.seo_score,
      geo: s.geo_score,
    }));

  /* ─── Stats ─── */
  const totalScans = scans.length;
  const uniqueDomainsCount = new Set(scans.map((s) => domainFromUrl(s.url))).size;
  const latestScore = scans[0]?.overall_score ?? null;
  const previousScore = scans[1]?.overall_score ?? null;
  const avgScore =
    totalScans > 0
      ? Math.round(
          scans.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / totalScans,
        )
      : null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* ─── Aurora background ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-[200px] left-[15%] h-[600px] w-[600px] rounded-full opacity-[0.06] blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.25 290), transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-[200px] right-[10%] h-[500px] w-[500px] rounded-full opacity-[0.05] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.68 0.18 230), transparent 65%)",
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center">
              <LumoraLogo height={28} />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <UserNav />
          </div>
        </nav>
      </header>

      {/* ─── Content ─── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Scan History
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track your website scores over time
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-violet border-t-transparent" />
          </div>
        ) : totalScans === 0 ? (
          /* ─── Empty state ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 px-6 py-16 text-center backdrop-blur-sm"
          >
            <History className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">No scans yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Run your first scan to start tracking scores over time. Each scan
              is automatically saved to your history.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-gradient-to-r from-aurora-violet to-aurora-blue px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-aurora-violet/20 transition-shadow hover:shadow-xl hover:shadow-aurora-violet/30"
            >
              Run Your First Scan
            </button>
          </motion.div>
        ) : (
          <>
            {/* ─── Stats bar ─── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[
                { label: "Total Scans", value: totalScans },
                { label: "Unique Sites", value: uniqueDomainsCount },
                {
                  label: "Latest Score",
                  value: latestScore ?? "—",
                  extra: trendIcon(latestScore, previousScore),
                },
                { label: "Avg Score", value: avgScore ?? "—" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xl font-bold tabular-nums">
                      {stat.value}
                    </p>
                    {stat.extra}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ─── URL filter ─── */}
            {urls.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 flex items-center gap-2"
              >
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedUrl}
                  onChange={(e) => setSelectedUrl(e.target.value)}
                  className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-sm text-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-aurora-violet/30"
                >
                  <option value="all">All URLs ({urls.length})</option>
                  {urls.map((u) => (
                    <option key={u} value={u}>
                      {domainFromUrl(u)}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* ─── Trend chart ─── */}
            {chartData.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
              >
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-foreground" />
                  <h2 className="text-sm font-semibold">Score Trends</h2>
                </div>

                {/* Legend */}
                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-aurora-violet" />
                    Overall
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-aurora-blue" />
                    SEO
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-aurora-cyan" />
                    GEO
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="gradOverall"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="oklch(0.62 0.25 290)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.62 0.25 290)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gradSeo"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="oklch(0.65 0.2 250)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.65 0.2 250)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gradGeo"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="oklch(0.72 0.15 200)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.72 0.15 200)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.4 0 0 / 0.15)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.15 0 0 / 0.9)",
                        border: "1px solid oklch(0.3 0 0)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "oklch(0.85 0 0)",
                        backdropFilter: "blur(12px)",
                      }}
                      labelFormatter={(_, payload) => {
                        if (payload?.[0]?.payload?.fullDate) {
                          return payload[0].payload.fullDate;
                        }
                        return "";
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="overall"
                      stroke="oklch(0.62 0.25 290)"
                      strokeWidth={2.5}
                      fill="url(#gradOverall)"
                      dot={{ r: 3, fill: "oklch(0.62 0.25 290)" }}
                      activeDot={{ r: 5 }}
                      name="Overall"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="seo"
                      stroke="oklch(0.65 0.2 250)"
                      strokeWidth={1.5}
                      fill="url(#gradSeo)"
                      dot={false}
                      name="SEO"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="geo"
                      stroke="oklch(0.72 0.15 200)"
                      strokeWidth={1.5}
                      fill="url(#gradGeo)"
                      dot={false}
                      name="GEO"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* ─── Scan history table ─── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
                <History className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-semibold">Recent Scans</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {totalScans} scan{totalScans !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Header row — desktop */}
              <div className="hidden border-b border-border/30 px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-12">
                <span className="col-span-5">URL</span>
                <span className="col-span-2 text-center">Overall</span>
                <span className="col-span-1 text-center">SEO</span>
                <span className="col-span-1 text-center">GEO</span>
                <span className="col-span-3 text-right">Date</span>
              </div>

              <div className="divide-y divide-border/30">
                {scans.map((scan, i) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    className="group cursor-pointer px-5 py-3 transition-colors hover:bg-secondary/30 sm:grid sm:grid-cols-12 sm:items-center"
                    onClick={() =>
                      router.push(
                        `/results?url=${encodeURIComponent(scan.url)}`,
                      )
                    }
                  >
                    {/* URL + title */}
                    <div className="col-span-5 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                        {scan.page_title || domainFromUrl(scan.url)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {domainFromUrl(scan.url)}
                      </p>
                    </div>

                    {/* Scores — desktop */}
                    <div className="col-span-2 hidden text-center sm:block">
                      <span
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${scoreBg(scan.overall_score)} ${scoreColor(scan.overall_score)}`}
                      >
                        {scan.overall_score ?? "—"}
                      </span>
                    </div>
                    <div className="col-span-1 hidden text-center sm:block">
                      <span
                        className={`text-sm tabular-nums ${scoreColor(scan.seo_score)}`}
                      >
                        {scan.seo_score ?? "—"}
                      </span>
                    </div>
                    <div className="col-span-1 hidden text-center sm:block">
                      <span
                        className={`text-sm tabular-nums ${scoreColor(scan.geo_score)}`}
                      >
                        {scan.geo_score ?? "—"}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-3 hidden text-right sm:block">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(scan.created_at)}
                      </span>
                    </div>

                    {/* Mobile layout */}
                    <div className="mt-2 flex items-center justify-between sm:hidden">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${scoreBg(scan.overall_score)} ${scoreColor(scan.overall_score)}`}
                        >
                          {scan.overall_score ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          SEO {scan.seo_score ?? "—"} · GEO{" "}
                          {scan.geo_score ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(scan.created_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
