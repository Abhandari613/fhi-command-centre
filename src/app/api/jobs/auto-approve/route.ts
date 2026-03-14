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

    // Get job
    const { data: job } = await supabase
      .from("jobs")
      .select("id, job_number, property_address, address, organization_id")
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Get confirmed tasks
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("id, description")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    if (!tasks?.length) {
      return NextResponse.json({ autoApproved: false, reason: "No tasks" });
    }

    // Get photo links
    const { data: links } = await supabase
      .from("task_photo_links")
      .select("task_id, photo_id")
      .in(
        "task_id",
        (tasks as any[]).map((t) => t.id),
      );

    // Check coverage: every task must have at least one photo
    const linkedTaskIds = new Set((links || []).map((l: any) => l.task_id));
    const unlinkedTasks = (tasks as any[]).filter(
      (t) => !linkedTaskIds.has(t.id),
    );

    if (unlinkedTasks.length > 0) {
      return NextResponse.json({
        autoApproved: false,
        reason: `${unlinkedTasks.length} tasks missing photos`,
        unlinkedTasks: unlinkedTasks.map((t) => t.description),
      });
    }

    // All tasks have photos — auto-approve completion
    // Update completion report status if exists
    const { data: report } = await supabase
      .from("completion_reports")
      .select("id")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (report) {
      await supabase
        .from("completion_reports")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", report.id);
    }

    // Move job to completed
    await supabase
      .from("jobs")
      .update({ status: "completed" } as any)
      .eq("id", jobId);

    // Notify Frank
    await pushNotification({
      organizationId: (job as any).organization_id,
      type: "completion_ready",
      title: `${(job as any).job_number} auto-approved — all tasks verified`,
      body: `${(tasks as any[]).length} tasks, ${(links || []).length} photos. Neil will be notified for review.`,
      metadata: {
        job_id: jobId,
        job_number: (job as any).job_number,
        task_count: tasks.length,
        photo_count: (links || []).length,
      },
    });

    // Send notification to Neil (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const address =
          (job as any).property_address || (job as any).address || "";
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        await resend.emails.send({
          from: "Frank's Home Improvement <onboarding@resend.dev>",
          to: "neilh@allprofessionaltrades.com",
          subject: `Auto-approved: ${(job as any).job_number} — ${address}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Completion Auto-Approved</h2>
              <p><strong>${(job as any).job_number}</strong> at <strong>${address}</strong> has been auto-approved.</p>
              <p>All ${(tasks as any[]).length} tasks have verified completion photos. This is an FYI — the AI confirmed everything matches.</p>
              <a href="${appUrl}/ops/jobs/${jobId}/complete" style="display: inline-block; background: #f97316; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0;">
                Review Anyway
              </a>
              <p style="color: #999; font-size: 13px;">— Frank's Home Improvement AI</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("Neil notification email failed:", e);
      }
    }

    return NextResponse.json({
      autoApproved: true,
      tasksVerified: tasks.length,
      photosLinked: (links || []).length,
    });
  } catch (err: any) {
    console.error("Auto-approve error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
