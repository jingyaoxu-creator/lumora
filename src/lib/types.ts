import type { ScoredParagraph } from "./paragraph-scorer";

export type CheckStatus = "pass" | "warning" | "fail";
export type CheckSeverity = "error" | "warning" | "notice";

export interface CheckResult {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  severity: CheckSeverity;
  score: number; // 0-100
  details: string;
  suggestion?: string;
}

/** Context passed to all check functions */
export interface PageContext {
  $: import("cheerio").CheerioAPI;
  url: string;
  html: string;
  headers: Record<string, string>;
  responseTimeMs: number;
  statusCode: number;
}

/** Per-platform GEO readiness score */
export interface PlatformScore {
  key: string;
  name: string;
  icon: string;
  score: number; // 0-100
  crawlerAccess: "allowed" | "blocked" | "restricted" | "unknown";
  checks: CheckResult[];
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  pageTitle: string;
  metaDescription: string;
  seoScore: number;
  geoScore: number;
  overallScore: number;
  seoChecks: CheckResult[];
  geoChecks: CheckResult[];
  /** Per-platform AI readiness scores */
  platformScores?: PlatformScore[];
  /** Structured data validation */
  schemaValidation?: {
    schemas: { type: string; source: string; fields: Record<string, unknown> }[];
    issues: {
      type: string;
      severity: "error" | "warning" | "notice";
      field: string;
      message: string;
      fix?: string;
    }[];
    score: number;
  };
  /** Auto-generated llms.txt content */
  llmsTxt?: string;
  /** Per-paragraph citability scores */
  paragraphScores?: {
    avgScore: number;
    topParagraphs: ScoredParagraph[];
    weakParagraphs: ScoredParagraph[];
    total: number;
  };
  /** Summary stats */
  stats: {
    errors: number;
    warnings: number;
    notices: number;
    passed: number;
    total: number;
    htmlSize: number;
    responseTimeMs: number;
    wordCount: number;
  };
}

export interface AISuggestion {
  priority: "critical" | "high" | "medium" | "low";
  category: "seo" | "geo";
  title: string;
  description: string;
  code?: string;
}

export interface AIResponse {
  summary: string;
  suggestions: AISuggestion[];
}

