"use server";

import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";
import { Resend } from "resend";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type ReminderTier = "friendly" | "followup" | "urgent" | "final";

const TIER_CONFIG: Array<{
  type: ReminderTier;
  minDays: number;
  maxDays: number;
  subject: (job: any, client: any) => string;
  html: (job: any, client: any, appUrl: string) => string;
}> = [
  {
    type: "friendly",
    minDays: 7,
    maxDays: 14,
    subject: (job) =>
      `Friendly reminder — invoice for ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Just a friendly reminder that your invoice for <strong>${job.property_address || job.title}</strong> is still outstanding.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <a href="${appUrl}/portal/${job.id}" style="display:inline-block;background:#f97316;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;margin:16px 0;">
          View & Pay Invoice
        </a>
        <p style="color:#999;font-size:13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "followup",
    minDays: 21,
    maxDays: 35,
    subject: (job) =>
      `Follow-up: payment due — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>We wanted to follow up on the outstanding invoice for <strong>${job.property_address || job.title}</strong>.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>If you've already sent payment, please disregard this email. Otherwise, we'd appreciate payment at your earliest convenience.</p>
        <a href="${appUrl}/portal/${job.id}" style="display:inline-block;background:#f97316;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;margin:16px 0;">
          View & Pay Invoice
        </a>
        <p style="color:#999;font-size:13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "urgent",
    minDays: 45,
    maxDays: 65,
    subject: (job) =>
      `Payment overdue — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Your invoice for <strong>${job.property_address || job.title}</strong> is now significantly overdue.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>Please arrange payment as soon as possible. If you're experiencing any difficulties, please get in touch so we can work something out.</p>
        <a href="${appUrl}/portal/${job.id}" style="display:inline-block;background:#ef4444;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;margin:16px 0;">
          Pay Now
        </a>
        <p style="color:#999;font-size:13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "final",
    minDays: 90,
    maxDays: 999,
    subject: (job) =>
      `Final notice — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>This is a final notice regarding the outstanding invoice for <strong>${job.property_address || job.title}</strong>.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>This invoice is now over 90 days past due. Please contact us immediately to arrange payment.</p>
        <a href="${appUrl}/portal/${job.id}" style="display:inline-block;background:#ef4444;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;margin:16px 0;">
          Pay Now
        </a>
        <p style="color:#999;font-size:13px;">— Frank's Home Improvement</p>
      </div>`,
  },
];

/**
 * Generate payment reminder drafts instead of sending directly.
 * Creates draft records and emails Frank with proposed reminders.
 */
export async function generatePaymentReminderDrafts(): Promise<{
  draftsCreated: number;
  errors: number;
}> {
  const supabase = getAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let draftsCreated = 0;
  let errors = 0;

  // Get all invoiced jobs
  const { data: receivables } = await supabase
    .from("jobs")
    .select(
      "id, job_number, title, property_address, final_invoice_amount, invoiced_at, updated_at, created_at, organization_id, client_id",
    )
    .eq("status", "invoiced")
    .gt("final_invoice_amount", 0);

  if (!receivables?.length) return { draftsCreated: 0, errors: 0 };

  // Group drafts by org for batching the email to Frank
  const draftsByOrg: Record<
    string,
    Array<{ job: any; client: any; tier: (typeof TIER_CONFIG)[number]; days: number }>
  > = {};

  for (const job of receivables) {
    const invoicedAt =
      (job as any).invoiced_at ||
      (job as any).updated_at ||
      (job as any).created_at;
    const daysOutstanding = Math.floor(
      (Date.now() - new Date(invoicedAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    const tier = TIER_CONFIG.find(
      (t) => daysOutstanding >= t.minDays && daysOutstanding <= t.maxDays,
    );
    if (!tier) continue;

    // Check if we already sent this tier
    const { data: existingSent } = await supabase
      .from("payment_reminders")
      .select("id")
      .eq("job_id", job.id)
      .eq("reminder_type", tier.type)
      .limit(1);
    if (existingSent?.length) continue;

    // Check if a draft already exists for this tier
    const { data: existingDraft } = await (supabase.from as any)(
      "payment_reminder_drafts",
    )
      .select("id")
      .eq("job_id", job.id)
      .eq("tier", tier.type)
      .eq("status", "draft")
      .limit(1);
    if (existingDraft?.length) continue;

    // Get client info
    if (!(job as any).client_id) continue;
    const { data: client } = await supabase
      .from("clients")
      .select("email, name")
      .eq("id", (job as any).client_id)
      .single();
    if (!client?.email) continue;

    try {
      const subject = tier.subject(job, client);
      const bodyHtml = tier.html(job, client, appUrl);

      // Create draft
      await (supabase.from as any)("payment_reminder_drafts").insert({
        organization_id: (job as any).organization_id,
        job_id: job.id,
        tier: tier.type,
        recipient_email: client.email,
        recipient_name: client.name || null,
        subject,
        body_html: bodyHtml,
        amount: (job as any).final_invoice_amount,
        days_outstanding: daysOutstanding,
        status: "draft",
      });

      const orgId = (job as any).organization_id;
      if (!draftsByOrg[orgId]) draftsByOrg[orgId] = [];
      draftsByOrg[orgId].push({ job, client, tier, days: daysOutstanding });

      draftsCreated++;
    } catch (err) {
      console.error(`Failed to create reminder draft for job ${job.id}:`, err);
      errors++;
    }
  }

  // Email Frank with summary for each org
  for (const [orgId, drafts] of Object.entries(draftsByOrg)) {
    // Get Frank's email
    const { data: orgUsers } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("organization_id", orgId)
      .limit(1);

    const frankEmail = orgUsers?.[0]?.email;
    if (!frankEmail) continue;

    // Build summary email
    const draftListHtml = drafts
      .map(
        (d) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #333;">${d.client.name || d.client.email}</td>
          <td style="padding:8px;border-bottom:1px solid #333;">$${Number((d.job as any).final_invoice_amount).toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #333;">${d.days} days</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-transform:capitalize;">${d.tier.type}</td>
          <td style="padding:8px;border-bottom:1px solid #333;">
            <a href="${appUrl}/ops/finance/reminders" style="color:#ff6b00;">Review</a>
          </td>
        </tr>`,
      )
      .join("");

    const summaryHtml = `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
        <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
          <h2 style="margin:0;color:#ff6b00;">${drafts.length} Payment Reminder${drafts.length > 1 ? "s" : ""} Ready to Send</h2>
          <p style="margin:4px 0 0;opacity:0.6;">Review and send from your dashboard</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #333;">
              <th style="padding:8px;text-align:left;color:#999;">Client</th>
              <th style="padding:8px;text-align:left;color:#999;">Amount</th>
              <th style="padding:8px;text-align:left;color:#999;">Outstanding</th>
              <th style="padding:8px;text-align:left;color:#999;">Tier</th>
              <th style="padding:8px;text-align:left;color:#999;">Action</th>
            </tr>
          </thead>
          <tbody>${draftListHtml}</tbody>
        </table>
        <a href="${appUrl}/ops/finance/reminders" style="display:inline-block;background:#ff6b00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:24px;">
          Review All Reminders
        </a>
        <p style="margin-top:24px;opacity:0.6;font-size:13px;">— FHI Automation</p>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "FHI Reminders <reminders@fhi.ca>",
          to: frankEmail,
          subject: `${drafts.length} payment reminder${drafts.length > 1 ? "s" : ""} ready to send`,
          html: summaryHtml,
        });
      } catch (err) {
        console.error("Failed to email Frank reminder summary:", err);
      }
    }

    // Push notification
    await pushNotification({
      organizationId: orgId,
      type: "reminder_drafts_ready",
      title: `${drafts.length} payment reminder${drafts.length > 1 ? "s" : ""} ready for review`,
      body: `Total outstanding: $${drafts.reduce((sum, d) => sum + Number((d.job as any).final_invoice_amount), 0).toLocaleString()}`,
      metadata: { draft_count: drafts.length },
    });
  }

  return { draftsCreated, errors };
}

/**
 * Send a payment reminder draft.
 */
export async function sendReminderDraft(
  draftId: string,
  editedBody?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { data: draft } = await (supabase.from as any)(
    "payment_reminder_drafts",
  )
    .select("*")
    .eq("id", draftId)
    .single();

  if (!draft) return { success: false, error: "Draft not found" };
  if ((draft as any).status !== "draft")
    return { success: false, error: "Draft already processed" };

  const bodyHtml = editedBody || (draft as any).body_html;

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Frank's Home Improvement <onboarding@resend.dev>",
        to: (draft as any).recipient_email,
        subject: (draft as any).subject,
        html: bodyHtml,
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Mark draft as sent
  await (supabase.from as any)("payment_reminder_drafts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", draftId);

  // Record in payment_reminders for dedup
  await supabase.from("payment_reminders").insert({
    job_id: (draft as any).job_id,
    organization_id: (draft as any).organization_id,
    reminder_type: (draft as any).tier,
    sent_to: (draft as any).recipient_email,
  });

  return { success: true };
}

/**
 * Dismiss a payment reminder draft.
 */
export async function dismissReminderDraft(
  draftId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase.from as any)("payment_reminder_drafts")
    .update({ status: "dismissed" })
    .eq("id", draftId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get all pending reminder drafts for review UI.
 */
export async function getPendingReminderDrafts() {
  const { createClient: createServerClient } = await import(
    "@/utils/supabase/server"
  );
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  const { data } = await (supabase.from as any)("payment_reminder_drafts")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  return data || [];
}
