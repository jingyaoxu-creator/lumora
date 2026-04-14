"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TerminalLine {
  text: string;
  type: "command" | "output" | "success" | "warning" | "info" | "header" | "error";
  delay: number;
}

const TERMINAL_SCRIPT: TerminalLine[] = [
  { text: "$ lumora audit --url target --depth full", type: "command", delay: 0 },
  { text: "", type: "output", delay: 300 },
  { text: "  Lumora Site Audit Engine v2.0", type: "header", delay: 400 },
  { text: "  ══════════════════════════════", type: "header", delay: 500 },
  { text: "", type: "output", delay: 600 },
  { text: "→ Fetching page HTML...", type: "info", delay: 800 },
  { text: "  HTTP 200 OK  •  Content-Type: text/html  •  charset=utf-8", type: "output", delay: 1400 },
  { text: "  Transfer: 47.2 KB (gzip)  •  Response: 312ms", type: "output", delay: 1800 },
  { text: "✓ Page fetched successfully", type: "success", delay: 2100 },
  { text: "", type: "output", delay: 2200 },
  { text: "→ Running SEO audit (55 checks across 8 categories)...", type: "info", delay: 2400 },
  { text: "", type: "output", delay: 2600 },
  { text: "  [Meta Tags]  title, description, viewport, charset, doctype...", type: "output", delay: 2800 },
  { text: "  ├─ Title Tag: found (52 chars)", type: "output", delay: 3100 },
  { text: "  ├─ Meta Description: found (148 chars)", type: "output", delay: 3300 },
  { text: "  └─ 10/10 meta tag checks complete", type: "success", delay: 3600 },
  { text: "", type: "output", delay: 3700 },
  { text: "  [Headings]  H1 presence, hierarchy, duplicates, diversity...", type: "output", delay: 3900 },
  { text: "  └─ 5/5 heading checks complete", type: "success", delay: 4300 },
  { text: "", type: "output", delay: 4400 },
  { text: "  [Content]  word count, text-to-html ratio, images, alt text...", type: "output", delay: 4600 },
  { text: "  ├─ Word Count: analyzing body text...", type: "output", delay: 4900 },
  { text: "  ├─ Images: scanning alt attributes, dimensions, lazy load...", type: "output", delay: 5200 },
  { text: "  └─ 9/9 content checks complete", type: "success", delay: 5600 },
  { text: "", type: "output", delay: 5700 },
  { text: "  [Links]  internal, external, nofollow, anchors, URL quality...", type: "output", delay: 5900 },
  { text: "  ├─ Found 47 internal, 12 external links", type: "output", delay: 6200 },
  { text: "  └─ 11/11 link checks complete", type: "success", delay: 6500 },
  { text: "", type: "output", delay: 6600 },
  { text: "  [Technical]  canonical, hreflang, structured data, URL...", type: "output", delay: 6800 },
  { text: "  ├─ JSON-LD: parsing structured data blocks...", type: "output", delay: 7100 },
  { text: "  └─ 7/7 technical checks complete", type: "success", delay: 7400 },
  { text: "", type: "output", delay: 7500 },
  { text: "  [HTTPS & Security]  mixed content, HSTS, CSP, headers...", type: "output", delay: 7700 },
  { text: "  └─ 6/6 security checks complete", type: "success", delay: 8000 },
  { text: "", type: "output", delay: 8100 },
  { text: "  [Performance]  HTML size, compression, caching, blocking...", type: "output", delay: 8300 },
  { text: "  ├─ Compression: checking Content-Encoding header...", type: "output", delay: 8500 },
  { text: "  └─ 6/6 performance checks complete", type: "success", delay: 8800 },
  { text: "", type: "output", delay: 8900 },
  { text: "  [Social]  Open Graph, Twitter Cards, favicon...", type: "output", delay: 9100 },
  { text: "  └─ 3/3 social checks complete", type: "success", delay: 9400 },
  { text: "", type: "output", delay: 9500 },
  { text: "✓ SEO audit complete — 55/55 checks", type: "success", delay: 9700 },
  { text: "", type: "output", delay: 9800 },
  { text: "→ Running GEO audit (15 checks across 4 categories)...", type: "info", delay: 10000 },
  { text: "", type: "output", delay: 10100 },
  { text: "  [Structure]  content depth, semantic HTML, table of contents...", type: "output", delay: 10300 },
  { text: "  [AI Readability]  FAQ, definitions, readability, organization...", type: "output", delay: 10700 },
  { text: "  [Authority]  entities, citations, E-E-A-T, freshness...", type: "output", delay: 11100 },
  { text: "  [AI Access]  bot restrictions, noai directives...", type: "output", delay: 11500 },
  { text: "", type: "output", delay: 11600 },
  { text: "✓ GEO audit complete — 15/15 checks", type: "success", delay: 11800 },
  { text: "", type: "output", delay: 11900 },
  { text: "→ Calculating weighted scores...", type: "info", delay: 12100 },
  { text: "  Severity weighting: errors ×3, warnings ×1, notices ×0", type: "output", delay: 12400 },
  { text: "  SEO weight: 55%  •  GEO weight: 45%", type: "output", delay: 12600 },
  { text: "✓ Scoring complete", type: "success", delay: 12800 },
  { text: "", type: "output", delay: 12900 },
  { text: "→ Requesting AI analysis from Claude...", type: "info", delay: 13100 },
  { text: "  Model: claude-haiku-4-5  •  Streaming response...", type: "output", delay: 13500 },
];

function getLineColor(type: TerminalLine["type"]) {
  switch (type) {
    case "command": return "text-white";
    case "success": return "text-emerald-400";
    case "warning": return "text-amber-400";
    case "error": return "text-red-400";
    case "info": return "text-sky-400";
    case "header": return "text-white/70";
    default: return "text-white/50";
  }
}

export function TerminalLoading({ url }: { url?: string }) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const script = TERMINAL_SCRIPT.map((line, i) => {
    if (i === 0 && url) {
      return { ...line, text: `$ lumora audit --url ${url} --depth full` };
    }
    return line;
  });

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    script.forEach((line, i) => {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => Math.max(prev, i + 1));
      }, line.delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const content = (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/60 bg-[oklch(0.13_0.005_280)] shadow-2xl shadow-black/10"
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-2 flex-1 text-center font-mono text-[11px] text-white/30">
            lumora — site audit
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          className="h-[440px] overflow-y-auto p-5 font-mono text-[12.5px] leading-[1.75]"
          style={{ scrollBehavior: "smooth" }}
        >
          {script.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              className={`whitespace-pre ${getLineColor(line.type)}`}
            >
              {line.text || "\u00A0"}
            </motion.div>
          ))}

          {visibleLines < script.length && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block h-4 w-[7px] translate-y-[2px] bg-aurora-violet/80"
            />
          )}

          {visibleLines >= script.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 flex items-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="h-3 w-3 rounded-full border-[1.5px] border-aurora-violet/30 border-t-aurora-violet"
              />
              <span className="text-sky-400">Waiting for AI response...</span>
            </motion.div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[10px] text-white/25">connected</span>
          </div>
          <span className="font-mono text-[10px] text-white/25">
            137 checks • 10 AI platforms • Professional audit
          </span>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-center text-xs text-muted-foreground/50"
      >
        Running comprehensive site audit across 137 checks...
      </motion.p>
    </>
  );

  return <div className="mx-auto max-w-3xl px-6 py-12">{content}</div>;
}
