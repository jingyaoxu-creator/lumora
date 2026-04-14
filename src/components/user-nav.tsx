"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, CreditCard, History, Settings, Eye, Activity, HelpCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n/use-translation";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function UserNav() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <button
          onClick={() => router.push("/auth/login")}
          className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </button>
        <Button
          onClick={() => router.push("/auth/signup")}
          className="h-9 rounded-full bg-foreground px-5 text-sm font-medium text-white shadow-none transition-colors hover:bg-foreground/85"
        >
          Get Started
        </Button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative flex items-center gap-2">
      <LanguageSwitcher />
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet to-aurora-blue text-xs font-semibold text-white transition-shadow hover:shadow-md hover:shadow-aurora-violet/20"
      >
        {initials}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg">
            <div className="border-b border-border/50 px-4 py-3">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  router.push("/dashboard");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <History className="h-4 w-4" />
                Scan History
              </button>
              <button
                onClick={() => {
                  router.push("/monitors");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
                Site Monitoring
              </button>
              <button
                onClick={() => {
                  router.push("/citation-tracking");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Activity className="h-4 w-4" />
                Citation Tracking
              </button>
              <button
                onClick={() => {
                  router.push("/settings");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Report Branding
              </button>
              <button
                onClick={() => {
                  router.push("/pricing");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <CreditCard className="h-4 w-4" />
                Pricing & Plans
              </button>
              <button
                onClick={() => {
                  router.push("/faq");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
                FAQ
              </button>
              <button
                onClick={() => {
                  router.push("/feedback");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <MessageSquare className="h-4 w-4" />
                {t("nav.featureRequests")}
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
