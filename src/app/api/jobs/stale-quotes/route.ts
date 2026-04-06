import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";
import { isSilentMode } from "@/lib/services/silent-mode";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST() {
  try {
    const supabase = getAdminClient();
    const now = new Date();

    // Find jobs in "sent" status that have a quote_expiry_date
    const { data: sentJobs } = await supabase
      .from("jobs")
      .select(
        "id, job_number, title, property_address, address, organization_id, client_id, quote_expiry_date",
      )
      .eq("status", "sent")
      .not("quote_expiry_date", "is", null)
      .order("quote_expiry_date", { ascending: true });

    if (!sentJobs?.length) {
      return NextResponse.json({ processed: 0, message: "No quotes with expiry" });
    }

    const results: any[] = [];

    for (const job of sentJobs as any[]) {
      const expiryDate = new Date(job.quote_expiry_date);
      const msRemaining = expiryDate.getTime() - now.getTime();
      const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);

      // Check silent mode for this org — still process logic but skip emails
      const silent = await isSilentMode(job.organization_id);

      // Determine which reminder tier applies
      let tier: string | null = null;
      if (daysRemaining <= 0) {
        tier = "expired";
      } else if (daysRemaining <= 1) {
        tier = "urgent"; // 1 day remaining
      } else if (daysRemaining <= 2) {
        tier = "reminder"; // 2 days remaining
      }

      if (!tier) continue;

      // Deduplicate: check if this tier was already sent for this job
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "quote_expiry")
        .eq("metadata->>job_id", job.id)
        .eq("metadata->>tier", tier)
        .limit(1);

      if (existingNotif?.length) continue;

      const address = job.property_address || job.address || job.title;

      // Get client info for emails
      let clientEmail: string | null = null;
      let clientName: string | null = null;
      if (job.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("email, name")
          .eq("id", job.client_id)
          .single();
        clientEmail = client?.email || null;
        clientName = client?.name || null;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const portalLink = `${appUrl}/portal/${job.id}`;

      if (tier === "expired") {
        // Mark quote expired — revert to "quoted" status
        await supabase
          .from("jobs")
          .update({ status: "quoted", quote_expiry_date: null } as any)
          .eq("id", job.id);

        // Notify Frank
        await pushNotification({
          organizationId: job.organization_id,
          type: "quote_expiry",
          title: `Quote ${job.job_number} expired`,
          body: `${address} — Quote expired. Client did not respond within the 4-day window.`,
          metadata: { job_id: job.id, job_number: job.job_number, tier },
        });

        // Email client
        if (clientEmail && process.env.RESEND_API_KEY && !silent) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "Frank's Home Improvement <onboarding@resend.dev>",
              to: clientEmail,
              subject: `Your quote has expired — ${address}`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a1a1a;">Hi ${clientName || "there"},</h2>
                  <p style="color: #333; font-size: 16px;">
                    Your quote for <strong>${address}</strong> has expired as it was not approved within the 4 business day window.
                  </p>
                  <p style="color: #333; font-size: 16px;">
                    If you're still interested, please contact Frank to request a new quote.
                  </p>
                  <a href="mailto:frank@frankshomeimprovement.com" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
                    Contact Frank
                  </a>
                  <p style="color: #999; font-size: 13px; margin-top: 32px;">
                    — Frank's Home Improvement
                  </p>
                </div>
              `,
            });
          } catch (e) {
            console.error("Failed to send expiry email:", e);
          }
        }
      } else if (tier === "urgent") {
        // 1 day remaining — urgent reminder
        await pushNotification({
          organizationId: job.organization_id,
          type: "quote_expiry",
          title: `Quote ${job.job_number} expires tomorrow!`,
          body: `${address} — Quote expires in less than 24 hours.`,
          metadata: { job_id: job.id, job_number: job.job_number, tier },
        });

        if (clientEmail && process.env.RESEND_API_KEY && !silent) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "Frank's Home Improvement <onboarding@resend.dev>",
              to: clientEmail,
              subject: `Urgent: Your quote expires tomorrow — ${address}`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a1a1a;">Hi ${clientName || "there"},</h2>
                  <p style="color: #333; font-size: 16px;">
                    This is a friendly reminder that your quote for <strong>${address}</strong> expires <strong>tomorrow</strong>.
                  </p>
                  <p style="color: #333; font-size: 16px;">
                    Please review and approve it before it expires.
                  </p>
                  <a href="${portalLink}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
                    Review Your Quote
                  </a>
                  <p style="color: #999; font-size: 13px; margin-top: 32px;">
                    — Frank's Home Improvement
                  </p>
                </div>
              `,
            });
          } catch (e) {
            console.error("Failed to send urgent reminder:", e);
          }
        }
      } else if (tier === "reminder") {
        // 2 days remaining — gentle reminder
        await pushNotification({
          organizationId: job.organization_id,
          type: "quote_expiry",
          title: `Quote ${job.job_number} expires in 2 days`,
          body: `${address} — Client reminder sent.`,
          metadata: { job_id: job.id, job_number: job.job_number, tier },
        });

        if (clientEmail && process.env.RESEND_API_KEY && !silent) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "Frank's Home Improvement <onboarding@resend.dev>",
              to: clientEmail,
              subject: `Your quote expires in 2 days — ${address}`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a1a1a;">Hi ${clientName || "there"},</h2>
                  <p style="color: #333; font-size: 16px;">
                    Just a heads up — your quote for <strong>${address}</strong> will expire in <strong>2 days</strong>.
                  </p>
                  <p style="color: #333; font-size: 16px;">
                    If you have any questions, we're happy to help.
                  </p>
                  <a href="${portalLink}" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
                    View Your Quote
                  </a>
                  <p style="color: #999; font-size: 13px; margin-top: 32px;">
                    — Frank's Home Improvement
                  </p>
                </div>
              `,
            });
          } catch (e) {
            console.error("Failed to send reminder email:", e);
          }
        }
      }

      results.push({
        jobId: job.id,
        jobNumber: job.job_number,
        tier,
        daysRemaining: Math.max(0, Math.round(daysRemaining * 10) / 10),
      });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err: any) {
    console.error("Quote expiry check error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
