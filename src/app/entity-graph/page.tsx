"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  User,
  Building2,
  MapPin,
  Package,
  Calendar,
  Link,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/user-nav";
import { LumoraLogo } from "@/components/lumora-logo";
import { ScoreRing } from "@/components/score-ring";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DetectedEntity {
  name: string;
  type: "person" | "organization" | "place" | "product" | "event" | "other";
  mentions: number;
  wikidataId: string | null;
  wikidataLabel: string | null;
  wikidataDescription: string | null;
  hasSameAs: boolean;
  sameAsUrls: string[];
}

interface EntityAnalysis {
  entities: DetectedEntity[];
  schemaEntities: number;
  totalEntities: number;
  knowledgeGraphCoverage: number;
  suggestions: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<
  DetectedEntity["type"],
  { label: string; color: string; bg: string; border: string; icon: typeof User }
> = {
  person: {
    label: "Person",
    color: "text-foreground",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: User,
  },
  organization: {
    label: "Organization",
    color: "text-foreground",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Building2,
  },
  place: {
    label: "Place",
    color: "text-foreground",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: MapPin,
  },
  product: {
    label: "Product",
    color: "text-foreground",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Package,
  },
  event: {
    label: "Event",
    color: "text-foreground",
    bg: "bg-pink-50",
    border: "border-pink-200",
    icon: Calendar,
  },
  other: {
    label: "Other",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: Link,
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function EntityGraphPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EntityAnalysis | null>(null);

  async function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/entity-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Entity detection failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <div
          className="absolute -bottom-[80px] -left-[80px] h-[400px] w-[400px] rounded-full opacity-[0.08] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.18 290), transparent 65%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <LumoraLogo height={28} />
          </a>
          <UserNav />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Link className="h-6 w-6 text-foreground" />
              Entity Knowledge Graph
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Detect named entities and verify knowledge graph connections.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl"
          >
            Back
          </Button>
        </div>

        {/* Input form */}
        <motion.form
          onSubmit={handleDetect}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-2xl p-6"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">
              Page URL
            </label>
            <p className="mb-1.5 text-xs text-muted-foreground">
              Enter a URL to detect named entities and check knowledge graph
              linking.
            </p>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              className="rounded-xl"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-xl bg-aurora-violet px-6 text-white hover:bg-aurora-violet/90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {loading ? "Detecting..." : "Detect Entities"}
          </Button>

          {loading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fetching page and analyzing entities — this may take a moment...
            </p>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </motion.form>

        {/* Results */}
        {result && <EntityResults data={result} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results                                                           */
/* ------------------------------------------------------------------ */

function EntityResults({ data }: { data: EntityAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
          <Link className="h-4 w-4 text-foreground" />
          Overview
        </h3>

        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
          {/* KG Coverage ring */}
          <ScoreRing
            score={data.knowledgeGraphCoverage}
            label="KG Coverage"
            size={140}
            color={
              data.knowledgeGraphCoverage >= 70
                ? "#22c55e"
                : data.knowledgeGraphCoverage >= 40
                  ? "#f59e0b"
                  : "#ef4444"
            }
          />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {data.totalEntities}
              </p>
              <p className="text-xs text-muted-foreground">Total Entities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {data.schemaEntities}
              </p>
              <p className="text-xs text-muted-foreground">Schema Entities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {data.entities.filter((e) => e.wikidataId).length}
              </p>
              <p className="text-xs text-muted-foreground">In Wikidata</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {data.entities.filter((e) => e.hasSameAs).length}
              </p>
              <p className="text-xs text-muted-foreground">With sameAs</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Entity cards */}
      {data.entities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4 text-foreground" />
            Detected Entities
            <Badge
              variant="outline"
              className="ml-auto text-[10px] text-muted-foreground"
            >
              {data.entities.length} found
            </Badge>
          </h3>

          <div className="space-y-3">
            {data.entities.map((entity, i) => (
              <EntityCard key={i} entity={entity} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-aurora-violet/20 bg-aurora-violet/5 p-6"
        >
          {/* Decorative glow */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style={{ background: "#7850DC" }}
          />

          <h3 className="relative mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="h-4 w-4" />
            Suggestions to Improve Entity Linking
          </h3>

          <ul className="relative space-y-3">
            {data.suggestions.map((suggestion, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-start gap-3 rounded-xl border border-aurora-violet/10 bg-background/60 p-3 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aurora-violet/10 text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground/85">{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entity Card                                                       */
/* ------------------------------------------------------------------ */

function EntityCard({
  entity,
  index,
}: {
  entity: DetectedEntity;
  index: number;
}) {
  const config = TYPE_CONFIG[entity.type];
  const Icon = config.icon;

  // Determine sameAs status
  const wikidataFound = !!entity.wikidataId;
  const hasSameAs = entity.hasSameAs;
  const sameAsWarning = wikidataFound && !hasSameAs;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.05 }}
      className="rounded-xl border border-border/60 bg-background/50 p-4"
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg} ${config.color}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Name and type badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{entity.name}</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${config.border} ${config.bg} ${config.color}`}
            >
              {config.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              {entity.mentions} mention{entity.mentions !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Wikidata status */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Wikidata ID */}
            <div className="flex items-center gap-1.5 text-xs">
              {wikidataFound ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-muted-foreground">Wikidata:</span>
                  <a
                    href={`https://www.wikidata.org/wiki/${entity.wikidataId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline"
                  >
                    {entity.wikidataId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Not in Wikidata
                  </span>
                </>
              )}
            </div>

            {/* sameAs status */}
            <div className="flex items-center gap-1.5 text-xs">
              {hasSameAs ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-muted-foreground">sameAs linked</span>
                </>
              ) : sameAsWarning ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-foreground">No sameAs attribute</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">No sameAs</span>
                </>
              )}
            </div>
          </div>

          {/* Wikidata description */}
          {entity.wikidataDescription && (
            <p className="mt-1.5 text-xs italic text-muted-foreground/80">
              {entity.wikidataDescription}
            </p>
          )}

          {/* sameAs URLs */}
          {entity.sameAsUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entity.sameAsUrls.map((sameAsUrl, i) => (
                <a
                  key={i}
                  href={sameAsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 rounded-md border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-foreground hover:underline"
                >
                  {sameAsUrl.length > 40
                    ? sameAsUrl.slice(0, 37) + "..."
                    : sameAsUrl}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
