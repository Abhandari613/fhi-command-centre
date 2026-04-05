"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { JobStatus, JOB_STATUS_FLOW } from "@/lib/fsm/job-state";
import { sendStatusTransitionEmail } from "@/lib/services/status-comms";

export type DashboardJob = {
  id: string;
  job_number: string;
  title: string;
  property_address: string | null;
  address: string | null;
  status: string;
  urgency: string;
  due_date: string | null;
  created_at: string;
  quoted_total?: number;
};

/** Calculate expiry date = fromDate + 4 business days (skip weekends) */
function calculateExpiryDate(fromDate: Date): Date {
  const result = new Date(fromDate);
  let businessDays = 0;
  while (businessDays < 4) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) businessDays++;
  }
  return result;
}

const STATUS_ORDER = [
  "incoming",
  "draft",
  "quoted",
  "sent",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
];

// Dashboard advance follows the 10-stop happy path
const NEXT_STATUS: Record<string, string> = {
  incoming: "draft",
  draft: "quoted",
  quoted: "sent",
  sent: "approved",
  approved: "scheduled",
  scheduled: "in_progress",
  in_progress: "completed",
  completed: "invoiced",
  invoiced: "paid",
};

export async function getDashboardJobs(): Promise<DashboardJob[]> {
  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, job_number, title, property_address, address, status, urgency, due_date, created_at",
    )
    .in("status", STATUS_ORDER)
    .order("created_at", { ascending: false });

  if (error || !jobs) return [];

  // Fetch totals for each job from job_tasks
  const jobIds = jobs.map((j: any) => j.id);
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("job_id, quantity, unit_price")
    .in("job_id", jobIds)
    .eq("is_confirmed", true);

  const totalsMap: Record<string, number> = {};
  if (tasks) {
    for (const t of tasks as any[]) {
      const lineTotal = (t.quantity || 1) * (t.unit_price || 0);
      totalsMap[t.job_id] = (totalsMap[t.job_id] || 0) + lineTotal;
    }
  }

  return (jobs as any[]).map((j) => ({
    ...j,
    quoted_total: totalsMap[j.id] || 0,
  }));
}

export async function advanceJobStatus(jobId: string) {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .single();

  if (!job?.status) return { success: false, error: "Job not found" };

  const nextStatus = NEXT_STATUS[job.status];
  if (!nextStatus) return { success: false, error: "No next status" };

  // Soft guard: warn if completing a job that has incomplete work orders
  let warning: string | undefined;
  if (nextStatus === "completed") {
    const { data: incompleteWOs } = await (supabase.from as any)("work_orders")
      .select("id")
      .eq("job_id", jobId)
      .neq("status", "Completed");

    const incompleteCount = (incompleteWOs || []).length;
    if (incompleteCount > 0) {
      warning = `${incompleteCount} work order${incompleteCount !== 1 ? "s" : ""} still in progress. Mark them complete in Work Orders when done.`;
    }
  }

  // Build update payload with timestamps for specific transitions
  const updatePayload: Record<string, any> = { status: nextStatus };
  if (nextStatus === "sent") {
    updatePayload.quote_expiry_date = calculateExpiryDate(new Date()).toISOString();
  }
  if (nextStatus === "invoiced") {
    updatePayload.invoiced_at = new Date().toISOString();
  }
  if (nextStatus === "paid") {
    updatePayload.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("jobs")
    .update(updatePayload as any)
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };

  // Auto-send status transition email to client
  sendStatusTransitionEmail(jobId, nextStatus);

  revalidatePath("/dashboard");
  return { success: true, newStatus: nextStatus, ...(warning && { warning }) };
}
