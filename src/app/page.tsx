"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Bot,
  Brain,
  FileSearch,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

gsap.registerPlugin(ScrollTrigger);

const EXAMPLES = ["google.com", "github.com", "stripe.com"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = () => {
    const target = url.trim();
    if (!target) return;
    setLoading(true);
    router.push(`/results?url=${encodeURIComponent(target)}`);
  };

  /* ─── GSAP Scroll Animations ─── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero content fade-in on load
      gsap.from("[data-hero-anim]", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
      });

      // Feature cards scroll reveal
      gsap.from("[data-feature-card]", {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
      });

      // Steps scroll reveal
      gsap.from("[data-step]", {
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
      });

      // Steps heading
      gsap.from("[data-steps-heading]", {
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 85%",
        },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ─── Aurora Background ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
        {/* Violet orb — top-left */}
        <div
          className="absolute -top-[200px] -left-[100px] h-[700px] w-[700px] rounded-full opacity-[0.18] blur-[140px]"
          style={{
            background: "radial-gradient(circle, oklch(0.7 0.2 285), transparent 65%)",
            animation: "aurora-1 24s ease-in-out infinite",
          }}
        />
        {/* Blue orb — top-right */}
        <div
          className="absolute -top-[50px] -right-[150px] h-[600px] w-[600px] rounded-full opacity-[0.14] blur-[120px]"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.18 255), transparent 65%)",
            animation: "aurora-2 28s ease-in-out infinite",
          }}
        />
        {/* Cyan/teal orb — center */}
        <div
          className="absolute top-[40%] left-[20%] h-[500px] w-[500px] rounded-full opacity-[0.10] blur-[120px]"
          style={{
            background: "radial-gradient(circle, oklch(0.75 0.14 200), transparent 65%)",
            animation: "aurora-3 22s ease-in-out infinite",
          }}
        />
        {/* Gold orb — bottom */}
        <div
          className="absolute -bottom-[100px] right-[10%] h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[130px]"
          style={{
            background: "radial-gradient(circle, oklch(0.82 0.12 80), transparent 65%)",
            animation: "aurora-4 26s ease-in-out infinite",
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue shadow-md shadow-aurora-violet/15">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Lumora
            </span>
          </div>
          <a
            href="https://github.com/jingyaoxu-creator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <main className="relative z-10">
        <section
          ref={heroRef}
          className="mx-auto max-w-3xl px-6 pb-28 pt-24 text-center sm:pt-32 md:pt-40"
        >
          {/* Pill badge */}
          <div data-hero-anim className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-4 py-1.5 text-[13px] text-muted-foreground backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-aurora-violet" />
              SEO &amp; AI Search Analysis
            </span>
          </div>

          {/* Headline */}
          <h1
            data-hero-anim
            className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-foreground"
          >
            Illuminate Your
            <br />
            <span
              className="aurora-text italic"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Web Presence
            </span>
          </h1>

          {/* Subtitle */}
          <p
            data-hero-anim
            className="mx-auto mb-12 max-w-lg text-[17px] leading-relaxed text-muted-foreground"
          >
            Deep SEO &amp; GEO analysis in seconds. See how your site performs
            in both traditional and AI-powered search engines.
          </p>

          {/* ─── URL Input ─── */}
          <div data-hero-anim className="mx-auto max-w-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAnalyze();
              }}
              className="group relative"
            >
              {/* Aurora glow on focus */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-aurora-violet/30 via-aurora-cyan/20 to-aurora-gold/30 opacity-0 blur-md transition-opacity duration-700 group-focus-within:opacity-100" />

              <div className="glass relative flex items-center gap-2 rounded-2xl p-2 transition-all group-focus-within:border-aurora-violet/20">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  <Globe className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter any URL to analyze..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-[15px] shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="h-10 rounded-xl bg-foreground px-5 text-[13px] font-medium text-background shadow-none transition-all hover:bg-foreground/85 disabled:opacity-30"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Quick examples */}
            <div
              data-hero-anim
              className="mt-5 flex flex-wrap items-center justify-center gap-2"
            >
              <span className="text-xs text-muted-foreground/50">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setUrl(ex)}
                  className="rounded-lg border border-border/60 bg-white/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-aurora-violet/30 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section
          ref={featuresRef}
          className="mx-auto max-w-5xl px-6 pb-28"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: FileSearch,
                title: "14 SEO Checks",
                desc: "Title, meta, headings, structured data, Open Graph — every signal that matters for ranking.",
                gradient: "from-aurora-violet to-aurora-blue",
              },
              {
                icon: Bot,
                title: "8 GEO Checks",
                desc: "Content structure, FAQ readiness, entity coverage, E-E-A-T — optimized for AI search.",
                gradient: "from-aurora-blue to-aurora-cyan",
              },
              {
                icon: Brain,
                title: "AI Fix Plans",
                desc: "Claude-powered suggestions with priority levels and ready-to-paste code snippets.",
                gradient: "from-aurora-cyan to-aurora-teal",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                data-feature-card
                className="glass group rounded-2xl p-6 transition-all duration-300"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-sm`}
                >
                  <feature.icon className="h-[18px] w-[18px] text-white" />
                </div>
                <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section ref={stepsRef} className="mx-auto max-w-3xl px-6 pb-36">
          <div data-steps-heading className="mb-14 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="text-[15px] text-muted-foreground">
              Three steps to a fully optimized web presence.
            </p>
          </div>

          <div className="relative grid gap-12 sm:grid-cols-3 sm:gap-8">
            {/* Connector line */}
            <div className="absolute top-6 left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-aurora-violet/25 via-aurora-blue/25 to-aurora-cyan/25 sm:block" />

            {[
              {
                step: "01",
                icon: Search,
                title: "Enter URL",
                desc: "Paste any website URL and hit analyze.",
                gradient: "from-aurora-violet to-aurora-blue",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "We Analyze",
                desc: "22 checks across SEO and AI search readiness.",
                gradient: "from-aurora-blue to-aurora-cyan",
              },
              {
                step: "03",
                icon: Zap,
                title: "Get Your Plan",
                desc: "AI-generated fix suggestions with code snippets.",
                gradient: "from-aurora-cyan to-aurora-teal",
              },
            ].map((step) => (
              <div
                key={step.step}
                data-step
                className="relative flex flex-col items-center text-center"
              >
                <div
                  className={`relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-md`}
                >
                  <step.icon className="h-5 w-5 text-white" />
                </div>
                <span className="mb-1.5 font-mono text-[11px] tracking-[0.2em] text-muted-foreground/50">
                  {step.step}
                </span>
                <h3 className="mb-1.5 text-[15px] font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Built with Next.js &amp; Claude AI
          </div>
          <span className="text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Lumora
          </span>
        </div>
      </footer>
    </div>
  );
}
