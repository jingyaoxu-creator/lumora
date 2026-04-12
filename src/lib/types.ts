export type CheckStatus = "pass" | "warning" | "fail";

export interface CheckResult {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  score: number; // 0-100
  details: string;
  suggestion?: string;
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
