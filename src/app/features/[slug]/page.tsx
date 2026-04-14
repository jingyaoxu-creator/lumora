"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Search,
  Bot,
  Code,
  TrendingUp,
  Activity,
  CheckCircle2,
  BarChart3,
  Zap,
  FileCode,
  Eye,
  Bell,
  Clock,
  Target,
  Layers,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

interface FeatureHighlight {
  iconKey: string;
  titleKey: string;
  descKey: string;
}

interface FeatureConfig {
  titleKey: string;
  subtitleKey: string;
  highlights: FeatureHighlight[];
  demo: string; // component key for demo section
}

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  bot: Bot,
  code: Code,
  trending: TrendingUp,
  activity: Activity,
  check: CheckCircle2,
  chart: BarChart3,
  zap: Zap,
  fileCode: FileCode,
  eye: Eye,
  bell: Bell,
  clock: Clock,
  target: Target,
  layers: Layers,
  brain: Brain,
};

const FEATURES: Record<string, FeatureConfig> = {
  analysis: {
    titleKey: "features.analysis.title",
    subtitleKey: "features.analysis.subtitle",
    highlights: [
      { iconKey: "search", titleKey: "features.analysis.h1Title", descKey: "features.analysis.h1Desc" },
      { iconKey: "bot", titleKey: "features.analysis.h2Title", descKey: "features.analysis.h2Desc" },
      { iconKey: "chart", titleKey: "features.analysis.h3Title", descKey: "features.analysis.h3Desc" },
    ],
    demo: "analysis",
  },
  platforms: {
    titleKey: "features.platforms.title",
    subtitleKey: "features.platforms.subtitle",
    highlights: [
      { iconKey: "layers", titleKey: "features.platforms.h1Title", descKey: "features.platforms.h1Desc" },
      { iconKey: "target", titleKey: "features.platforms.h2Title", descKey: "features.platforms.h2Desc" },
      { iconKey: "zap", titleKey: "features.platforms.h3Title", descKey: "features.platforms.h3Desc" },
    ],
    demo: "platforms",
  },
  suggestions: {
    titleKey: "features.suggestions.title",
    subtitleKey: "features.suggestions.subtitle",
    highlights: [
      { iconKey: "brain", titleKey: "features.suggestions.h1Title", descKey: "features.suggestions.h1Desc" },
      { iconKey: "fileCode", titleKey: "features.suggestions.h2Title", descKey: "features.suggestions.h2Desc" },
      { iconKey: "zap", titleKey: "features.suggestions.h3Title", descKey: "features.suggestions.h3Desc" },
    ],
    demo: "suggestions",
  },
  citations: {
    titleKey: "features.citations.title",
    subtitleKey: "features.citations.subtitle",
    highlights: [
      { iconKey: "trending", titleKey: "features.citations.h1Title", descKey: "features.citations.h1Desc" },
      { iconKey: "target", titleKey: "features.citations.h2Title", descKey: "features.citations.h2Desc" },
      { iconKey: "chart", titleKey: "features.citations.h3Title", descKey: "features.citations.h3Desc" },
    ],
    demo: "citations",
  },
  monitoring: {
    titleKey: "features.monitoring.title",
    subtitleKey: "features.monitoring.subtitle",
    highlights: [
      { iconKey: "eye", titleKey: "features.monitoring.h1Title", descKey: "features.monitoring.h1Desc" },
      { iconKey: "bell", titleKey: "features.monitoring.h2Title", descKey: "features.monitoring.h2Desc" },
      { iconKey: "clock", titleKey: "features.monitoring.h3Title", descKey: "features.monitoring.h3Desc" },
    ],
    demo: "monitoring",
  },
};

/* ─── Demo Components ─── */

