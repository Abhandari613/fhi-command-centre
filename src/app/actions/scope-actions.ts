"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getJobWithAttachments(jobId: string) {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  const { data: attachments } = await supabase
    .from("job_attachments")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  return { job, attachments: attachments || [], tasks: tasks || [] };
}

export async function saveJobTasks(
  jobId: string,
  tasks: { description: string; is_confirmed: boolean }[]
) {
  const supabase = await createClient();

  // Delete existing unconfirmed tasks for this job (re-scan scenario)
  await supabase
    .from("job_tasks")
    .delete()
    .eq("job_id", jobId)
    .eq("is_confirmed", false);

  // Insert new tasks
  if (tasks.length > 0) {
    const rows = tasks.map((t) => ({
      job_id: jobId,
      description: t.description,
      is_confirmed: t.is_confirmed,
    }));

    const { error } = await supabase.from("job_tasks").insert(rows as any);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/ops/jobs/${jobId}/scope`);
  return { success: true };
}

export async function confirmJobTasks(jobId: string, taskIds: string[]) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_tasks")
    .update({ is_confirmed: true } as any)
    .eq("job_id", jobId)
    .in("id", taskIds);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/ops/jobs/${jobId}/scope`);
  revalidatePath(`/ops/jobs/${jobId}/quote`);
  return { success: true };
}
