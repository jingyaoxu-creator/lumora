"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Check,
  Palette,
  Type,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import { createClient } from "@/lib/supabase/client";
import type { BrandSettings } from "@/lib/brand-types";
import { DEFAULT_BRAND } from "@/lib/brand-types";

export default function SettingsPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("free");
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, brand_settings")
        .eq("id", user.id)
        .single();

      if (profile) {
        setPlan(profile.plan ?? "free");
        if (profile.brand_settings) {
          setBrand({ ...DEFAULT_BRAND, ...(profile.brand_settings as Partial<BrandSettings>) });
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/brand-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512_000) {
      alert("Logo must be under 500KB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${user.id}.${ext}`;

      await supabase.storage.from("brand-assets").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      const { data: publicUrl } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(path);

      setBrand((prev) => ({ ...prev, logoUrl: publicUrl.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  const isPro = plan === "pro" || plan === "business";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
        <div
          className="absolute -top-[100px] -right-[100px] h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.2 285), transparent 65%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <UserNav />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Report Branding</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize PDF and CSV reports with your brand.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 space-y-6"
        >
          {/* Brand Name */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Brand Name</Label>
            </div>
            <Input
              value={brand.brandName}
              onChange={(e) =>
                setBrand((prev) => ({ ...prev, brandName: e.target.value }))
              }
              placeholder="Your Company Name"
              maxLength={50}
              className="rounded-xl"
              disabled={saving}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Replaces "Lumora" in the report header and footer.
            </p>
          </div>

          {/* Brand Color */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Brand Color</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brand.brandColor}
                onChange={(e) =>
                  setBrand((prev) => ({ ...prev, brandColor: e.target.value }))
                }
                className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                disabled={saving}
              />
              <Input
                value={brand.brandColor}
                onChange={(e) =>
                  setBrand((prev) => ({ ...prev, brandColor: e.target.value }))
                }
                placeholder="#7850DC"
                maxLength={7}
                className="w-32 rounded-xl font-mono text-sm"
                disabled={saving}
              />
              <div
                className="h-10 flex-1 rounded-xl"
                style={{ backgroundColor: brand.brandColor }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Used for the report header bar and accent elements.
            </p>
          </div>

          {/* Logo Upload */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Logo</Label>
            </div>
            <div className="flex items-center gap-4">
              {brand.logoUrl ? (
                <div className="relative h-16 w-16 rounded-xl border border-border bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logoUrl}
                    alt="Brand logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30">
                  <Upload className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {brand.logoUrl ? "Replace Logo" : "Upload Logo"}
                  </div>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, or SVG. Max 500KB. Shown in report header.
                </p>
              </div>
              {brand.logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setBrand((prev) => ({ ...prev, logoUrl: null }))
                  }
                  className="text-xs text-muted-foreground"
                  disabled={saving}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-aurora-violet px-6 hover:bg-aurora-violet/90 text-white"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
