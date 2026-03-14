import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type ReminderTier = {
  type: "friendly" | "followup" | "urgent" | "final";
  minDays: number;
  maxDays: number;
  subject: (job: any, client: any) => string;
  html: (job: any, client: any, appUrl: string) => string;
};

const REMINDER_TIERS: ReminderTier[] = [
  {
    type: "friendly",
    minDays: 7,
    maxDays: 14,
    subject: (job) =>
      `Friendly reminder — invoice for ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Just a friendly reminder that your invoice for <strong>${job.property_address || job.title}</strong> is still outstanding.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View & Pay Invoice
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "followup",
    minDays: 21,
    maxDays: 35,
    subject: (job) =>
      `Follow-up: payment due — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>We wanted to follow up on the outstanding invoice for <strong>${job.property_address || job.title}</strong>.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>If you've already sent payment, please disregard this email. Otherwise, we'd appreciate payment at your earliest convenience.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View & Pay Invoice
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "urgent",
    minDays: 45,
    maxDays: 65,
    subject: (job) => `Payment overdue — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Your invoice for <strong>${job.property_address || job.title}</strong> is now significantly overdue.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>Please arrange payment as soon as possible. If you're experiencing any difficulties, please get in touch so we can work something out.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #ef4444; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          Pay Now
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  },
  {
    type: "final",
    minDays: 90,
    maxDays: 999,
    subject: (job) => `Final notice — ${job.property_address || job.title}`,
    html: (job, client, appUrl) => `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>This is a final notice regarding the outstanding invoice for <strong>${job.property_address || job.title}</strong>.</p>
        <p>Amount due: <strong>$${Number(job.final_invoice_amount).toLocaleString()}</strong></p>
        <p>This invoice is now over 90 days past due. Please contact us immediately to arrange payment.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #ef4444; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          Pay Now
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  },
];

export async function processPaymentReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  const supabase = getAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let sent = 0;
  let errors = 0;

  // Get all invoiced jobs with their client info
  const { data: receivables } = await supabase
    .from("jobs")
    .select(
      "id, job_number, title, property_address, final_invoice_amount, invoiced_at, updated_at, created_at, organization_id, client_id",
    )
    .eq("status", "invoiced")
    .gt("final_invoice_amount", 0);

  if (!receivables?.length) return { sent: 0, errors: 0 };

  for (const job of receivables) {
    const invoicedAt =
      (job as any).invoiced_at ||
      (job as any).updated_at ||
      (job as any).created_at;
    const daysOutstanding = Math.floor(
      (Date.now() - new Date(invoicedAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Find applicable reminder tier
    const tier = REMINDER_TIERS.find(
      (t) => daysOutstanding >= t.minDays && daysOutstanding <= t.maxDays,
    );
    if (!tier) continue;

    // Check if we already sent this tier for this job
    const { data: existingReminder } = await supabase
      .from("payment_reminders")
      .select("id")
      .eq("job_id", job.id)
      .eq("reminder_type", tier.type)
      .limit(1);

    if (existingReminder?.length) continue;

    // Get client email
    if (!(job as any).client_id) continue;
    const { data: client } = await supabase
      .from("clients")
      .select("email, name")
      .eq("id", (job as any).client_id)
      .single();

    if (!client?.email) continue;

    // Send email
    const subject = tier.subject(job, client);
    const html = tier.html(job, client, appUrl);

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "Frank's Home Improvement <onboarding@resend.dev>",
          to: client.email,
          subject,
          html,
        });
      } else {
        console.log(`[TEST MODE] Would send "${subject}" to ${client.email}`);
      }

      // Record the reminder
      await supabase.from("payment_reminders").insert({
        job_id: job.id,
        organization_id: (job as any).organization_id,
        reminder_type: tier.type,
        sent_to: client.email,
      });

      // Also create a notification for internal visibility
      await supabase.from("notifications").insert({
        organization_id: (job as any).organization_id,
        type: "payment_reminder_sent",
        title: `Payment reminder sent — ${(job as any).job_number}`,
        body: `${tier.type} reminder sent to ${client.name || client.email} for $${Number((job as any).final_invoice_amount).toLocaleString()} (${daysOutstanding} days outstanding)`,
        metadata: {
          job_id: job.id,
          reminder_type: tier.type,
          days_outstanding: daysOutstanding,
          amount: (job as any).final_invoice_amount,
        },
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for job ${job.id}:`, err);
      errors++;
    }
  }

  return { sent, errors };
}
