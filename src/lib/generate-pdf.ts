import { jsPDF } from "jspdf";
import type { AnalysisResult, CheckResult } from "./types";
import type { BrandSettings } from "./brand-types";
import { DEFAULT_BRAND } from "./brand-types";

/**
 * Generate a professional PDF report from scan analysis.
 * Runs entirely client-side. Supports white-label branding.
 */
export function generateReport(
  analysis: AnalysisResult,
  brand?: BrandSettings | null,
): void {
  const b = brand ?? DEFAULT_BRAND;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors — use brand color for accent
  const violet = hexToRgb(b.brandColor) as readonly [number, number, number];
  const dark = [20, 20, 30] as const;
  const gray = [120, 120, 140] as const;
  const green = [34, 197, 94] as const;
  const amber = [245, 158, 11] as const;
  const red = [239, 68, 68] as const;

  function scoreRgb(score: number): readonly [number, number, number] {
    if (score >= 80) return green;
    if (score >= 50) return amber;
    return red;
  }

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
  }

  // ─── Header ───
  doc.setFillColor(...violet);
  doc.roundedRect(0, 0, pageWidth, 42, 0, 0, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  // If brand has a logo, add it; otherwise show brand name as text
  let headerTextX = margin;
  if (b.logoUrl) {
    try {
      doc.addImage(b.logoUrl, "PNG", margin, 6, 28, 28);
      headerTextX = margin + 32;
    } catch {
      // Logo failed to load — fall back to text
    }
  }
  doc.text(b.brandName, headerTextX, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SEO & GEO Analysis Report", headerTextX, 23);

  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date(analysis.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    headerTextX,
    30,
  );

  doc.setFontSize(8);
  const urlTruncated =
    analysis.url.length > 80
      ? analysis.url.substring(0, 77) + "..."
      : analysis.url;
  doc.text(urlTruncated, headerTextX, 37);

  y = 52;

  // ─── Page title ───
  doc.setTextColor(...dark);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleTruncated =
    analysis.pageTitle.length > 70
      ? analysis.pageTitle.substring(0, 67) + "..."
      : analysis.pageTitle;
  doc.text(titleTruncated, margin, y);
  y += 10;

  // ─── Score summary boxes ───
  const boxWidth = (contentWidth - 8) / 3;
  const boxes = [
    { label: "Overall", score: analysis.overallScore },
    { label: "SEO", score: analysis.seoScore },
    { label: "GEO", score: analysis.geoScore },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 4);

    // Box — simple black border, white fill
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxWidth, 22, 3, 3, "FD");

    // Score — black text
    doc.setTextColor(...dark);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(String(box.score), x + boxWidth / 2, y + 12, { align: "center" });

    // Label
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(box.label, x + boxWidth / 2, y + 19, { align: "center" });
  });

  y += 30;

  // ─── Stats bar ───
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");

  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const statsText = `${analysis.stats.total} checks · ${analysis.stats.passed} passed · ${analysis.stats.errors} errors · ${analysis.stats.warnings} warnings · ${analysis.stats.responseTimeMs}ms · ${analysis.stats.wordCount} words`;
  doc.text(statsText, margin + 4, y + 6.5);
  y += 16;

  // ─── SEO Checks section ───
  drawCheckSection(doc, "SEO Checks", analysis.seoChecks);

  // ─── GEO Checks section ───
  drawCheckSection(doc, "GEO Checks", analysis.geoChecks);

  // ─── Footer on all pages ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(
      `${b.brandName} Report — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  // Save
  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace("www.", "");
    } catch {
      return "report";
    }
  })();
  doc.save(`lumora-report-${domain}.pdf`);

  // ─── Inner helper ───
  function drawCheckSection(doc: jsPDF, title: string, checks: CheckResult[]) {
    checkPage(14);

    // Section header
    doc.setFillColor(...violet);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 4, y + 5.5);

    const passCount = checks.filter((c) => c.status === "pass").length;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${passCount}/${checks.length} passed`,
      pageWidth - margin - 4,
      y + 5.5,
      { align: "right" },
    );
    y += 12;

    // Group by category
    const categories = new Map<string, CheckResult[]>();
    for (const check of checks) {
      const arr = categories.get(check.category) ?? [];
      arr.push(check);
      categories.set(check.category, arr);
    }

    for (const [cat, catChecks] of categories) {
      checkPage(12);

      // Category subheader
      doc.setTextColor(...dark);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(cat, margin, y + 3);

      const catPassed = catChecks.filter((c) => c.status === "pass").length;
      doc.setTextColor(...gray);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`${catPassed}/${catChecks.length}`, margin + contentWidth, y + 3, {
        align: "right",
      });
      y += 6;

      // Draw each check
      for (const check of catChecks) {
        checkPage(10);

        // Status indicator
        const statusRgb: readonly [number, number, number] =
          check.status === "pass" ? green : check.status === "warning" ? amber : red;
        doc.setFillColor(...statusRgb);
        doc.circle(margin + 2, y + 2.5, 1.2, "F");

        // Check name
        doc.setTextColor(...dark);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(check.name, margin + 6, y + 3.5);

        // Score
        doc.setTextColor(...scoreRgb(check.score));
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(String(check.score), pageWidth - margin, y + 3.5, {
          align: "right",
        });

        y += 5;

        // Details (wrapped text)
        doc.setTextColor(...gray);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        const detailLines = doc.splitTextToSize(check.details, contentWidth - 8);
        const linesToShow = detailLines.slice(0, 2); // Max 2 lines
        for (const line of linesToShow) {
          checkPage(4);
          doc.text(line, margin + 6, y + 2.5);
          y += 3.5;
        }

        y += 2;
      }

      y += 3;
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [120, 80, 220]; // fallback violet
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
