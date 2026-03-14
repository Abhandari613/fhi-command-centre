import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

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
    const threeDaysAgo = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Find jobs that are in "quoted" status and haven't been updated recently
    const { data: staleJobs } = await supabase
      .from("jobs")
      .select(
        "id, job_number, title, property_address, address, organization_id, updated_at, created_at",
      )
      .eq("status", "quoted")
      .lt("updated_at", threeDaysAgo)
      .order("updated_at", { ascending: true });

    if (!staleJobs?.length) {
      return NextResponse.json({ processed: 0, message: "No stale quotes" });
    }

    const results: any[] = [];

    for (const job of staleJobs as any[]) {
      const updatedAt = new Date(job.updated_at).getTime();
      const daysSinceUpdate = Math.floor(
        (now.getTime() - updatedAt) / (1000 * 60 * 60 * 24),
      );
      const isUrgent = daysSinceUpdate >= 7;

      // Check if we already notified about this job recently (avoid spam)
      const oneDayAgo = new Date(
        now.getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data: recentNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "quote_stale")
        .eq("metadata->>job_id", job.id)
        .gte("created_at", oneDayAgo)
        .limit(1);

      if (recentNotif?.length) continue; // Already notified today

      const address = job.property_address || job.address || job.title;

      // Notify Frank
      await pushNotification({
        organizationId: job.organization_id,
        type: "quote_stale",
        title: isUrgent
          ? `Quote ${job.job_number} — no response in ${daysSinceUpdate} days`
          : `Quote ${job.job_number} awaiting response (${daysSinceUpdate}d)`,
        body: isUrgent
          ? `${address} — Consider following up or closing this quote.`
          : `${address} — Client hasn't responded yet.`,
        metadata: {
          job_id: job.id,
          job_number: job.job_number,
          days_stale: daysSinceUpdate,
          is_urgent: isUrgent,
        },
      });

      // If 3 days: send a gentle follow-up email to client (if we have their email)
      // Look for client linked to this job
      if (daysSinceUpdate >= 3 && daysSinceUpdate < 4) {
        const { data: client } = await supabase
          .from("clients")
          .select("email, name")
          .eq("id", job.client_id)
          .single();

        if (client?.email) {
          // Auto-send follow-up via Resend
          try {
            const appUrl =
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const portalLink = `${appUrl}/portal/${job.id}`;

            if (process.env.RESEND_API_KEY) {
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);

              await resend.emails.send({
                from: "Frank's Home Improvement <onboarding@resend.dev>",
                to: client.email,
                subject: `Following up on your quote — ${address}`,
                html: `
                  <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1a1a1a;">Hi ${client.name || "there"},</h2>
                    <p style="color: #333; font-size: 16px;">
                      Just wanted to check in on the quote we sent over for <strong>${address}</strong>.
                    </p>
                    <p style="color: #333; font-size: 16px;">
                      If you have any questions or want to make changes, we're happy to help.
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
            }
          } catch (emailErr) {
            console.error("Failed to send follow-up email:", emailErr);
          }
        }
      }

      results.push({
        jobId: job.id,
        jobNumber: job.job_number,
        daysSinceUpdate,
        isUrgent,
      });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err: any) {
    console.error("Stale quotes check error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
