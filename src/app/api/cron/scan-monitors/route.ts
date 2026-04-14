import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { scanSite } from "@/lib/scan-site";
import { trackAIOverviews } from "@/lib/ai-overview-tracker";
import type { ScoreChange } from "@/lib/monitor-types";

export const maxDuration = 300; // 5 minutes

/**
 * Cron endpoint: scan all monitored sites due for a check.
 * Daily sites run every day, weekly sites run on Mondays.
 * Sends email alerts when scores drop beyond threshold.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;

  // Get sites due for scanning
  // Daily: all daily sites
  // Weekly: only on Monday
  let query = supabase.from("monitored_sites").select("*");

  if (isMonday) {
    // Scan both daily and weekly
    query = query.in("frequency", ["daily", "weekly"]);
  } else {
    // Only daily
    query = query.eq("frequency", "daily");
  }

  const { data: sites, error } = await query;
  if (error || !sites || sites.length === 0) {
    return NextResponse.json({
      message: "No sites to scan",
      count: 0,
    });
  }

  const alerts: ScoreChange[] = [];
  let scanned = 0;

  // Scan each site sequentially to avoid overwhelming the server
  for (const site of sites) {
    try {
      const result = await scanSite(site.url);

      const previousScore = site.last_score as number | null;
      const currentScore = result.overallScore;
      const change = previousScore !== null ? currentScore - previousScore : 0;

      // Update the monitored site record
      await supabase
        .from("monitored_sites")
        .update({
          last_score: currentScore,
          last_scanned_at: now.toISOString(),
        })
        .eq("id", site.id);

      // Also save to scan_history for the user
      await supabase.from("scan_history").insert({
        user_id: site.user_id,
        url: site.url,
        page_title: result.pageTitle,
        seo_score: result.seoScore,
        geo_score: result.geoScore,
        overall_score: result.overallScore,
        results: result,
      });

      scanned++;

      // Check for score drop alert
      if (
        site.notify_on_drop &&
        previousScore !== null &&
        change < 0 &&
        Math.abs(change) >= (site.drop_threshold ?? 5)
      ) {
        alerts.push({
          url: site.url,
          domain: site.domain,
          previousScore,
          currentScore,
          change,
          scannedAt: now.toISOString(),
        });

        // Fetch user email for notification
        const { data: userData } = await supabase.auth.admin.getUserById(
          site.user_id,
        );

        if (userData?.user?.email) {
          await sendAlertEmail(
            userData.user.email,
            site.domain,
            previousScore,
            currentScore,
            change,
          );
        }
      }
    } catch (err) {
      console.error(
        `[scan-monitors] Failed to scan ${site.url}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // ─── Citation tracking for sites with tracked_queries ───
  let citationChecks = 0;
  if (process.env.SERPER_API_KEY) {
    const { data: trackingSites } = await supabase
      .from("monitored_sites")
      .select("*")
      .not("tracked_queries", "eq", "{}");

    if (trackingSites && trackingSites.length > 0) {
      for (const site of trackingSites) {
        const queries = (site.tracked_queries as string[]) ?? [];
        if (queries.length === 0) continue;

        try {
          const result = await trackAIOverviews(site.domain, queries);

          for (const qr of result.queries) {
            await supabase.from("citation_tracking").insert({
              user_id: site.user_id,
              domain: site.domain,
              query: qr.query,
              has_ai_overview: qr.hasAIOverview,
              is_cited: qr.domainCited,
              position: qr.position,
              total_sources: qr.totalSources,
              organic_position: qr.topOrganicPosition,
              snippet: qr.snippet,
            });
          }
          citationChecks += queries.length;
        } catch (err) {
          console.error(
            `[citation-track] Failed for ${site.domain}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  }

  return NextResponse.json({
    message: `Scanned ${scanned}/${sites.length} sites, ${alerts.length} alerts, ${citationChecks} citation checks`,
    scanned,
    total: sites.length,
    alerts: alerts.length,
    citationChecks,
  });
}

/**
 * Send alert email when score drops.
 * Uses Resend if RESEND_API_KEY is set, otherwise logs.
 */
async function sendAlertEmail(
  email: string,
  domain: string,
  previousScore: number,
  currentScore: number,
  change: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[alert] Would email ${email}: ${domain} score dropped ${change} (${previousScore} → ${currentScore})`,
    );
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Lumora <alerts@lumora.dev>",
        to: email,
        subject: `Score Alert: ${domain} dropped ${Math.abs(change)} points`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7850DC, #4A60E8); padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">Lumora Score Alert</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 16px; color: #374151;">
                Your monitored site <strong>${domain}</strong> has experienced a score drop:
              </p>
              <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="text-align: center; padding: 12px 20px; background: #fef2f2; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${currentScore}</div>
                  <div style="font-size: 11px; color: #6b7280;">Current</div>
                </div>
                <div style="text-align: center; padding: 12px 20px; background: #f3f4f6; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #6b7280;">${previousScore}</div>
                  <div style="font-size: 11px; color: #6b7280;">Previous</div>
                </div>
                <div style="text-align: center; padding: 12px 20px; background: #fef2f2; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${change}</div>
                  <div style="font-size: 11px; color: #6b7280;">Change</div>
                </div>
              </div>
              <a href="https://lumora.dev/results?url=${encodeURIComponent("https://" + domain)}"
                 style="display: inline-block; background: #7850DC; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                View Full Report
              </a>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you enabled score alerts for ${domain} on Lumora.
              </p>
            </div>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error(`[alert] Failed to send email to ${email}:`, err);
  }
}
