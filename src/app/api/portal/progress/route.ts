import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    // Get job info
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, address, status, due_date, title",
      )
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Get confirmed tasks
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("id, description, is_confirmed")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    // Get task photo links (completed tasks have photos)
    const taskIds = (tasks || []).map((t: any) => t.id);
    const { data: links } = await supabase
      .from("task_photo_links")
      .select("task_id")
      .in("task_id", taskIds.length ? taskIds : ["none"]);

    const completedTaskIds = new Set((links || []).map((l: any) => l.task_id));

    // Get recent photos
    const { data: recentPhotos } = await supabase
      .from("job_photos")
      .select("id, url, created_at, phase")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(12);

    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter((t: any) =>
      completedTaskIds.has(t.id),
    ).length;
    const progressPercent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Map status to human-readable stage
    const stageMap: Record<string, string> = {
      incoming: "Received",
      draft: "Being Reviewed",
      quoted: "Quote Sent",
      sent: "Quote Sent",
      approved: "Approved",
      scheduled: "Scheduled",
      active: "Active",
      in_progress: "Work In Progress",
      completed: "Work Complete",
      invoiced: "Invoice Sent",
      paid: "Paid — All Done!",
    };

    return NextResponse.json({
      job: {
        id: (job as any).id,
        jobNumber: (job as any).job_number,
        address:
          (job as any).property_address ||
          (job as any).address ||
          (job as any).title,
        status: (job as any).status,
        stage: stageMap[(job as any).status] || (job as any).status,
        dueDate: (job as any).due_date,
      },
      progress: {
        totalTasks,
        completedTasks,
        percent: progressPercent,
        tasks: (tasks || []).map((t: any) => ({
          id: t.id,
          description: t.description,
          completed: completedTaskIds.has(t.id),
        })),
      },
      recentPhotos: (recentPhotos || []).map((p: any) => ({
        id: p.id,
        url: p.url,
        date: p.created_at,
        phase: p.phase,
      })),
    });
  } catch (err: any) {
    console.error("Portal progress error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
