"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getJobForQuote(jobId: string) {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("*")
    .eq("job_id", jobId)
    .eq("is_confirmed", true)
    .order("created_at", { ascending: true });

  return { job, tasks: tasks || [] };
}

export async function updateTaskPricing(
  taskId: string,
  updates: { quantity: number; unit_price: number; description: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_tasks")
    .update(updates as any)
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateJobToQuoted(jobId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({ status: "quoted" } as any)
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/ops/jobs/${jobId}/quote`);
  revalidatePath("/dashboard");
  return { success: true };
}
