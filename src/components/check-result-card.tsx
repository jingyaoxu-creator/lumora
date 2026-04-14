"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Info,
  Lightbulb,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pass: {
    icon: CheckCircle2,
    color: "text-foreground",
    bg: "bg-emerald-50",
    badge: "bg-emerald-50 text-foreground border-emerald-200",
    label: "Pass",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-foreground",
    bg: "bg-amber-50",
    badge: "bg-amber-50 text-foreground border-amber-200",
    label: "Warning",
  },
  fail: {
    icon: XCircle,
    color: "text-foreground",
    bg: "bg-red-50",
    badge: "bg-red-50 text-foreground border-red-200",
    label: "Fail",
  },
};

const severityConfig = {
  error: { label: "Error", className: "bg-red-600 text-white border-red-600" },
  warning: { label: "Warning", className: "bg-amber-500 text-white border-amber-500" },
  notice: { label: "Notice", className: "bg-blue-100 text-foreground border-blue-200" },
};

/* ─── Impact & context for failed/warning checks ─── */

const IMPACT_MAP: Record<string, string> = {
  "Meta Tags": "Meta tags directly control how your page appears in search results. Missing or poorly optimized meta tags can reduce click-through rates by 20-30% and hurt your ranking potential.",
  "Headings": "Heading structure helps search engines understand your content hierarchy. Poor heading organization makes it harder for both users and AI crawlers to extract key information.",
  "Content": "Content quality signals (word count, text ratio, image optimization) are core ranking factors. Thin or poorly structured content is less likely to be cited by AI systems.",
  "Links": "Internal and external links establish topical authority and help search engines discover your content. Broken or missing links waste crawl budget and hurt user experience.",
  "Technical": "Technical SEO issues (canonical tags, structured data, URL structure) affect how search engines index and interpret your pages. These can cause duplicate content or missed indexing.",
  "HTTPS & Security": "Security headers and HTTPS are ranking signals. Missing security measures can trigger browser warnings and erode user trust, directly impacting conversion rates.",
  "Performance": "Page speed is a confirmed ranking factor. Slow pages have higher bounce rates and are less likely to be included in AI-generated answers.",
  "Social": "Open Graph and Twitter Card tags control how your content appears when shared on social media. Missing tags mean platforms auto-generate previews that may misrepresent your content.",
  "Structure": "Well-structured content with semantic HTML, clear hierarchy, and table of contents makes it significantly easier for AI systems to parse and cite your information.",
  "AI Readability": "AI readability factors (FAQ patterns, definitions, conversational tone) directly influence whether AI systems like ChatGPT and Perplexity can extract and cite your content.",
  "Authority": "Authority signals (E-E-A-T, citations, entity coverage, freshness) determine whether AI systems trust your content enough to cite it as a source.",
  "AI Access": "AI access settings control whether AI crawlers can reach your content. Blocking AI bots means your content won't appear in AI-generated answers, losing a growing traffic source.",
  "AI Citation Readiness": "Citation readiness factors determine how likely AI systems are to quote your content directly. Well-structured, authoritative content gets cited more frequently.",
  "AI Snippet Optimization": "Snippet optimization helps AI systems extract concise, accurate answers from your page. Pages optimized for featured snippets also perform better in AI overviews.",
};

export function CheckResultCard({
  check,
  index,
}: {
  check: CheckResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[check.status];
  const severity = check.severity ? severityConfig[check.severity] : null;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 1) }}
      className={`glass group rounded-xl transition-all ${
        expanded ? "!border-border" : ""
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3.5 text-left sm:p-4"
      >
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${config.bg} sm:h-8 sm:w-8`}
        >
          <Icon className={`h-3.5 w-3.5 ${config.color} sm:h-4 sm:w-4`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-medium sm:text-sm">{check.name}</span>
            {severity && check.status !== "pass" && (
              <Badge
                variant="outline"
                className={`px-1.5 py-0 text-[9px] font-semibold ${severity.className}`}
              >
                {severity.label}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{check.category}</span>
        </div>
        {/* Mini score bar */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border/30">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  check.score >= 80
                    ? "#22c55e"
                    : check.score >= 50
                    ? "#f59e0b"
                    : "#ef4444",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${check.score}%` }}
              transition={{ duration: 0.6, delay: Math.min(index * 0.03 + 0.2, 1.2) }}
            />
          </div>
          <span className="w-7 text-right font-mono text-[11px] text-muted-foreground">
            {check.score}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border/50 px-4 pb-4 pt-3"
        >
          {/* Current status details */}
          <p className="text-[13px] leading-relaxed text-muted-foreground">{check.details}</p>

          {/* Why it matters — shown only for non-pass checks */}
          {check.status !== "pass" && IMPACT_MAP[check.category] && (
            <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200/50 bg-amber-50/50 p-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-[12px] font-medium text-foreground">Why this matters</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {IMPACT_MAP[check.category]}
                </p>
              </div>
            </div>
          )}

          {/* Severity impact — shown for errors and warnings */}
          {check.status !== "pass" && check.severity !== "notice" && (
            <div className="mt-2.5 flex gap-2.5 rounded-lg border border-red-200/50 bg-red-50/50 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <div>
                <p className="text-[12px] font-medium text-foreground">
                  Impact: {check.severity === "error" ? "High" : "Medium"} priority
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {check.severity === "error"
                    ? "This issue has a significant negative impact on your score. Fixing it should be a top priority — it directly affects how search engines and AI systems evaluate your page."
                    : "This issue moderately affects your score. While not critical, fixing it will improve your overall SEO and AI visibility."}
                </p>
              </div>
            </div>
          )}

          {/* Fix suggestion */}
          {check.suggestion && (
            <div className="mt-2.5 flex gap-2.5 rounded-lg border border-aurora-violet/20 bg-aurora-violet/5 p-3">
              <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple" />
              <div>
                <p className="text-[12px] font-medium text-foreground">How to fix</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/90">
                  {check.suggestion}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
