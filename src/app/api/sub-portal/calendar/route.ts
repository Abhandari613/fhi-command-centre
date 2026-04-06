import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateJobICS } from "@/lib/services/ics";

/**
 * GET /api/sub-portal/calendar?token=<magic_link_token>
 * Returns an .ics file for the sub's assigned job.
 * No auth required — the magic link token IS the auth.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = (await createClient()) as any;

  // Look up assignment by magic link token
  const { data: assignment, error } = await supabase
    .from("job_assignments")
    .select(
      "id, scheduled_start, scheduled_end, jobs(job_number, property_address, description, start_date, end_date, job_tasks(description))",
    )
    .eq("magic_link_token", token)
    .single();

  if (error || !assignment?.jobs) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 },
    );
  }

  const job = assignment.jobs as any;
  const startDate =
    assignment.scheduled_start || job.start_date || new Date().toISOString().split("T")[0];
  const endDate =
    assignment.scheduled_end || job.end_date || startDate;

  const taskList = (job.job_tasks || [])
    .map((t: any) => `• ${t.description}`)
    .join("\n");

  const description = [
    job.description || "",
    taskList ? `\nTasks:\n${taskList}` : "",
    `\nPortal: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/s/${token}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = generateJobICS({
    jobNumber: job.job_number || "JOB",
    address: job.property_address || "TBD",
    description,
    startDate,
    endDate,
    uid: `assignment-${assignment.id}@fhi.app`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="FHI-${job.job_number || "job"}.ics"`,
    },
  });
}
