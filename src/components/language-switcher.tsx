"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage, type Locale } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "EN" },
  { value: "zh", label: "中文", flag: "中" },
  { value: "ja", label: "日本語", flag: "JP" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const current = LOCALES.find((l) => l.value === locale);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe className="h-3.5 w-3.5" />
        {current?.flag}
      </button>

      {/* Dropdown — always rendered, animated via CSS, centered */}
      <div
        className="dropdown-small absolute left-1/2 top-full z-50 mt-1.5 w-36 -translate-x-1/2 overflow-hidden rounded-xl border border-border/60 bg-white shadow-lg"
        data-state={open ? "open" : "closed"}
      >
        <div className="p-1">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => {
                setLocale(l.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                locale === l.value
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span className="text-xs font-semibold w-5 text-center">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