function AnalysisDemo() {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="font-mono text-sm text-muted-foreground">example.com — Full Analysis</span>
      </div>
      <div className="flex flex-col gap-8 sm:flex-row">
        {/* Score ring */}
        <div className="flex flex-col items-center gap-3">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke="var(--color-brand-purple)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="427.3"
              strokeDashoffset="55.5"
              transform="rotate(-90 80 80)"
            />
            <text x="80" y="74" textAnchor="middle" fill="var(--foreground)" fontSize="36" fontWeight="700">87</text>
            <text x="80" y="98" textAnchor="middle" fill="var(--muted-foreground)" fontSize="14">/100</text>
          </svg>
          <span className="text-sm font-medium text-muted-foreground">Combined Score</span>
        </div>

        {/* Category breakdown */}
        <div className="flex-1 space-y-4">
          {[
            { label: "SEO Score", score: 91, color: "bg-brand-blue", items: "68 checks" },
            { label: "GEO Score", score: 83, color: "bg-brand-purple", items: "35 checks" },
            { label: "AI Readiness", score: 78, color: "bg-brand-cyan", items: "10 platforms" },
          ].map((cat) => (
            <div key={cat.label}>
              <div className="mb-2 flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-xs text-muted-foreground">({cat.items})</span>
                </div>
                <span className="font-semibold tabular-nums">{cat.score}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white">
                <div className={`h-2.5 rounded-full ${cat.color}`} style={{ width: `${cat.score}%` }} />
              </div>
            </div>
          ))}

          {/* Check grid */}
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
            {[
              { label: "Meta description", pass: true },
              { label: "Schema.org markup", pass: true },
              { label: "H1 tag optimized", pass: true },
              { label: "AI readability", pass: true },
              { label: "Image alt text", pass: false },
              { label: "Citation hooks", pass: true },
              { label: "Open Graph tags", pass: true },
              { label: "Canonical URL", pass: true },
              { label: "robots.txt", pass: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${item.pass ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformsDemo() {
  const platforms = [
    { name: "ChatGPT", score: 92, color: "bg-brand-purple", change: "+3" },
    { name: "Perplexity", score: 88, color: "bg-brand-blue", change: "+5" },
    { name: "Claude", score: 85, color: "bg-brand-indigo", change: "+2" },
    { name: "Gemini", score: 79, color: "bg-brand-cyan", change: "+8" },
    { name: "Copilot", score: 74, color: "bg-brand-blue", change: "+1" },
    { name: "SearchGPT", score: 71, color: "bg-brand-purple", change: "+4" },
    { name: "Google AI", score: 86, color: "bg-brand-cyan", change: "+6" },
    { name: "Meta AI", score: 68, color: "bg-brand-blue", change: "+2" },
    { name: "You.com", score: 77, color: "bg-brand-indigo", change: "+3" },
    { name: "Phind", score: 73, color: "bg-brand-purple", change: "+1" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">Platform Readiness — example.com</span>
        <span className="text-xs text-muted-foreground">Updated 2m ago</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
            <span className="w-20 text-sm font-medium">{p.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className={`h-2 rounded-full ${p.color}`} style={{ width: `${p.score}%` }} />
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums">{p.score}%</span>
            <span className="text-xs font-medium text-emerald-500">{p.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionsDemo() {
  return (
    <div className="rounded-2xl border border-border/60 bg-[#0A2540] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="font-mono text-sm text-white/40">AI Fix Suggestions — 12 issues found</span>
      </div>

      <div className="space-y-4">
        {/* Suggestion 1 */}
        <div className="rounded-xl bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Missing image alt attributes</span>
            <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-medium text-red-400">High Priority</span>
          </div>
          <div className="space-y-0.5 font-mono text-[12px] leading-relaxed">
            <div className="text-white/30">{"// Add descriptive alt text"}</div>
            <div className="text-red-400/70">{'- <img src="hero.png">'}</div>
            <div className="text-emerald-400/90">{'+ <img src="hero.png"'}</div>
            <div className="text-emerald-400/90">{'+   alt="Dashboard analytics preview"'}</div>
            <div className="text-emerald-400/90">{'+   loading="lazy">'}</div>
          </div>
        </div>

        {/* Suggestion 2 */}
        <div className="rounded-xl bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Add meta description</span>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">Medium</span>
          </div>
          <div className="space-y-0.5 font-mono text-[12px] leading-relaxed">
            <div className="text-white/30">{"// Improve search snippet"}</div>
            <div className="text-emerald-400/90">{'+ <meta name="description"'}</div>
            <div className="text-emerald-400/90">{'+   content="Deep SEO & GEO analysis'}</div>
            <div className="text-emerald-400/90">{'+   in seconds. Scan any URL...">'}</div>
          </div>
        </div>

        {/* Suggestion 3 */}
        <div className="rounded-xl bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Add structured data</span>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">Medium</span>
          </div>
          <div className="space-y-0.5 font-mono text-[12px] leading-relaxed">
            <div className="text-white/30">{"// Schema.org JSON-LD"}</div>
            <div className="text-emerald-400/90">{'+ <script type="application/ld+json">'}</div>
            <div className="text-emerald-400/90">{'+ { "@type": "WebSite",'}</div>
            <div className="text-emerald-400/90">{'+   "name": "Your Site" }'}</div>
            <div className="text-emerald-400/90">{'+ </script>'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationsDemo() {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">Citation Trends — Last 12 weeks</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">+34%</span>
          <span className="text-sm font-medium text-emerald-500">&#8593;</span>
        </div>
      </div>

      <svg viewBox="0 0 480 120" fill="none" className="mb-4 w-full">
        <defs>
          <linearGradient id="featChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#635BFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#635BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,100 C20,98 40,95 80,88 C120,80 140,72 180,60 C220,50 240,44 280,36 C320,28 360,20 400,14 C440,8 460,5 480,3 L480,120 L0,120 Z"
          fill="url(#featChartFill)"
        />
        <path
          d="M0,100 C20,98 40,95 80,88 C120,80 140,72 180,60 C220,50 240,44 280,36 C320,28 360,20 400,14 C440,8 460,5 480,3"
          stroke="#635BFF" strokeWidth="2.5" strokeLinecap="round"
        />
        {[
          { x: 0, y: 100 }, { x: 40, y: 95 }, { x: 80, y: 88 }, { x: 120, y: 80 },
          { x: 160, y: 68 }, { x: 200, y: 56 }, { x: 240, y: 44 }, { x: 280, y: 36 },
          { x: 320, y: 28 }, { x: 360, y: 20 }, { x: 400, y: 14 }, { x: 480, y: 3 },
        ].map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#635BFF" opacity={0.3 + i * 0.06} />
        ))}
      </svg>

      <div className="flex justify-between text-xs text-muted-foreground/60">
        {["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* Keyword breakdown */}
      <div className="mt-6 space-y-2">
        {[
          { keyword: "best seo tools", rate: "78%", trend: "+12%" },
          { keyword: "ai search optimization", rate: "65%", trend: "+18%" },
          { keyword: "geo analysis tool", rate: "52%", trend: "+24%" },
        ].map((kw) => (
          <div key={kw.keyword} className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5">
            <span className="font-mono text-sm text-muted-foreground">{kw.keyword}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums">{kw.rate}</span>
              <span className="text-xs font-medium text-emerald-500">{kw.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitoringDemo() {
  const sites = [
    { site: "example.com", score: 92, prev: 90, status: "healthy", lastScan: "2 min ago", frequency: "Daily" },
    { site: "blog.example.com", score: 78, prev: 85, status: "warning", lastScan: "5 min ago", frequency: "Daily" },
    { site: "shop.example.com", score: 88, prev: 87, status: "healthy", lastScan: "3 min ago", frequency: "Weekly" },
    { site: "docs.example.com", score: 95, prev: 94, status: "healthy", lastScan: "1 min ago", frequency: "Daily" },
    { site: "api.example.com", score: 84, prev: 84, status: "healthy", lastScan: "8 min ago", frequency: "Weekly" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">Active Monitors — 5 sites</span>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-muted-foreground">All systems operational</span>
        </div>
      </div>

      <div className="space-y-2">
        {sites.map((s) => {
          const diff = s.score - s.prev;
          return (
            <div key={s.site} className="flex items-center gap-4 rounded-xl bg-white px-4 py-3">
              <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.site}</span>
              <span className="text-sm font-semibold tabular-nums">{s.score}</span>
              <span className={`text-xs font-medium tabular-nums ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {diff > 0 ? `+${diff}` : diff === 0 ? "—" : diff}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{s.frequency}</span>
              <span className="text-[11px] text-muted-foreground/60">{s.lastScan}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DEMO_MAP: Record<string, React.FC> = {
  analysis: AnalysisDemo,
  platforms: PlatformsDemo,
  suggestions: SuggestionsDemo,
  citations: CitationsDemo,
  monitoring: MonitoringDemo,
};

export default function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const feature = FEATURES[slug];

  if (!feature) {
    router.replace("/");
    return null;
  }

  const DemoComponent = DEMO_MAP[feature.demo];

  return (
    <div className="relative min-h-screen bg-white">
      <SiteNav />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-border/40 pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.back")}
            </button>
          </div>
          <div className="text-center">
          <h1
            className="mb-5 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            {t(feature.titleKey)}
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            {t(feature.subtitleKey)}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-foreground/85"
            >
              {t("features.getStarted")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/pricing")}
              className="rounded-xl border-border px-6 py-2.5 text-sm font-semibold"
            >
              {t("features.viewPricing")}
            </Button>
          </div>
          </div>
        </div>
      </section>

      {/* ─── Demo Section ─── */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {DemoComponent && <DemoComponent />}
      </section>

      {/* ─── Feature Highlights ─── */}
      <section className="border-t border-border/40 bg-secondary/20">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <div className="grid gap-8 sm:grid-cols-3">
            {feature.highlights.map((h, i) => {
              const Icon = ICON_MAP[h.iconKey] || CheckCircle2;
              return (
                <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {t(h.titleKey)}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {t(h.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden">
        <div className="mesh-gradient absolute inset-0" />
        <div className="absolute inset-x-0 top-0 z-[1] h-12 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[2] h-12 bg-gradient-to-t from-white to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t("home.ctaTitle")}
          </h2>
          <p className="mb-8 text-[15px] text-white/70">{t("home.ctaSubtitle")}</p>
          <Button
            onClick={() => router.push("/")}
            className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-foreground shadow-lg transition-all hover:bg-white/90"
          >
            {t("home.ctaButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

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
