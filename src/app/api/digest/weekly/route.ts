import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isSilentMode } from "@/lib/services/silent-mode";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET handler for Vercel cron (Sunday 6 PM)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return generateWeeklyDigest();
}

// POST handler for manual triggers
export async function POST() {
  return generateWeeklyDigest();
}

async function generateWeeklyDigest() {
  try {
    const supabase = getAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Get all organizations with digest enabled
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, digest_email, digest_enabled");

    if (!orgs?.length) {
      return NextResponse.json({ success: true, message: "No organizations" });
    }

    const results: Array<{ orgId: string; sent: boolean }> = [];

    for (const org of orgs) {
      if ((org as any).digest_enabled === false) continue;

      // Silent mode: skip sending digest
      if (await isSilentMode(org.id)) {
        console.log(`[SILENT MODE] Suppressed weekly digest for org ${org.id}`);
        results.push({ orgId: org.id, sent: false });
        continue;
      }

      const orgId = org.id;
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const weekAgoStr = weekAgo.toISOString();
      const nextWeekStr = nextWeek.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // ---- THIS WEEK STATS ----

      // Jobs completed this week
      const { data: completedJobs } = await supabase
        .from("jobs")
        .select("id, job_number, property_address, title")
        .eq("organization_id", orgId)
        .in("status", ["completed", "invoiced", "paid"])
        .gte("updated_at", weekAgoStr);

      // Revenue collected (payments received this week)
      const { data: payments } = await supabase
        .from("finance_transactions")
        .select("amount")
        .eq("organization_id", orgId)
        .eq("status", "CONFIRMED")
        .gt("amount", 0)
        .gte("created_at", weekAgoStr);

      const revenueCollected = (payments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      // Outstanding invoices
      const { data: outstandingInvoices } = await (supabase.from as any)(
        "job_invoices",
      )
        .select("total")
        .eq("organization_id", orgId)
        .eq("status", "sent");

      const outstandingTotal = (outstandingInvoices || []).reduce(
        (sum: number, i: any) => sum + Number(i.total),
        0,
      );

      // Receipts captured this week
      const { count: receiptsCaptured } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("created_at", weekAgoStr);

      // Receipts needing review
      const { count: receiptsNeedReview } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("status", ["pending_review", "needs_review", "auto_matched"]);

      // New jobs created this week
      const { count: newJobsCount } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("created_at", weekAgoStr);

      // ---- NEXT WEEK ----

      // Upcoming scheduled jobs
      const { data: upcomingJobs } = await supabase
        .from("jobs")
        .select("id, job_number, property_address, start_date, title")
        .eq("organization_id", orgId)
        .eq("status", "scheduled")
        .gte("start_date", todayStr)
        .lte("start_date", nextWeekStr)
        .order("start_date");

      // Turnovers due next week
      const { data: upcomingTurnovers } = await (supabase.from as any)(
        "turnovers",
      )
        .select("id, move_in_date, unit_id, units(unit_number, buildings(name, properties(name)))")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gte("move_in_date", todayStr)
        .lte("move_in_date", nextWeekStr);

      // Sub payouts pending
      const { data: pendingPayouts } = await (supabase.from as any)(
        "sub_payouts",
      )
        .select("amount")
        .eq("organization_id", orgId)
        .eq("status", "pending_payout");

      const pendingPayoutTotal = (pendingPayouts || []).reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0,
      );

      // Pending reminder drafts
      const { count: pendingReminders } = await (supabase.from as any)(
        "payment_reminder_drafts",
      )
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "draft");

      // ---- BUILD EMAIL ----
      const weekRange = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

      const completedList = (completedJobs || [])
        .slice(0, 10)
        .map(
          (j) =>
            `<li>${(j as any).job_number || ""} — ${j.property_address || j.title}</li>`,
        )
        .join("");

      const upcomingList = (upcomingJobs || [])
        .map(
          (j) =>
            `<li>${j.start_date ? new Date(j.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "TBD"} — ${(j as any).job_number || ""} ${j.property_address || j.title}</li>`,
        )
        .join("");

      const turnoverList = (upcomingTurnovers || [])
        .map((t: any) => {
          const unitInfo = t.units
            ? `Unit ${t.units.unit_number} at ${t.units.buildings?.properties?.name || "property"}`
            : "Unit";
          return `<li>${unitInfo} — move-in ${new Date(t.move_in_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</li>`;
        })
        .join("");

      // Action needed items
      const actionItems: string[] = [];
      if (receiptsNeedReview && receiptsNeedReview > 0)
        actionItems.push(
          `<li><a href="${appUrl}/ops/receipts/review" style="color:#ff6b00;">${receiptsNeedReview} receipt${receiptsNeedReview > 1 ? "s" : ""} to review</a></li>`,
        );
      if (pendingReminders && pendingReminders > 0)
        actionItems.push(
          `<li><a href="${appUrl}/ops/finance/reminders" style="color:#ff6b00;">${pendingReminders} payment reminder${pendingReminders > 1 ? "s" : ""} to send</a></li>`,
        );
      if (pendingPayouts?.length)
        actionItems.push(
          `<li><a href="${appUrl}/ops/finance" style="color:#ff6b00;">${pendingPayouts.length} sub payout${pendingPayouts.length > 1 ? "s" : ""} pending ($${pendingPayoutTotal.toLocaleString()})</a></li>`,
        );

      const html = `
        <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
          <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
            <h1 style="margin:0;color:#ff6b00;font-size:24px;">Your Week in Review</h1>
            <p style="margin:4px 0 0;opacity:0.6;">${weekRange}</p>
          </div>

          <!-- This Week -->
          <div style="margin-bottom:24px;">
            <h2 style="color:#ff6b00;font-size:18px;margin:0 0 12px;">This Week</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="background:rgba(255,107,0,0.1);padding:16px;border-radius:8px;">
                <div style="font-size:28px;font-weight:bold;color:#ff6b00;">${completedJobs?.length || 0}</div>
                <div style="opacity:0.6;font-size:13px;">Jobs Completed</div>
              </div>
              <div style="background:rgba(255,107,0,0.1);padding:16px;border-radius:8px;">
                <div style="font-size:28px;font-weight:bold;color:#22c55e;">$${revenueCollected.toLocaleString()}</div>
                <div style="opacity:0.6;font-size:13px;">Revenue Collected</div>
              </div>
              <div style="background:rgba(255,107,0,0.1);padding:16px;border-radius:8px;">
                <div style="font-size:28px;font-weight:bold;">${newJobsCount || 0}</div>
                <div style="opacity:0.6;font-size:13px;">New Jobs</div>
              </div>
              <div style="background:rgba(255,107,0,0.1);padding:16px;border-radius:8px;">
                <div style="font-size:28px;font-weight:bold;">${receiptsCaptured || 0}</div>
                <div style="opacity:0.6;font-size:13px;">Receipts Captured</div>
              </div>
            </div>
            ${completedList ? `<div style="margin-top:12px;"><strong>Completed:</strong><ul style="margin:4px 0;padding-left:20px;opacity:0.8;">${completedList}</ul></div>` : ""}
          </div>

          ${actionItems.length ? `
          <!-- Action Needed -->
          <div style="margin-bottom:24px;background:rgba(239,68,68,0.1);padding:16px;border-radius:8px;border-left:3px solid #ef4444;">
            <h2 style="color:#ef4444;font-size:18px;margin:0 0 8px;">Action Needed</h2>
            <ul style="margin:0;padding-left:20px;">${actionItems.join("")}</ul>
          </div>` : ""}

          <!-- Next Week -->
          <div style="margin-bottom:24px;">
            <h2 style="color:#ff6b00;font-size:18px;margin:0 0 12px;">Next Week</h2>
            ${upcomingList ? `<div><strong>Scheduled Jobs:</strong><ul style="margin:4px 0;padding-left:20px;opacity:0.8;">${upcomingList}</ul></div>` : "<p style='opacity:0.6;'>No jobs scheduled yet.</p>"}
            ${turnoverList ? `<div style="margin-top:8px;"><strong>Turnover Deadlines:</strong><ul style="margin:4px 0;padding-left:20px;opacity:0.8;">${turnoverList}</ul></div>` : ""}
          </div>

          <!-- Money -->
          <div style="margin-bottom:24px;">
            <h2 style="color:#ff6b00;font-size:18px;margin:0 0 12px;">Money</h2>
            <table style="width:100%;">
              <tr><td style="padding:4px 0;opacity:0.6;">Revenue this week</td><td style="text-align:right;font-weight:bold;color:#22c55e;">$${revenueCollected.toLocaleString()}</td></tr>
              <tr><td style="padding:4px 0;opacity:0.6;">Total outstanding</td><td style="text-align:right;font-weight:bold;color:#f59e0b;">$${outstandingTotal.toLocaleString()}</td></tr>
              <tr><td style="padding:4px 0;opacity:0.6;">Pending sub payouts</td><td style="text-align:right;font-weight:bold;color:#ef4444;">$${pendingPayoutTotal.toLocaleString()}</td></tr>
            </table>
          </div>

          <a href="${appUrl}/dashboard" style="display:inline-block;background:#ff6b00;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Open Dashboard
          </a>
          <p style="margin-top:24px;opacity:0.4;font-size:12px;">FHI Weekly Digest — <a href="${appUrl}/ops/settings" style="color:#666;">Manage preferences</a></p>
        </div>
      `;

      // Get recipient email
      let recipientEmail = (org as any).digest_email;
      if (!recipientEmail) {
        const { data: owner } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("organization_id", orgId)
          .limit(1)
          .single();
        recipientEmail = owner?.email;
      }

      if (recipientEmail && process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "FHI Digest <digest@fhi.ca>",
            to: recipientEmail,
            subject: `Your week in review — ${weekRange}`,
            html,
          });
          results.push({ orgId, sent: true });
        } catch (err) {
          console.error(`Failed to send digest for org ${orgId}:`, err);
          results.push({ orgId, sent: false });
        }
      } else {
        console.log(
          `[TEST MODE] Would send weekly digest to ${recipientEmail || "no email"}`,
        );
        results.push({ orgId, sent: false });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Weekly digest error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
