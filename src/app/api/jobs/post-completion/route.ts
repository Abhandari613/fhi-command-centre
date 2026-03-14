import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    // Get job details
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, address, organization_id, client_id",
      )
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const results: string[] = [];

    // 1. Send review request to client
    if ((job as any).client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("email, name")
        .eq("id", (job as any).client_id)
        .single();

      if (client?.email && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const address =
            (job as any).property_address ||
            (job as any).address ||
            "your property";

          await resend.emails.send({
            from: "Frank's Home Improvement <onboarding@resend.dev>",
            to: client.email,
            subject: `How'd we do? — ${address}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a;">Hi ${client.name || "there"},</h2>
                <p style="color: #333; font-size: 16px;">
                  The work at <strong>${address}</strong> is all wrapped up!
                </p>
                <p style="color: #333; font-size: 16px;">
                  We'd love to hear how it went. Your feedback helps us do even better work.
                </p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 18px; margin: 0 0 16px; font-weight: bold;">Rate your experience</p>
                  <div style="font-size: 32px; letter-spacing: 8px;">
                    <a href="#" style="text-decoration: none;">⭐</a>
                    <a href="#" style="text-decoration: none;">⭐</a>
                    <a href="#" style="text-decoration: none;">⭐</a>
                    <a href="#" style="text-decoration: none;">⭐</a>
                    <a href="#" style="text-decoration: none;">⭐</a>
                  </div>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Simply reply to this email with your thoughts, or leave us a Google review.
                </p>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">
                  Thank you for choosing Frank's Home Improvement!
                </p>
              </div>
            `,
          });
          results.push("review_email_sent");
        } catch (e) {
          console.error("Review email failed:", e);
        }
      }
    }

    // 2. Check for recurring work opportunities
    const address = (job as any).property_address || (job as any).address;
    if (address) {
      const { data: priorJobs } = await supabase
        .from("jobs")
        .select("id, job_number, created_at, title")
        .eq("organization_id", (job as any).organization_id)
        .neq("id", jobId)
        .or(`property_address.ilike.%${address}%,address.ilike.%${address}%`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (priorJobs?.length) {
        const lastJob = priorJobs[0] as any;
        const daysSinceLast = Math.floor(
          (Date.now() - new Date(lastJob.created_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await pushNotification({
          organizationId: (job as any).organization_id,
          type: "review_request",
          title: `Repeat client at ${address}`,
          body: `${priorJobs.length + 1} jobs at this address. Last was ${daysSinceLast} days ago (${lastJob.job_number}). Consider annual maintenance outreach.`,
          metadata: {
            job_id: jobId,
            address,
            prior_job_count: priorJobs.length,
            prior_jobs: priorJobs.map((j: any) => j.job_number),
          },
        });
        results.push("recurring_work_detected");
      }
    }

    // 3. Check if this client has referred others (same address patterns)
    // This is a soft signal — just notify Frank
    const { data: clientJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("client_id", (job as any).client_id)
      .eq("status", "paid");

    if ((clientJobs?.length || 0) >= 3) {
      await pushNotification({
        organizationId: (job as any).organization_id,
        type: "review_request",
        title: `Loyal client — ${clientJobs?.length || 0} completed jobs`,
        body: `Consider sending a thank-you or referral incentive.`,
        metadata: {
          job_id: jobId,
          client_id: (job as any).client_id,
          completed_jobs: clientJobs?.length,
        },
      });
      results.push("loyal_client_flagged");
    }

    return NextResponse.json({ success: true, actions: results });
  } catch (err: any) {
    console.error("Post-completion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
