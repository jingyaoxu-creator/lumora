"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Globe, Shield, X, Search, Bot, BarChart3, Zap, TrendingUp, Eye, Bell, Clock, Code, Target, Layers, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

gsap.registerPlugin(ScrollTrigger);

const EXAMPLES = ["google.com", "github.com", "stripe.com"];

const GRADIENT_PRESETS: Record<string, { label: string; colors: [string, string, string, string]; light?: boolean }> = {
  lumora:  { label: "Lumora",  colors: ["#ef008f", "#6ec3f4", "#7038ff", "#fbaf3f"] },
  blue:    { label: "Blue",    colors: ["#c3e4ff", "#6ec3f4", "#eae2ff", "#b9beff"], light: true },
  sunset:  { label: "Sunset",  colors: ["#ff6b35", "#f7c59f", "#efefd0", "#004e89"] },
  aurora:  { label: "Aurora",  colors: ["#0d1b2a", "#1b263b", "#00b4d8", "#90e0ef"] },
};

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search, bot: Bot, chart: BarChart3, zap: Zap, trending: TrendingUp,
  eye: Eye, bell: Bell, clock: Clock, code: Code, target: Target, layers: Layers, brain: Brain,
};

const FEATURE_MODAL: Record<string, {
  titleKey: string; subtitleKey: string;
  highlights: { icon: string; titleKey: string; descKey: string }[];
}> = {
  analysis: {
    titleKey: "features.analysis.title", subtitleKey: "features.analysis.subtitle",
    highlights: [
      { icon: "search", titleKey: "features.analysis.h1Title", descKey: "features.analysis.h1Desc" },
      { icon: "bot", titleKey: "features.analysis.h2Title", descKey: "features.analysis.h2Desc" },
      { icon: "chart", titleKey: "features.analysis.h3Title", descKey: "features.analysis.h3Desc" },
    ],
  },
  platforms: {
    titleKey: "features.platforms.title", subtitleKey: "features.platforms.subtitle",
    highlights: [
      { icon: "layers", titleKey: "features.platforms.h1Title", descKey: "features.platforms.h1Desc" },
      { icon: "target", titleKey: "features.platforms.h2Title", descKey: "features.platforms.h2Desc" },
      { icon: "zap", titleKey: "features.platforms.h3Title", descKey: "features.platforms.h3Desc" },
    ],
  },
  suggestions: {
    titleKey: "features.suggestions.title", subtitleKey: "features.suggestions.subtitle",
    highlights: [
      { icon: "brain", titleKey: "features.suggestions.h1Title", descKey: "features.suggestions.h1Desc" },
      { icon: "code", titleKey: "features.suggestions.h2Title", descKey: "features.suggestions.h2Desc" },
      { icon: "zap", titleKey: "features.suggestions.h3Title", descKey: "features.suggestions.h3Desc" },
    ],
  },
  citations: {
    titleKey: "features.citations.title", subtitleKey: "features.citations.subtitle",
    highlights: [
      { icon: "trending", titleKey: "features.citations.h1Title", descKey: "features.citations.h1Desc" },
      { icon: "target", titleKey: "features.citations.h2Title", descKey: "features.citations.h2Desc" },
      { icon: "chart", titleKey: "features.citations.h3Title", descKey: "features.citations.h3Desc" },
    ],
  },
  monitoring: {
    titleKey: "features.monitoring.title", subtitleKey: "features.monitoring.subtitle",
    highlights: [
      { icon: "eye", titleKey: "features.monitoring.h1Title", descKey: "features.monitoring.h1Desc" },
      { icon: "bell", titleKey: "features.monitoring.h2Title", descKey: "features.monitoring.h2Desc" },
      { icon: "clock", titleKey: "features.monitoring.h3Title", descKey: "features.monitoring.h3Desc" },
    ],
  },
};


