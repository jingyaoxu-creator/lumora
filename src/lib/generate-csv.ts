import type { AnalysisResult, CheckResult } from "./types";

/**
 * Generate a CSV export from scan analysis.
 * Client-side only — triggers browser download.
 */
export function generateCSV(analysis: AnalysisResult): void {
  const rows: string[][] = [];

  // Header info
  rows.push(["Lumora SEO & GEO Analysis Report"]);
  rows.push(["URL", analysis.url]);
  rows.push(["Page Title", analysis.pageTitle]);
  rows.push(["Date", new Date(analysis.timestamp).toLocaleString()]);
  rows.push([]);

  // Scores
  rows.push(["Scores"]);
  rows.push(["Overall", String(analysis.overallScore)]);
  rows.push(["SEO", String(analysis.seoScore)]);
  rows.push(["GEO", String(analysis.geoScore)]);
  rows.push([]);

  // Stats
  rows.push(["Stats"]);
  rows.push(["Total Checks", String(analysis.stats.total)]);
  rows.push(["Passed", String(analysis.stats.passed)]);
  rows.push(["Errors", String(analysis.stats.errors)]);
  rows.push(["Warnings", String(analysis.stats.warnings)]);
  rows.push(["Notices", String(analysis.stats.notices)]);
  rows.push(["HTML Size (bytes)", String(analysis.stats.htmlSize)]);
  rows.push(["Response Time (ms)", String(analysis.stats.responseTimeMs)]);
  rows.push(["Word Count", String(analysis.stats.wordCount)]);
  rows.push([]);

  // SEO Checks
  rows.push(["SEO Checks"]);
  rows.push(["ID", "Name", "Category", "Status", "Severity", "Score", "Details", "Suggestion"]);
  for (const c of analysis.seoChecks) {
    rows.push(checkRow(c));
  }
  rows.push([]);

  // GEO Checks
  rows.push(["GEO Checks"]);
  rows.push(["ID", "Name", "Category", "Status", "Severity", "Score", "Details", "Suggestion"]);
  for (const c of analysis.geoChecks) {
    rows.push(checkRow(c));
  }

  // Platform Scores
  if (analysis.platformScores && analysis.platformScores.length > 0) {
    rows.push([]);
    rows.push(["Platform AI Readiness"]);
    rows.push(["Platform", "Score", "Crawler Access"]);
    for (const p of analysis.platformScores) {
      rows.push([p.name, String(p.score), p.crawlerAccess]);
    }

    rows.push([]);
    rows.push(["Platform Checks"]);
    rows.push(["Platform", "ID", "Name", "Category", "Status", "Severity", "Score", "Details", "Suggestion"]);
    for (const p of analysis.platformScores) {
      for (const c of p.checks) {
        rows.push([p.name, ...checkRow(c)]);
      }
    }
  }

  // Build CSV string
  const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");

  // Trigger download
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const domain = getDomain(analysis.url);
  a.href = url;
  a.download = `lumora-report-${domain}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function checkRow(c: CheckResult): string[] {
  return [
    c.id,
    c.name,
    c.category,
    c.status,
    c.severity,
    String(c.score),
    c.details,
    c.suggestion ?? "",
  ];
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "report";
  }
}
