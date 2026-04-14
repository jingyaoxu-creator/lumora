"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  Shield,
  Gauge,
  Brain,
  Eye,
  MessageSquareQuote,
  Swords,
  Network,
  TrendingUp,
  Radar,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

/* ─── FAQ Data ─── */

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  icon: typeof Gauge;
  items: FaqItem[];
}

/* ─── Fuzzy search helpers ─── */

/** Levenshtein distance between two strings */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Fuzzy match: returns true if every token in `query` fuzzy-matches
 * at least one word in `text`. Tolerates typos based on token length.
 */
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  // Quick exact substring check first
  if (textLower.includes(queryLower)) return true;
  // Tokenize
  const queryTokens = queryLower.split(/\s+/).filter(Boolean);
  const textWords = textLower.split(/[\s\-—/.,;:!?()]+/).filter(Boolean);
  return queryTokens.every((qt) => {
    // Exact substring match for this token
    if (textLower.includes(qt)) return true;
    // Max allowed edit distance: 1 for short tokens, 2 for longer
    const maxDist = qt.length <= 3 ? 1 : 2;
    return textWords.some((tw) => {
      // Prefix match (user typing partially)
      if (tw.startsWith(qt) || qt.startsWith(tw)) return true;
      // Edit distance on similar-length words
      if (Math.abs(tw.length - qt.length) > maxDist) return false;
      return editDistance(tw, qt) <= maxDist;
    });
  });
}

/* ─── Component ─── */

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const t = useTranslation();

  const FAQ_SECTIONS: FaqSection[] = [
    {
      title: t("faq.sCoreScan"),
      icon: Gauge,
      items: [
        { question: t("faq.cs1q"), answer: t("faq.cs1a") },
        { question: t("faq.cs2q"), answer: t("faq.cs2a") },
        { question: t("faq.cs3q"), answer: t("faq.cs3a") },
      ],
    },
    {
      title: t("faq.sAiSuggestions"),
      icon: Brain,
      items: [
        { question: t("faq.ai1q"), answer: t("faq.ai1a") },
        { question: t("faq.ai2q"), answer: t("faq.ai2a") },
      ],
    },
    {
      title: t("faq.sAiOverview"),
      icon: Eye,
      items: [
        { question: t("faq.ao1q"), answer: t("faq.ao1a") },
        { question: t("faq.ao2q"), answer: t("faq.ao2a") },
      ],
    },
    {
      title: t("faq.sCitationSim"),
      icon: MessageSquareQuote,
      items: [
        { question: t("faq.cit1q"), answer: t("faq.cit1a") },
        { question: t("faq.cit2q"), answer: t("faq.cit2a") },
      ],
    },
    {
      title: t("faq.sCompetitorCitation"),
      icon: Swords,
      items: [
        { question: t("faq.cc1q"), answer: t("faq.cc1a") },
        { question: t("faq.cc2q"), answer: t("faq.cc2a") },
      ],
    },
    {
      title: t("faq.sEntityGraph"),
      icon: Network,
      items: [
        { question: t("faq.eg1q"), answer: t("faq.eg1a") },
        { question: t("faq.eg2q"), answer: t("faq.eg2a") },
      ],
    },
    {
      title: t("faq.sCitationTracking"),
      icon: TrendingUp,
      items: [
        { question: t("faq.ct1q"), answer: t("faq.ct1a") },
        { question: t("faq.ct2q"), answer: t("faq.ct2a") },
      ],
    },
    {
      title: t("faq.sSiteMonitoring"),
      icon: Radar,
      items: [
        { question: t("faq.sm1q"), answer: t("faq.sm1a") },
        { question: t("faq.sm2q"), answer: t("faq.sm2a") },
      ],
    },
    {
      title: t("faq.sCrawlCompare"),
      icon: Globe,
      items: [
        { question: t("faq.mc1q"), answer: t("faq.mc1a") },
        { question: t("faq.mc2q"), answer: t("faq.mc2a") },
      ],
    },
    {
      title: t("faq.sOther"),
      icon: LayoutDashboard,
      items: [
        { question: t("faq.ot1q"), answer: t("faq.ot1a") },
        { question: t("faq.ot2q"), answer: t("faq.ot2a") },
      ],
    },
  ];

  const toggle = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !search ||
        fuzzyMatch(item.question, search) ||
        fuzzyMatch(item.answer, search),
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="relative min-h-screen bg-white">
      <SiteNav />

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("faq.title")}</h1>
          <p className="text-[15px] text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-10"
        >
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("faq.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-foreground/20"
          />
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {filtered.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.05 + 0.15 }}
            >
              {/* Section header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                  <section.icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>

              {/* Items */}
              <div className="glass overflow-hidden rounded-2xl">
                {section.items.map((item, ii) => {
                  const key = `${section.title}-${ii}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div
                      key={key}
                      className={ii < section.items.length - 1 ? "border-b border-border/40" : ""}
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-secondary/50"
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {t("faq.noResults")}
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
