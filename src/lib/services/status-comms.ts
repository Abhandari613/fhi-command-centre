import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type StatusMessage = {
  subject: string;
  html: string;
};

const STATUS_MESSAGES: Record<
  string,
  (job: any, client: any, appUrl: string) => StatusMessage | null
> = {
  quoted: (job, client, appUrl) => ({
    subject: `Your quote is ready — ${job.property_address || job.address || job.title}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Your quote for <strong>${job.property_address || job.address}</strong> is ready for review.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View Quote
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  }),

  scheduled: (job, client, appUrl) => {
    const dateStr = job.due_date
      ? new Date(job.due_date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : "soon";
    return {
      subject: `Work scheduled for ${dateStr} — ${job.property_address || job.address || ""}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hi ${client.name || "there"},</h2>
          <p>Your job at <strong>${job.property_address || job.address}</strong> is scheduled for <strong>${dateStr}</strong>.</p>
          <p>Our crew will arrive in the morning. Please ensure access to the work area.</p>
          <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
            View Details
          </a>
          <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
        </div>`,
    };
  },

  in_progress: (job, client, appUrl) => ({
    subject: `Work has started — ${job.property_address || job.address || ""}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Work has begun at <strong>${job.property_address || job.address}</strong>!</p>
        <p>You can track progress and see photos as they come in.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View Progress
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  }),

  completed: (job, client, appUrl) => ({
    subject: `Work complete! — ${job.property_address || job.address || ""}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Great news! Work at <strong>${job.property_address || job.address}</strong> is complete.</p>
        <p>You can view completion photos and the final report below.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #22c55e; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View Completion Report
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  }),

  invoiced: (job, client, appUrl) => ({
    subject: `Invoice ready — ${job.property_address || job.address || ""}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${client.name || "there"},</h2>
        <p>Your invoice for work at <strong>${job.property_address || job.address}</strong> is ready.</p>
        <a href="${appUrl}/portal/${job.id}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
          View & Pay Invoice
        </a>
        <p style="color: #999; font-size: 13px;">— Frank's Home Improvement</p>
      </div>`,
  }),
};

export async function sendStatusTransitionEmail(
  jobId: string,
  newStatus: string,
): Promise<boolean> {
  try {
    const supabase = getAdminClient();

    // Get job
    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) return false;

    // Get client
    if (!(job as any).client_id) return false;

    const { data: client } = await supabase
      .from("clients")
      .select("email, name")
      .eq("id", (job as any).client_id)
      .single();

    if (!client?.email) return false;

    const messageFn = STATUS_MESSAGES[newStatus];
    if (!messageFn) return false;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const message = messageFn(job, client, appUrl);
    if (!message) return false;

    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[TEST MODE] Would send "${message.subject}" to ${client.email}`,
      );
      return true;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Frank's Home Improvement <onboarding@resend.dev>",
      to: client.email,
      subject: message.subject,
      html: message.html,
    });

    return true;
  } catch (err) {
    console.error("Status transition email failed:", err);
    return false;
  }
}
