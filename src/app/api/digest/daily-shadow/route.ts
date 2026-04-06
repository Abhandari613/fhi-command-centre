import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET handler for Vercel cron (daily 11 PM ET)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return generateDailyShadowDigest();
}

// POST handler for manual triggers
export async function POST() {
  return generateDailyShadowDigest();
}

// ─── Helpers ───────────────────────────────────────────────

function classificationBadge(classification: string): string {
  const colors: Record<string, string> = {
    new_work: "#22c55e",
    quote_request: "#3b82f6",
    job_update: "#f59e0b",
    payment_ready: "#a855f7",
    irrelevant: "#6b7280",
  };
  const color = colors[classification] || "#6b7280";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}20;color:${color};border:1px solid ${color}40;">${classification.replace("_", " ")}</span>`;
}

function emailTypeBadge(emailType: string): string {
  const colors: Record<string, string> = {
    quote: "#3b82f6",
    dispatch: "#8b5cf6",
    completion_report: "#22c55e",
    weekly_digest: "#f59e0b",
    payment_reminder: "#ef4444",
    status_transition: "#06b6d4",
  };
  const color = colors[emailType] || "#6b7280";
  const label = emailType.replace(/_/g, " ");
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}20;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function statCard(value: string | number, label: string, color = "#ff6b00"): string {
  return `
    <div style="background:rgba(255,107,0,0.08);padding:14px;border-radius:8px;text-align:center;">
      <div style="font-size:24px;font-weight:bold;color:${color};">${value}</div>
      <div style="opacity:0.6;font-size:12px;margin-top:2px;">${label}</div>
    </div>`;
}

// ─── Main ──────────────────────────────────────────────────

