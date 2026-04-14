import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult, AIResponse } from "@/lib/types";
import { checkFeatureAccess, denyResponse } from "@/lib/plan-limits";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const access = await checkFeatureAccess("suggestions");
    if (!access.allowed) return denyResponse(access, "AI 建议");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const analysis = body as AnalysisResult;

    if (!analysis.url || !analysis.seoChecks || !analysis.geoChecks) {
      return NextResponse.json(
        { error: "Invalid analysis data" },
        { status: 400 }
      );
    }

    const failingChecks = [
      ...analysis.seoChecks.filter((c) => c.status !== "pass"),
      ...analysis.geoChecks.filter((c) => c.status !== "pass"),
    ];

    if (failingChecks.length === 0) {
      const perfect: AIResponse = {
        summary:
          "Excellent! Your page passes all SEO and GEO checks. Continue maintaining these best practices.",
        suggestions: [],
      };
      return NextResponse.json(perfect);
    }

    // Sort by severity: errors first, then warnings, then notices
    const severityOrder = { error: 0, warning: 1, notice: 2 };
    failingChecks.sort((a, b) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
    );

    const checksText = failingChecks
      .map(
        (c) =>
          `- [${c.severity?.toUpperCase() ?? c.status.toUpperCase()}] ${c.name} (${c.category}, score: ${c.score}/100): ${c.details}${c.suggestion ? ` Hint: ${c.suggestion}` : ""}`
      )
      .join("\n");

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert SEO and GEO (Generative Engine Optimization) consultant, similar to Semrush's site audit advisor. Analyze these comprehensive audit results for ${analysis.url} and provide actionable fix suggestions.

Page: "${analysis.pageTitle}"
Overall Score: ${analysis.overallScore}/100 | SEO: ${analysis.seoScore}/100 | GEO: ${analysis.geoScore}/100
Stats: ${analysis.stats?.errors ?? 0} errors, ${analysis.stats?.warnings ?? 0} warnings, ${analysis.stats?.notices ?? 0} notices (${analysis.stats?.total ?? 0} total checks)

Issues found (sorted by severity):
${checksText}

Respond in this exact JSON format (no markdown, no code fences, just raw JSON):
{
  "summary": "2-3 sentence executive summary of the biggest issues and their impact",
  "suggestions": [
    {
      "priority": "critical|high|medium|low",
      "category": "seo|geo",
      "title": "Short action title",
      "description": "Detailed explanation of what to do and why",
      "code": "Optional HTML/meta tag code example if applicable"
    }
  ]
}

Rules:
- Maximum 8 suggestions, ordered by priority (critical first)
- Focus on the highest-impact changes
- Include specific code snippets where helpful (HTML meta tags, JSON-LD examples, etc.)
- Be concise but actionable
- For GEO issues, explain how the fix improves AI search visibility`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let aiResponse: AIResponse;
    try {
      aiResponse = JSON.parse(text);
    } catch {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        aiResponse = {
          summary: text.slice(0, 500),
          suggestions: [],
        };
      }
    }

    return NextResponse.json(aiResponse);
  } catch (err) {
    console.error("AI suggestion error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI suggestions." },
      { status: 500 }
    );
  }
}
