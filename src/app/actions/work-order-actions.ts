"use server";

import { createClient } from "@/utils/supabase/server";

async function getDb() {
  return (await createClient()) as any;
}

export async function getJobWorkOrders(jobId: string) {
  const supabase = await getDb();

  const { data } = await supabase
    .from("work_orders")
    .select(
      "id, status, due_at, property_address_or_unit, work_order_tasks(id)",
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  return (data || []).map((wo: any) => ({
    ...wo,
    taskCount: wo.work_order_tasks?.length ?? 0,
  }));
}

export async function getWorkOrderLinkedJob(workOrderId: string) {
  const supabase = await getDb();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("job_id")
    .eq("id", workOrderId)
    .single();

  if (!wo?.job_id) return null;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, property_address, status, title")
    .eq("id", wo.job_id)
    .single();

  return job || null;
}

export async function getIncompleteWorkOrdersForJob(
  jobId: string,
): Promise<number> {
  const supabase = await getDb();

  const { data } = await supabase
    .from("work_orders")
    .select("id, status")
    .eq("job_id", jobId)
    .neq("status", "Completed");

  return (data || []).length;
}