async function generateDailyShadowDigest() {
  try {
    const supabase = getAdminClient();
    const recipient =
      process.env.SHADOW_DIGEST_RECIPIENT || "atul@613physio.com";

    // Time window: last 24 hours
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const sinceStr = since.toISOString();

    // Get organization (single-tenant)
    const { data: tokenRow } = await supabase
      .from("gcal_tokens")
      .select("organization_id")
      .limit(1)
      .single();

    const organizationId = tokenRow?.organization_id;
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: "No organization found",
      });
    }

    // ================================================================
    // SECTION 1: Daily Activity Summary
    // ================================================================

    // Recent email threads (new + updated)
    const { data: threads } = await supabase
      .from("email_threads")
      .select(
        "id, gmail_thread_id, subject, snippet, last_message_date, participants, classification, job_id, message_count, has_attachments",
      )
      .eq("organization_id", organizationId)
      .gte("last_message_date", sinceStr)
      .order("last_message_date", { ascending: false });

    // Email scan log for classifications
    const { data: scanLogs } = await supabase
      .from("email_scan_log")
      .select(
        "id, gmail_message_id, from_address, subject, classification, job_id, processed_at",
      )
      .eq("organization_id", organizationId)
      .gte("processed_at", sinceStr)
      .order("processed_at", { ascending: false });

    // Classification breakdown
    const classBreakdown: Record<string, number> = {};
    for (const log of scanLogs || []) {
      classBreakdown[log.classification] =
        (classBreakdown[log.classification] || 0) + 1;
    }

    // ================================================================
    // SECTION 2: App Population Audit
    // ================================================================

    // New jobs created
    const { data: newJobs } = await supabase
      .from("jobs")
      .select(
        "id, job_number, title, property_address, status, urgency, source_email_subject, created_at",
      )
      .eq("organization_id", organizationId)
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: false });

    // Work order drafts created
    const { data: drafts } = await supabase
      .from("work_order_drafts")
      .select(
        "id, client_name, property_address_or_unit, status, extraction_confidence, auto_converted, source, created_at",
      )
      .eq("organization_id", organizationId)
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: false });

    // Notifications generated
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, type, title, body, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: false });

    // Notification type breakdown
    const notifBreakdown: Record<string, number> = {};
    for (const n of notifications || []) {
      notifBreakdown[n.type] = (notifBreakdown[n.type] || 0) + 1;
    }

    // Draft stats
    const autoConverted = (drafts || []).filter(
      (d: any) => d.auto_converted,
    ).length;
    const pendingReview = (drafts || []).filter(
      (d: any) => d.status === "needs_review" || d.status === "pending",
    ).length;

    // ================================================================
    // SECTION 3: Proposed Outbound Communications
    // ================================================================

    const { data: shadowLogs } = await supabase
      .from("shadow_outbound_log")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("suppressed_at", sinceStr)
      .order("suppressed_at", { ascending: false });

    // Shadow log type breakdown
    const shadowBreakdown: Record<string, number> = {};
    for (const s of shadowLogs || []) {
      shadowBreakdown[s.email_type] =
        (shadowBreakdown[s.email_type] || 0) + 1;
    }

    // ================================================================
    // BUILD HTML
    // ================================================================

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Section 1: Activity Summary rows
    const activityRows = (scanLogs || [])
      .map(
        (log) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ccc;">${new Date(log.processed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#eee;">${log.from_address}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#eee;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${log.subject}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;">${classificationBadge(log.classification)}</td>
        </tr>`,
      )
      .join("");

    const classBreakdownHtml = Object.entries(classBreakdown)
      .map(
        ([cls, count]) =>
          `${classificationBadge(cls)} <span style="color:#aaa;font-size:13px;">&times;${count}</span>`,
      )
      .join("&nbsp;&nbsp;");

    // Section 2: Jobs rows
    const jobRows = (newJobs || [])
      .map(
        (j: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ff6b00;font-weight:600;">${j.job_number || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#eee;">${j.property_address || j.title || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ccc;">${j.status}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ccc;">${j.urgency || "standard"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:12px;color:#888;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${j.source_email_subject || "manual"}</td>
        </tr>`,
      )
      .join("");

    const draftRows = (drafts || [])
      .map(
        (d: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#eee;">${d.client_name || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#eee;">${d.property_address_or_unit || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ccc;">${d.status}${d.auto_converted ? ' <span style="color:#22c55e;font-size:11px;">(auto)</span>' : ""}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px;color:#ccc;">${d.extraction_confidence != null ? `${d.extraction_confidence}%` : "—"}</td>
        </tr>`,
      )
      .join("");

    const notifSummary = Object.entries(notifBreakdown)
      .map(
        ([type, count]) =>
          `<span style="color:#aaa;font-size:13px;">${type.replace(/_/g, " ")}: <strong style="color:#eee;">${count}</strong></span>`,
      )
      .join("&nbsp;&nbsp;|&nbsp;&nbsp;");

    // Section 3: Shadow outbound rows
    const shadowRows = (shadowLogs || [])
      .map((s: any) => {
        const preview = s.body_html
          ? stripHtml(s.body_html).slice(0, 400)
          : "<em style='color:#666;'>No body captured</em>";
        const attachList = (s.attachments_meta || [])
          .map((a: any) => a.filename)
          .join(", ");

        return `
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            ${emailTypeBadge(s.email_type)}
            <span style="color:#666;font-size:12px;">${new Date(s.suppressed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <div style="margin-bottom:6px;">
            <span style="color:#888;font-size:12px;">To:</span> <span style="color:#eee;font-size:13px;">${s.to_address}</span>
            ${s.cc_address ? `<br/><span style="color:#888;font-size:12px;">CC:</span> <span style="color:#eee;font-size:13px;">${s.cc_address}</span>` : ""}
          </div>
          <div style="margin-bottom:8px;">
            <span style="color:#888;font-size:12px;">Subject:</span> <span style="color:#fff;font-size:13px;font-weight:600;">${s.subject}</span>
          </div>
          ${s.related_job_number ? `<div style="margin-bottom:8px;"><span style="color:#888;font-size:12px;">Job:</span> <span style="color:#ff6b00;font-size:13px;">${s.related_job_number}</span></div>` : ""}
          ${attachList ? `<div style="margin-bottom:8px;"><span style="color:#888;font-size:12px;">Attachments:</span> <span style="color:#ccc;font-size:12px;">${attachList}</span></div>` : ""}
          <div style="background:#0a0a0a;border-radius:6px;padding:12px;margin-top:8px;">
            <p style="color:#999;font-size:12px;margin:0;line-height:1.5;">${preview}${preview.length >= 400 ? "..." : ""}</p>
          </div>
        </div>`;
      })
      .join("");

    // ── Full email ──
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:700px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">

        <!-- Header -->
        <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
          <h1 style="margin:0;color:#ff6b00;font-size:22px;">FHI Shadow Digest</h1>
          <p style="margin:4px 0 0;opacity:0.5;font-size:13px;">${today}</p>
          <p style="margin:4px 0 0;opacity:0.4;font-size:11px;">Silent mode active — no emails were sent to external contacts</p>
        </div>

        <!-- ═══════════ SECTION 1: Activity Summary ═══════════ -->
        <div style="margin-bottom:32px;">
          <h2 style="color:#ff6b00;font-size:16px;margin:0 0 12px;border-bottom:1px solid #222;padding-bottom:8px;">1. Email Activity (last 24h)</h2>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
            ${statCard((threads || []).length, "Threads Active")}
            ${statCard((scanLogs || []).length, "New Classified")}
            ${statCard(Object.keys(classBreakdown).length, "Categories")}
          </div>

          ${classBreakdownHtml ? `<div style="margin-bottom:14px;">${classBreakdownHtml}</div>` : ""}

          ${activityRows ? `
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid #333;">
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Time</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">From</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Subject</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Class</th>
              </tr>
            </thead>
            <tbody>${activityRows}</tbody>
          </table>` : `<p style="opacity:0.5;font-size:13px;">No new emails classified in the last 24 hours.</p>`}
        </div>

        <!-- ═══════════ SECTION 2: App Population Audit ═══════════ -->
        <div style="margin-bottom:32px;">
          <h2 style="color:#ff6b00;font-size:16px;margin:0 0 12px;border-bottom:1px solid #222;padding-bottom:8px;">2. App Population Audit</h2>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
            ${statCard((newJobs || []).length, "Jobs Created", "#22c55e")}
            ${statCard((drafts || []).length, "Drafts Created")}
            ${statCard(autoConverted, "Auto-Converted", "#3b82f6")}
            ${statCard(pendingReview, "Pending Review", pendingReview > 0 ? "#ef4444" : "#22c55e")}
          </div>

          <div style="background:#111;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#aaa;">
            <strong style="color:#eee;">Write summary:</strong>
            email_threads: ${(threads || []).length} active &nbsp;|&nbsp;
            jobs: ${(newJobs || []).length} created &nbsp;|&nbsp;
            drafts: ${(drafts || []).length} (${autoConverted} auto, ${pendingReview} pending) &nbsp;|&nbsp;
            notifications: ${(notifications || []).length} pushed
          </div>

          ${jobRows ? `
          <h3 style="color:#ccc;font-size:13px;margin:16px 0 8px;">New Jobs</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid #333;">
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Job #</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Property</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Status</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Urgency</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Source Email</th>
              </tr>
            </thead>
            <tbody>${jobRows}</tbody>
          </table>` : ""}

          ${draftRows ? `
          <h3 style="color:#ccc;font-size:13px;margin:16px 0 8px;">Work Order Drafts</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid #333;">
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Client</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Property</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Status</th>
                <th style="padding:8px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Confidence</th>
              </tr>
            </thead>
            <tbody>${draftRows}</tbody>
          </table>` : ""}

          ${notifSummary ? `
          <h3 style="color:#ccc;font-size:13px;margin:16px 0 8px;">Notifications Pushed</h3>
          <div style="padding:8px 0;">${notifSummary}</div>` : ""}
        </div>

        <!-- ═══════════ SECTION 3: Proposed Outbound ═══════════ -->
        <div style="margin-bottom:24px;">
          <h2 style="color:#ff6b00;font-size:16px;margin:0 0 4px;border-bottom:1px solid #222;padding-bottom:8px;">3. Proposed Outbound (Suppressed by Silent Mode)</h2>
          <p style="opacity:0.4;font-size:12px;margin:0 0 16px;">These emails would have been sent to Neil, Coady, subs, and clients if the app were live.</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
            ${statCard((shadowLogs || []).length, "Emails Suppressed", (shadowLogs || []).length > 0 ? "#ef4444" : "#22c55e")}
            ${statCard(Object.keys(shadowBreakdown).length, "Types")}
          </div>

          ${Object.entries(shadowBreakdown).length ? `
          <div style="margin-bottom:14px;">
            ${Object.entries(shadowBreakdown)
              .map(
                ([type, count]) =>
                  `${emailTypeBadge(type)} <span style="color:#aaa;font-size:13px;">&times;${count}</span>`,
              )
              .join("&nbsp;&nbsp;")}
          </div>` : ""}

          ${shadowRows || `<p style="opacity:0.5;font-size:13px;">No outbound emails were suppressed in the last 24 hours.</p>`}
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #222;padding-top:16px;text-align:center;">
          <p style="opacity:0.3;font-size:11px;margin:0;">FHI Shadow Digest — Silent Mode Observability</p>
          <p style="opacity:0.3;font-size:11px;margin:4px 0 0;">Sent daily to ${recipient}</p>
        </div>
      </div>
    `;

    // ================================================================
    // SEND
    // ================================================================

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[TEST MODE] Would send shadow digest to ${recipient}`,
      );
      return NextResponse.json({ success: true, testMode: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "FHI Shadow Digest <digest@fhi.ca>",
      to: recipient,
      subject: `FHI Shadow Digest — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      html,
    });

    if (error) {
      console.error("Shadow digest send error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      recipient,
      stats: {
        threadsActive: (threads || []).length,
        newClassified: (scanLogs || []).length,
        jobsCreated: (newJobs || []).length,
        draftsCreated: (drafts || []).length,
        notificationsPushed: (notifications || []).length,
        emailsSuppressed: (shadowLogs || []).length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Shadow digest error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
