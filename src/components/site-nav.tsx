"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Search,
  Bot,
  Eye,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { LumoraLogo } from "@/components/lumora-logo";
import { UserNav } from "@/components/user-nav";
import { useTranslation } from "@/lib/i18n/use-translation";

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  plan?: "pro" | "business";
}

interface DropdownDef {
  key: string;
  labelKey: string;
  columns: { titleKey?: string; items: NavItem[] }[];
}

const DROPDOWNS: DropdownDef[] = [
  {
    key: "products",
    labelKey: "nav.products",
    columns: [
      {
        titleKey: "nav.dropdown.colAnalysis",
        items: [
          { href: "/analysis", icon: Search, labelKey: "nav.dropdown.scan", descKey: "nav.dropdown.scanDesc" },
        ],
      },
      {
        titleKey: "nav.dropdown.colAI",
        items: [
          { href: "/ai-search", icon: Bot, labelKey: "nav.dropdown.aiSearch", descKey: "nav.dropdown.aiSearchDesc", plan: "pro" },
        ],
      },
      {
        titleKey: "nav.dropdown.colMonitor",
        items: [
          { href: "/monitors", icon: Eye, labelKey: "nav.dropdown.monitors", descKey: "nav.dropdown.monitorsDesc", plan: "pro" },
        ],
      },
    ],
  },
  {
    key: "resources",
    labelKey: "nav.resources",
    columns: [
      {
        titleKey: "nav.dropdown.colResources",
        items: [
          { href: "/faq", icon: HelpCircle, labelKey: "nav.dropdown.faq", descKey: "nav.dropdown.faqDesc" },
          { href: "/feedback", icon: MessageSquare, labelKey: "nav.dropdown.feedback", descKey: "nav.dropdown.feedbackDesc" },
        ],
      },
    ],
  },
];

export function SiteNav() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // visibleKey keeps the content rendered during close animation
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const t = useTranslation();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When activeKey changes, update visibleKey
  useEffect(() => {
    if (activeKey) {
      // Opening or switching — show new content immediately
      setVisibleKey(activeKey);
    } else {
      // Closing — keep content visible during animation, then clear
      const timer = setTimeout(() => setVisibleKey(null), 280);
      return () => clearTimeout(timer);
    }
  }, [activeKey]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const open = useCallback((key: string) => {
    clearTimeout(closeTimer.current);
    setActiveKey(key);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveKey(null), 250);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setActiveKey(null);
  }, [router]);

  const isOpen = activeKey !== null;
  const activeIdx = DROPDOWNS.findIndex((d) => d.key === activeKey);
  const visibleIdx = DROPDOWNS.findIndex((d) => d.key === visibleKey);
  // Which panel set to show — use visibleKey during close animation
  const showIdx = visibleIdx !== -1 ? visibleIdx : activeIdx;

  return (
    <header ref={navRef} className="absolute inset-x-0 top-0 z-20">
      <div className="bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-7">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
              <LumoraLogo />
            </a>

            <div className="hidden items-center gap-0.5 lg:flex">
              {DROPDOWNS.map((dd) => (
                <button
                  key={dd.key}
                  onMouseEnter={() => open(dd.key)}
                  onMouseLeave={scheduleClose}
                  onClick={() => setActiveKey(activeKey === dd.key ? null : dd.key)}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${
                    activeKey === dd.key
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(dd.labelKey)}
                  <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${activeKey === dd.key ? "rotate-180" : ""}`} />
                </button>
              ))}

              <a
                href="/pricing"
                onMouseEnter={() => { clearTimeout(closeTimer.current); setActiveKey(null); }}
                className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.pricing")}
              </a>
            </div>
          </div>

          <UserNav />
        </nav>

        {/* ─── Drawer panel (always rendered, animated via CSS) ─── */}
        <div
          className="dropdown-drawer"
          data-state={isOpen ? "open" : "closed"}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="dropdown-drawer-inner">
            <div className="border-t border-border/40">
              <div className="mx-auto max-w-6xl overflow-hidden px-6">
                {/* Horizontal track — slides as one unit, no overlap */}
                <div
                  className="flex"
                  style={{
                    transform: `translateX(-${Math.max(0, showIdx) * 100}%)`,
                    transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    willChange: "transform",
                  }}
                >
                  {DROPDOWNS.map((dd, di) => (
                    <div
                      key={dd.key}
                      className="w-full flex-shrink-0 py-6"
                      style={{
                        opacity: di === Math.max(0, showIdx) ? 1 : 0,
                        transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                        willChange: "opacity",
                      }}
                    >
                      <div className={`grid gap-8 ${
                        dd.columns.length >= 3
                          ? "sm:grid-cols-3"
                          : dd.columns.length === 2
                            ? "sm:grid-cols-2"
                            : "sm:grid-cols-1 max-w-md"
                      }`}>
                        {dd.columns.map((col, ci) => (
                          <div key={ci}>
                            {col.titleKey && (
                              <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                                {t(col.titleKey)}
                              </div>
                            )}
                            <div className="space-y-0.5">
                              {col.items.map((item) => (
                                <button
                                  key={item.href}
                                  onClick={() => navigate(item.href)}
                                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-secondary"
                                >
                                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04]">
                                    <item.icon className="h-[16px] w-[16px] text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                                      {t(item.labelKey)}
                                      {item.plan && (
                                        <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-foreground/50">
                                          {item.plan === "business" ? "BIZ" : "PRO"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{t(item.descKey)}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 -z-10 transition-colors duration-400 ${
          isOpen ? "bg-black/5" : "bg-transparent pointer-events-none"
        }`}
        onClick={() => setActiveKey(null)}
      />
    </header>
  );
}
