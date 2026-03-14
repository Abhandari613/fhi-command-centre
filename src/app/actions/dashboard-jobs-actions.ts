"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

const STATUS_ORDER = ["incoming", "quoted", "in_progress", "invoiced", "paid"];

const NEXT_STATUS: Record<string, string> = {
  incoming: "quoted",
  quoted: "in_progress",
  in_progress: "invoiced",
  invoiced: "paid",
};

export async function getDashboardJobs(): Promise<DashboardJob[]> {
  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, job_number, title, property_address, address, status, urgency, due_date, created_at")
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

  const { error } = await supabase
    .from("jobs")
    .update({ status: nextStatus } as any)
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true, newStatus: nextStatus };
}