export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState("lumora");
  const router = useRouter();
  const t = useTranslation();

  const heroRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<any>(null);


  const handleAnalyze = useCallback(() => {
    const target = url.trim();
    if (!target) return;
    setLoading(true);
    // Clear cached results so the terminal animation always plays
    try { sessionStorage.removeItem(`lumora_results_${target}`); } catch {}
    router.push(`/results?url=${encodeURIComponent(target)}`);
  }, [url, router]);

  useEffect(() => {
    if (activeFeature) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeFeature]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-hero-anim]", {
        y: 50, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      });
      const bentoEls = gsap.utils.toArray("[data-bento]");
      gsap.from(bentoEls, {
        scrollTrigger: { trigger: bentoRef.current, start: "top 85%" },
        y: 60, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
        onComplete() {
          gsap.set(bentoEls, { clearProps: "transform,opacity" });
        },
      });
    });
    return () => ctx.revert();
  }, []);

  // WebGL Mesh Gradient
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initGradient = () => {
      const G = new (window as any).Gradient();
      G.initGradient("#gradient-canvas");
      gradientRef.current = G;
    };

    // beforeInteractive in layout.tsx loads gradient.js early — usually ready by now
    if ((window as any).Gradient) {
      initGradient();
    } else {
      // Fallback: script not yet executed (rare race condition)
      const fallback = document.createElement("script");
      fallback.src = "/gradient.js";
      fallback.onload = initGradient;
      document.head.appendChild(fallback);
    }

    return () => {
      if (gradientRef.current) {
        try { gradientRef.current.disconnect(); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchPreset(key: string) {
    const canvas = canvasRef.current;
    if (!canvas || !gradientRef.current) return;
    setActivePreset(key);

    // Update CSS vars via style.setProperty (same approach as original demo)
    const colors = GRADIENT_PRESETS[key].colors;
    colors.forEach((c, i) => canvas.style.setProperty(`--gradient-color-${i + 1}`, c));

    // Re-init on the SAME Gradient instance (like original demo does)
    gradientRef.current.initGradient("#gradient-canvas");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <SiteNav />

      {/* ─── Hero with WebGL Mesh Gradient ─── */}
      <section ref={heroRef} className="relative h-screen min-h-[700px] overflow-hidden">
        {/* Static gradient placeholder — same colors as Lumora preset, hidden once WebGL paints */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #ef008f 0%, #6ec3f4 35%, #7038ff 65%, #fbaf3f 100%)" }} />
        {/* WebGL canvas */}
        <canvas
          ref={canvasRef}
          id="gradient-canvas"
          className="absolute inset-0 h-full w-full"
          data-js-darken-top
          data-transition-in
          style={{
            "--gradient-color-1": GRADIENT_PRESETS.lumora.colors[0],
            "--gradient-color-2": GRADIENT_PRESETS.lumora.colors[1],
            "--gradient-color-3": GRADIENT_PRESETS.lumora.colors[2],
            "--gradient-color-4": GRADIENT_PRESETS.lumora.colors[3],
          } as React.CSSProperties}
        />
        <div className="absolute inset-x-0 bottom-0 z-[2] h-[104px] bg-gradient-to-t from-white to-transparent" />

        {/* Preset switcher */}
        <div className="absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
          {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => switchPreset(key)}
              className={`h-5 w-12 rounded-full transition-all ${
                activePreset === key
                  ? "ring-1 ring-white ring-offset-1"
                  : "opacity-70 hover:opacity-100"
              }`}
              style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[2]})` }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
          <div data-hero-anim className="mb-8">
            <span className={`inline-flex items-center gap-2.5 rounded-full border bg-white/50 px-5 py-2 text-[15px] font-semibold backdrop-blur-md transition-colors duration-500 ${
              GRADIENT_PRESETS[activePreset]?.light
                ? "border-foreground/15 text-foreground"
                : "border-white/40 text-white"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                GRADIENT_PRESETS[activePreset]?.light ? "bg-foreground" : "bg-white"
              }`} />
              {t("home.badge")}
            </span>
          </div>

          <h1
            data-hero-anim
            className={`mb-8 text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[1.06] tracking-tight transition-colors duration-500 ${
              GRADIENT_PRESETS[activePreset]?.light ? "text-foreground" : "text-white"
            }`}
            style={{ fontFamily: "var(--font-geist)" }}
          >
            {t("home.headline1")}
            <br />
            {t("home.headline2")}
          </h1>

          <p
            data-hero-anim
            className={`mx-auto mb-14 max-w-xl text-[18px] font-semibold leading-relaxed transition-colors duration-500 ${
              GRADIENT_PRESETS[activePreset]?.light ? "text-foreground/70" : "text-white/80"
            }`}
          >
            {t("home.subtitle")}
          </p>

          <div data-hero-anim className="w-full max-w-xl">
            <form
              onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }}
              className="group relative"
            >
              <div className="relative flex items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Globe className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder={t("home.inputPlaceholder")}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-[15px] text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className={`h-9 rounded-full px-5 text-sm font-medium transition-all duration-500 ease-out ${
                    url.trim()
                      ? "btn-glass-active bg-brand-navy text-white shadow-lg shadow-brand-navy/25 hover:bg-brand-navy/85"
                      : "btn-glass text-brand-navy"
                  }`}
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      {t("home.analyze")}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>

          </div>
        </div>
      </section>

      {/* ─── Bento Feature Grid ─── */}
      <section ref={bentoRef} className="mx-auto max-w-6xl px-6 pb-32 pt-20">
        <div data-bento className="mb-14 text-center">
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("home.statsHeading")}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {t("home.statsSubtitle")}
          </p>
        </div>

        {/* Top row */}
        <div className="grid gap-5 lg:grid-cols-5">
          {/* ── Score Dashboard ── */}
          <div data-bento className="lg:col-span-3">
          <div onClick={() => setActiveFeature("analysis")} className="glass group block h-full cursor-pointer overflow-hidden rounded-2xl transition-[scale,box-shadow] duration-[400ms] ease-out hover:scale-[1.02] hover:shadow-xl">
            <div className="p-8 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 text-xl font-semibold tracking-tight">
                    {t("home.bentoScoreTitle")}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {t("home.bentoScoreDesc")}
                  </p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-[400ms] ease-out group-hover:scale-125 group-hover:bg-brand-purple/10">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors duration-[400ms] ease-out group-hover:text-brand-purple" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 1.5H14.5V6.5" />
                    <path d="M6.5 14.5H1.5V9.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
                {/* Mock URL bar */}
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-muted-foreground">example.com</span>
                </div>

                <div className="flex items-start gap-8">
                  {/* Score ring */}
                  <div className="flex-shrink-0">
                    <svg width="112" height="112" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle
                        cx="56" cy="56" r="48"
                        fill="none"
                        stroke="var(--color-brand-purple)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="301.6"
                        transform="rotate(-90 56 56)"
                        className="bento-score-ring"
                      />
                      <text x="56" y="53" textAnchor="middle" fill="var(--foreground)" fontSize="26" fontWeight="700">87</text>
                      <text x="56" y="70" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">/100</text>
                    </svg>
                  </div>

                  {/* Category bars */}
                  <div className="flex-1 space-y-3.5 pt-2">
                    {[
                      { label: "SEO", score: 91, color: "bg-brand-blue" },
                      { label: "GEO", score: 83, color: "bg-brand-purple" },
                      { label: "AI Ready", score: 78, color: "bg-brand-cyan" },
                    ].map((cat, i) => (
                      <div key={cat.label}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat.label}</span>
                          <span className="font-semibold tabular-nums">{cat.score}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className={`bento-bar h-2 rounded-full ${cat.color}`}
                            style={{ width: `${cat.score}%`, animationDelay: `${i * 0.15 + 0.5}s` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Check items */}
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: "Meta description", pass: true },
                    { label: "Schema.org markup", pass: true },
                    { label: "H1 tag optimized", pass: true },
                    { label: "AI readability", pass: true },
                    { label: "Image alt text", pass: false },
                    { label: "Citation hooks", pass: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <div className={`h-1.5 w-1.5 rounded-full ${item.pass ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* ── AI Platforms ── */}
          <div data-bento className="lg:col-span-2">
          <div onClick={() => setActiveFeature("platforms")} className="glass group block h-full cursor-pointer overflow-hidden rounded-2xl transition-[scale,box-shadow] duration-[400ms] ease-out hover:scale-[1.02] hover:shadow-xl">
            <div className="p-8 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 text-xl font-semibold tracking-tight">
                    {t("home.bentoPlatformTitle")}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {t("home.bentoPlatformDesc")}
                  </p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-[400ms] ease-out group-hover:scale-125 group-hover:bg-brand-purple/10">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors duration-[400ms] ease-out group-hover:text-brand-purple" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 1.5H14.5V6.5" />
                    <path d="M6.5 14.5H1.5V9.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-8">
                {[
                  { name: "ChatGPT", score: 92, color: "bg-brand-purple" },
                  { name: "Perplexity", score: 88, color: "bg-brand-blue" },
                  { name: "Claude", score: 85, color: "bg-brand-indigo" },
                  { name: "Gemini", score: 79, color: "bg-brand-cyan" },
                  { name: "Copilot", score: 74, color: "bg-brand-blue" },
                  { name: "SearchGPT", score: 71, color: "bg-brand-purple" },
                ].map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-[76px] text-sm text-muted-foreground">{p.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`bento-bar h-2 rounded-full ${p.color}`}
                        style={{ width: `${p.score}%`, animationDelay: `${i * 0.1 + 0.3}s` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums">{p.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* ── Fix Suggestions (dark) ── */}
          <div data-bento>
          <div onClick={() => setActiveFeature("suggestions")} className="glass group block h-full cursor-pointer overflow-hidden rounded-2xl transition-[scale,box-shadow] duration-[400ms] ease-out hover:scale-[1.02] hover:shadow-xl">
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {t("home.bentoFixTitle")}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {t("home.bentoFixDesc")}
                  </p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-[400ms] ease-out group-hover:scale-125 group-hover:bg-brand-purple/10">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors duration-[400ms] ease-out group-hover:text-brand-purple" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 1.5H14.5V6.5" />
                    <path d="M6.5 14.5H1.5V9.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-lg bg-[#0A2540] p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
                  <div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
                  <div className="h-2 w-2 rounded-full bg-[#28C840]" />
                  <span className="ml-2 text-[10px] text-white/20">suggestions.diff</span>
                </div>
                <div className="space-y-0.5 font-mono text-[11px] leading-relaxed">
                  <div className="text-white/30">{"// Missing alt attribute"}</div>
                  <div className="text-red-400/70">{"- <img src=\"hero.png\">"}</div>
                  <div className="text-emerald-400/90">{"+ <img src=\"hero.png\""}</div>
                  <div className="text-emerald-400/90">{"+   alt=\"Dashboard preview\""}</div>
                  <div className="text-emerald-400/90">{"+   loading=\"lazy\">"}</div>
                  <div className="mt-2 text-white/30">{"// Add meta description"}</div>
                  <div className="text-emerald-400/90">{"+ <meta name=\"description\""}</div>
                  <div className="text-emerald-400/90">{"+   content=\"Deep SEO & GEO...\">"}</div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* ── Citation Tracking ── */}
          <div data-bento>
          <div onClick={() => setActiveFeature("citations")} className="glass group block h-full cursor-pointer overflow-hidden rounded-2xl transition-[scale,box-shadow] duration-[400ms] ease-out hover:scale-[1.02] hover:shadow-xl">
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {t("home.bentoCitationTitle")}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {t("home.bentoCitationDesc")}
                  </p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-[400ms] ease-out group-hover:scale-125 group-hover:bg-brand-purple/10">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors duration-[400ms] ease-out group-hover:text-brand-purple" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 1.5H14.5V6.5" />
                    <path d="M6.5 14.5H1.5V9.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">+34%</span>
                  <span className="text-sm font-medium text-emerald-500">&#8593;</span>
                </div>
                <span className="text-xs text-muted-foreground">Last 30 days</span>
              </div>
              <svg viewBox="0 0 240 80" fill="none" className="w-full">
                <defs>
                  <linearGradient id="bentoChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#635BFF" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#635BFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,65 C20,62 40,58 60,50 C80,42 100,38 120,30 C140,24 160,18 180,12 C200,8 220,5 240,3 L240,80 L0,80 Z"
                  fill="url(#bentoChartFill)"
                />
                <path
                  d="M0,65 C20,62 40,58 60,50 C80,42 100,38 120,30 C140,24 160,18 180,12 C200,8 220,5 240,3"
                  stroke="#635BFF" strokeWidth="2" strokeLinecap="round"
                  className="bento-chart-line"
                />
                <circle cx="240" cy="3" r="3" fill="#635BFF" />
              </svg>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/50">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>
          </div>

          {/* ── Site Monitoring ── */}
          <div data-bento>
          <div onClick={() => setActiveFeature("monitoring")} className="glass group block h-full cursor-pointer overflow-hidden rounded-2xl transition-[scale,box-shadow] duration-[400ms] ease-out hover:scale-[1.02] hover:shadow-xl">
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {t("home.bentoMonitorTitle")}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {t("home.bentoMonitorDesc")}
                  </p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-[400ms] ease-out group-hover:scale-125 group-hover:bg-brand-purple/10">
                  <svg className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors duration-[400ms] ease-out group-hover:text-brand-purple" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 1.5H14.5V6.5" />
                    <path d="M6.5 14.5H1.5V9.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { site: "example.com", score: 92, up: true, time: "2m" },
                  { site: "blog.example.com", score: 78, up: false, time: "5m" },
                  { site: "shop.example.com", score: 88, up: true, time: "3m" },
                  { site: "docs.example.com", score: 95, up: true, time: "1m" },
                ].map((s) => (
                  <div key={s.site} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                    <div className={`h-2 w-2 flex-shrink-0 rounded-full ${s.up ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="flex-1 truncate text-sm">{s.site}</span>
                    <span className="text-sm font-semibold tabular-nums">{s.score}</span>
                    <span className="text-[10px] text-muted-foreground/60">{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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

      {/* ─── Feature Modal Overlay ─── */}
      {activeFeature && FEATURE_MODAL[activeFeature] && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm"
          onClick={() => setActiveFeature(null)}
        >
          <div
            className="relative mx-4 my-10 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-border/60 bg-white shadow-2xl">
              {/* Close button */}
              <button
                onClick={() => setActiveFeature(null)}
                className="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8 pt-6">
                <h3 className="mb-2 pr-10 text-2xl font-bold tracking-tight text-foreground">
                  {t(FEATURE_MODAL[activeFeature].titleKey)}
                </h3>
                <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">
                  {t(FEATURE_MODAL[activeFeature].subtitleKey)}
                </p>

                {/* ── Product Demo (Stripe-style: show actual product UI, not teaser) ── */}
                <div className="mb-8">

                  {/* === Analysis Demo — show actual results page UI === */}
                  {activeFeature === "analysis" && (
                    <div className="grid gap-4 sm:grid-cols-5">
                      {/* Large: Check results view */}
                      <div className="sm:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-white">
                        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                          <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                          <span className="text-[9px] text-muted-foreground/50">Check Results — SEO</span>
                        </div>
                        <div className="p-4 space-y-2.5">
                          {[
                            { name: "Meta Description", status: "pass", score: 100, detail: "Length: 142 chars — within optimal 120-160 range" },
                            { name: "Structured Data", status: "pass", score: 95, detail: "Found: Organization, WebSite, BreadcrumbList (3 schemas)" },
                            { name: "Image Alt Text", status: "warning", score: 60, detail: "4 of 12 images missing alt attributes" },
                            { name: "Internal Links", status: "pass", score: 90, detail: "47 internal links found, good site structure" },
                            { name: "Page Speed", status: "fail", score: 35, detail: "LCP: 4.2s — exceeds 2.5s threshold" },
                            { name: "Mobile Viewport", status: "pass", score: 100, detail: "Responsive meta viewport tag configured correctly" },
                          ].map((c) => (
                            <div key={c.name} className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                              <div className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                c.status === "pass" ? "bg-emerald-400" : c.status === "warning" ? "bg-amber-400" : "bg-red-400"
                              }`}>
                                {c.status === "pass" ? "✓" : c.status === "warning" ? "!" : "✕"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[12px] font-medium">{c.name}</span>
                                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{c.score}/100</span>
                                </div>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{c.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Two small panels stacked */}
                      <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Radar chart */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white flex-1">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Category Breakdown</span>
                          </div>
                          <div className="flex items-center justify-center p-4">
                            <svg width="160" height="140" viewBox="0 0 160 140">
                              {/* Radar grid */}
                              <polygon points="80,15 140,50 130,110 30,110 20,50" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                              <polygon points="80,35 120,58 114,98 46,98 40,58" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                              <polygon points="80,55 100,66 97,86 63,86 60,66" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                              {/* Score shape */}
                              <polygon points="80,20 136,52 110,105 42,100 25,52" fill="oklch(0.637 0.249 283 / 0.12)" stroke="oklch(0.637 0.249 283)" strokeWidth="1.5" />
                              {/* Labels */}
                              <text x="80" y="10" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Content</text>
                              <text x="148" y="50" textAnchor="start" fontSize="8" fill="var(--muted-foreground)">Technical</text>
                              <text x="135" y="118" textAnchor="start" fontSize="8" fill="var(--muted-foreground)">Links</text>
                              <text x="25" y="118" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">AI Ready</text>
                              <text x="12" y="50" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">Security</text>
                            </svg>
                          </div>
                        </div>
                        {/* Export panel */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Export Report</span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10 text-[10px] font-bold text-red-500">PDF</div>
                              <div><div className="text-[11px] font-medium">Full Analysis Report</div><div className="text-[9px] text-muted-foreground">Branded PDF with scores, charts & suggestions</div></div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-[10px] font-bold text-emerald-600">CSV</div>
                              <div><div className="text-[11px] font-medium">Raw Check Data</div><div className="text-[9px] text-muted-foreground">All 103 checks as spreadsheet rows</div></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Platforms Demo — show per-platform detail + crawler access === */}
                  {activeFeature === "platforms" && (
                    <div className="grid gap-4 sm:grid-cols-5">
                      {/* Large: Platform detail card */}
                      <div className="sm:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-white">
                        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                          <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                          <span className="text-[9px] text-muted-foreground/50">Platform Detail — ChatGPT</span>
                        </div>
                        <div className="p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10"><Bot className="h-4 w-4 text-brand-purple" /></div>
                              <div>
                                <div className="text-sm font-semibold">ChatGPT / SearchGPT</div>
                                <div className="text-[10px] text-muted-foreground">OpenAI — GPTBot crawler</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold tabular-nums text-brand-purple">94%</div>
                              <div className="text-[9px] text-muted-foreground">readiness</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {[
                              { criterion: "Content Citability", score: 96, desc: "Clear claims with source attribution" },
                              { criterion: "Entity Coverage", score: 92, desc: "Schema.org sameAs linked to Wikidata" },
                              { criterion: "Snippet Structure", score: 98, desc: "Well-formatted Q&A and list patterns" },
                              { criterion: "Crawler Access", score: 100, desc: "GPTBot allowed in robots.txt" },
                              { criterion: "Freshness Signals", score: 85, desc: "Last-Modified header present, datePublished set" },
                            ].map((c) => (
                              <div key={c.criterion} className="rounded-lg bg-secondary/40 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium">{c.criterion}</span>
                                  <span className="text-[10px] font-semibold tabular-nums">{c.score}%</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/50">
                                  <div className="h-1.5 rounded-full bg-brand-purple" style={{ width: `${c.score}%` }} />
                                </div>
                                <p className="mt-1 text-[9px] text-muted-foreground">{c.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Two small panels */}
                      <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Crawler access matrix */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white flex-1">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">robots.txt — Crawler Access</span>
                          </div>
                          <div className="p-3 space-y-1.5">
                            {[
                              { bot: "GPTBot", status: "allowed" },
                              { bot: "Google-Extended", status: "allowed" },
                              { bot: "ClaudeBot", status: "restricted" },
                              { bot: "PerplexityBot", status: "allowed" },
                              { bot: "CCBot", status: "blocked" },
                              { bot: "Bytespider", status: "blocked" },
                            ].map((b) => (
                              <div key={b.bot} className="flex items-center justify-between rounded-md bg-secondary/40 px-2.5 py-1.5">
                                <span className="font-mono text-[10px]">{b.bot}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                  b.status === "allowed" ? "bg-emerald-400/10 text-emerald-600" :
                                  b.status === "restricted" ? "bg-amber-400/10 text-amber-600" :
                                  "bg-red-400/10 text-red-600"
                                }`}>{b.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Per-platform comparison */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Platform Priorities</span>
                          </div>
                          <div className="p-3 text-[10px] text-muted-foreground space-y-2">
                            <div className="rounded-md bg-brand-purple/5 px-2.5 py-2">
                              <span className="font-medium text-foreground">ChatGPT</span> weighs <span className="font-semibold text-brand-purple">citation hooks</span> and entity coverage highest
                            </div>
                            <div className="rounded-md bg-brand-blue/5 px-2.5 py-2">
                              <span className="font-medium text-foreground">Perplexity</span> prioritizes <span className="font-semibold text-brand-blue">source freshness</span> and factual density
                            </div>
                            <div className="rounded-md bg-brand-cyan/5 px-2.5 py-2">
                              <span className="font-medium text-foreground">Google AI</span> favors <span className="font-semibold text-brand-cyan">structured data</span> and E-E-A-T signals
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Suggestions Demo — show actual AI suggestion cards === */}
                  {activeFeature === "suggestions" && (
                    <div className="grid gap-4 sm:grid-cols-5">
                      {/* Large: Full suggestion card */}
                      <div className="sm:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-white">
                        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                          <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                          <span className="text-[9px] text-muted-foreground/50">AI Suggestion #1 of 20</span>
                        </div>
                        <div className="p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">Critical</span>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">SEO</span>
                          </div>
                          <h4 className="mb-1.5 text-sm font-semibold">Add Missing Meta Description</h4>
                          <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
                            Your page has no meta description. Search engines and AI models use this to understand and summarize your page. Without it, they auto-generate one — often poorly. A good description also improves CTR by 5-10%.
                          </p>
                          <div className="rounded-lg bg-[#0A2540] p-3">
                            <div className="mb-2 flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
                              <div className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
                              <div className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
                            </div>
                            <div className="space-y-0.5 font-mono text-[10px] leading-relaxed">
                              <div className="text-white/30">{"// Add to <head>"}</div>
                              <div className="text-emerald-400/90">{"+ <meta name=\"description\""}</div>
                              <div className="text-emerald-400/90">{"    content=\"Deep SEO & GEO analysis"}</div>
                              <div className="text-emerald-400/90">{"    in seconds. Optimize for AI...\" />"}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                            <span>Expected impact: <span className="font-semibold text-emerald-600">+8 pts</span></span>
                            <span>Effort: <span className="font-semibold text-foreground">2 min</span></span>
                          </div>
                        </div>
                      </div>
                      {/* Two small panels */}
                      <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Score impact projection */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white flex-1">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Projected Impact</span>
                          </div>
                          <div className="p-4 text-center">
                            <div className="mb-1 text-[10px] text-muted-foreground">If all suggestions applied</div>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-2xl font-bold tabular-nums text-muted-foreground/40">72</span>
                              <span className="text-muted-foreground/40">→</span>
                              <span className="text-2xl font-bold tabular-nums text-brand-purple">91</span>
                            </div>
                            <div className="mt-2 text-[10px] font-semibold text-emerald-600">+19 points improvement</div>
                            <div className="mt-3 space-y-1.5">
                              {[
                                { cat: "Critical fixes", pts: "+11", count: 3 },
                                { cat: "High priority", pts: "+5", count: 5 },
                                { cat: "Medium/Low", pts: "+3", count: 12 },
                              ].map((r) => (
                                <div key={r.cat} className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted-foreground">{r.cat} ({r.count})</span>
                                  <span className="font-semibold text-emerald-600">{r.pts}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Suggestion queue */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Suggestion Queue</span>
                          </div>
                          <div className="p-3 space-y-1.5">
                            {[
                              { title: "Add meta description", p: "critical", done: false },
                              { title: "Fix image alt text (4)", p: "high", done: false },
                              { title: "Add FAQ schema markup", p: "high", done: false },
                              { title: "Improve page speed", p: "critical", done: false },
                              { title: "Add OpenGraph tags", p: "medium", done: true },
                            ].map((s) => (
                              <div key={s.title} className="flex items-center gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5">
                                <div className={`h-3.5 w-3.5 flex-shrink-0 rounded border ${s.done ? "border-emerald-400 bg-emerald-400 text-white" : "border-border"} flex items-center justify-center text-[8px]`}>
                                  {s.done && "✓"}
                                </div>
                                <span className={`flex-1 text-[10px] ${s.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}>{s.title}</span>
                                <span className={`text-[8px] font-medium ${
                                  s.p === "critical" ? "text-red-500" : s.p === "high" ? "text-amber-500" : "text-blue-500"
                                }`}>{s.p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Citations Demo — show tracking dashboard + platform breakdown === */}
                  {activeFeature === "citations" && (
                    <div className="grid gap-4 sm:grid-cols-5">
                      {/* Large: Keyword tracking table */}
                      <div className="sm:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-white">
                        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                          <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                          <span className="text-[9px] text-muted-foreground/50">Keyword Citation Tracking</span>
                        </div>
                        <div className="p-4">
                          {/* Table header */}
                          <div className="mb-2 grid grid-cols-12 gap-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2">
                            <div className="col-span-4">Keyword</div>
                            <div className="col-span-2 text-center">Rate</div>
                            <div className="col-span-3 text-center">Platforms</div>
                            <div className="col-span-3 text-right">Trend</div>
                          </div>
                          {/* Table rows */}
                          {[
                            { kw: "best seo tools 2026", rate: 92, platforms: 4, trend: "+12%", up: true },
                            { kw: "website analysis tool", rate: 88, platforms: 3, trend: "+8%", up: true },
                            { kw: "ai search optimization", rate: 76, platforms: 2, trend: "+23%", up: true },
                            { kw: "geo optimization guide", rate: 71, platforms: 2, trend: "+5%", up: true },
                            { kw: "seo audit checklist", rate: 64, platforms: 1, trend: "-3%", up: false },
                            { kw: "structured data testing", rate: 58, platforms: 2, trend: "+15%", up: true },
                          ].map((r) => (
                            <div key={r.kw} className="grid grid-cols-12 gap-2 items-center rounded-lg bg-secondary/40 px-2 py-2 mb-1.5">
                              <div className="col-span-4 truncate text-[11px] font-medium">{r.kw}</div>
                              <div className="col-span-2 text-center">
                                <span className="text-[11px] font-semibold tabular-nums">{r.rate}%</span>
                              </div>
                              <div className="col-span-3 flex justify-center gap-0.5">
                                {Array.from({ length: r.platforms }).map((_, i) => (
                                  <div key={i} className="h-2 w-2 rounded-full bg-brand-purple/60" />
                                ))}
                                {Array.from({ length: 4 - r.platforms }).map((_, i) => (
                                  <div key={i} className="h-2 w-2 rounded-full bg-border" />
                                ))}
                              </div>
                              <div className={`col-span-3 text-right text-[10px] font-semibold ${r.up ? "text-emerald-600" : "text-red-500"}`}>
                                {r.trend}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Two small panels */}
                      <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Citation sources breakdown */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white flex-1">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Citation Sources</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {[
                              { name: "Perplexity", pct: 38, color: "bg-brand-blue" },
                              { name: "ChatGPT", pct: 28, color: "bg-brand-purple" },
                              { name: "Google AI", pct: 22, color: "bg-brand-cyan" },
                              { name: "Others", pct: 12, color: "bg-border" },
                            ].map((s) => (
                              <div key={s.name}>
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span className="text-muted-foreground">{s.name}</span>
                                  <span className="font-semibold tabular-nums">{s.pct}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                  <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Month comparison */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Monthly Comparison</span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <div className="text-[9px] text-muted-foreground mb-1">Last Month</div>
                                <div className="text-xl font-bold tabular-nums text-muted-foreground/50">64%</div>
                                <div className="text-[9px] text-muted-foreground">avg. citation rate</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-muted-foreground mb-1">This Month</div>
                                <div className="text-xl font-bold tabular-nums text-brand-purple">78%</div>
                                <div className="text-[9px] text-emerald-600 font-semibold">+14% improvement</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === Monitoring Demo — show score timeline + alerts + config === */}
                  {activeFeature === "monitoring" && (
                    <div className="grid gap-4 sm:grid-cols-5">
                      {/* Large: Score history timeline */}
                      <div className="sm:col-span-3 overflow-hidden rounded-xl border border-border/60 bg-white">
                        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                          <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                          <span className="text-[9px] text-muted-foreground/50">example.com — Score History</span>
                        </div>
                        <div className="p-4">
                          {/* Chart */}
                          <svg viewBox="0 0 360 120" fill="none" className="w-full mb-3">
                            <defs>
                              <linearGradient id="monitorFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#635BFF" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="#635BFF" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Alert threshold line */}
                            <line x1="0" y1="72" x2="360" y2="72" stroke="#DF1B41" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                            <text x="362" y="75" fontSize="7" fill="#DF1B41" opacity="0.6">threshold</text>
                            {/* Score line */}
                            <path d="M0,24 C40,20 80,22 120,18 C160,28 180,60 200,78 C220,72 240,42 280,30 C320,24 340,22 360,20" fill="none" stroke="#635BFF" strokeWidth="2" strokeLinecap="round" />
                            <path d="M0,24 C40,20 80,22 120,18 C160,28 180,60 200,78 C220,72 240,42 280,30 C320,24 340,22 360,20 L360,120 L0,120 Z" fill="url(#monitorFill)" />
                            {/* Score dip annotation */}
                            <circle cx="200" cy="78" r="4" fill="#DF1B41" />
                            <rect x="165" y="84" width="70" height="16" rx="3" fill="#DF1B41" opacity="0.9" />
                            <text x="200" y="94" textAnchor="middle" fontSize="7" fill="white" fontWeight="600">Score drop: -15</text>
                            {/* Recovery annotation */}
                            <circle cx="280" cy="30" r="3" fill="#635BFF" />
                            <rect x="248" y="10" width="64" height="14" rx="3" fill="#635BFF" opacity="0.9" />
                            <text x="280" y="19" textAnchor="middle" fontSize="7" fill="white" fontWeight="600">Recovered ✓</text>
                          </svg>
                          <div className="flex justify-between text-[9px] text-muted-foreground/50 mb-4">
                            <span>Mar 14</span><span>Mar 21</span><span>Mar 28</span><span>Apr 4</span><span>Apr 11</span>
                          </div>
                          {/* Scan log */}
                          <div className="space-y-1.5">
                            {[
                              { date: "Apr 13, 08:00", score: 92, delta: "+3", color: "text-emerald-600" },
                              { date: "Apr 12, 08:00", score: 89, delta: "+4", color: "text-emerald-600" },
                              { date: "Apr 11, 08:00", score: 85, delta: "+7", color: "text-emerald-600" },
                              { date: "Apr 10, 08:00", score: 78, delta: "-15", color: "text-red-500" },
                              { date: "Apr 9, 08:00", score: 93, delta: "0", color: "text-muted-foreground" },
                            ].map((l) => (
                              <div key={l.date} className="flex items-center justify-between rounded-md bg-secondary/40 px-2.5 py-1.5 text-[10px]">
                                <span className="text-muted-foreground">{l.date}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold tabular-nums">{l.score}</span>
                                  <span className={`font-semibold tabular-nums ${l.color}`}>{l.delta}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Two small panels */}
                      <div className="sm:col-span-2 flex flex-col gap-4">
                        {/* Alert configuration */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white flex-1">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Alert Configuration</span>
                          </div>
                          <div className="p-3 space-y-2.5">
                            <div className="rounded-md bg-secondary/40 px-2.5 py-2">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-muted-foreground">Scan frequency</span>
                                <span className="font-medium rounded bg-brand-purple/10 text-brand-purple px-1.5">Daily</span>
                              </div>
                            </div>
                            <div className="rounded-md bg-secondary/40 px-2.5 py-2">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-muted-foreground">Drop threshold</span>
                                <span className="font-medium rounded bg-red-400/10 text-red-600 px-1.5">5 points</span>
                              </div>
                            </div>
                            <div className="rounded-md bg-secondary/40 px-2.5 py-2">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-muted-foreground">Notify via</span>
                                <span className="font-medium rounded bg-secondary text-foreground px-1.5">Email</span>
                              </div>
                            </div>
                            <div className="rounded-md bg-secondary/40 px-2.5 py-2">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Recipients</span>
                                <span className="font-medium text-foreground text-[10px]">team@co.com</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Notification log */}
                        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                            <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /><div className="h-1.5 w-1.5 rounded-full bg-border" /></div>
                            <span className="text-[9px] text-muted-foreground/50">Notification Log</span>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50/50 px-2.5 py-2">
                              <Bell className="h-3 w-3 flex-shrink-0 text-red-500 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-medium text-red-700">Score dropped by 15 pts</div>
                                <div className="text-[9px] text-red-500/70">Apr 10, 08:02 — emailed team@co.com</div>
                              </div>
                            </div>
                            <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-2.5 py-2">
                              <Eye className="h-3 w-3 flex-shrink-0 text-emerald-500 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-medium text-emerald-700">Score recovered to 92</div>
                                <div className="text-[9px] text-emerald-500/70">Apr 13, 08:01 — auto-resolved</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Highlight Cards ── */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {FEATURE_MODAL[activeFeature].highlights.map((h) => {
                    const Icon = ICON_MAP[h.icon] || Zap;
                    return (
                      <div
                        key={h.titleKey}
                        className="rounded-xl border border-border/60 bg-secondary/30 p-5"
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10">
                          <Icon className="h-4.5 w-4.5 text-brand-purple" />
                        </div>
                        <h4 className="mb-1.5 text-sm font-semibold text-foreground">
                          {t(h.titleKey)}
                        </h4>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {t(h.descKey)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* ── Action Buttons ── */}
                <div className="mt-8 flex items-center gap-3">
                  <Button
                    onClick={() => {
                      setActiveFeature(null);
                      router.push("/auth/signup");
                    }}
                    className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-white shadow-none transition-colors hover:bg-foreground/85"
                  >
                    {t("features.getStarted")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveFeature(null)}
                    className="rounded-xl border-border/60 px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("features.viewPricing")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
