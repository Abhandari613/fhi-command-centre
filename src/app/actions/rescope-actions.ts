"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getUnconfirmedTasks(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_tasks")
    .select("*")
    .eq("job_id", jobId)
    .eq("is_confirmed", false)
    .order("scope_round", { ascending: false });

  return data || [];
}

export async function acceptRescopeTasks(
  jobId: string,
  taskIds: string[],
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_tasks")
    .update({ is_confirmed: true })
    .in("id", taskIds);

  if (error) {
    return { success: false, error: error.message };
  }

  await logJobEvent(jobId, "rescope_tasks_accepted", {
    count: taskIds.length,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true };
}

export async function dismissRescopeTasks(
  jobId: string,
  taskIds: string[],
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase.from("job_tasks").delete().in("id", taskIds);

  if (error) {
    return { success: false, error: error.message };
  }

  await logJobEvent(jobId, "rescope_tasks_dismissed", {
    count: taskIds.length,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true };
}

export async function triggerRescope(
  jobId: string,
  photoUrls: string[],
): Promise<ActionResult<{ newTasks: string[]; count: number }>> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/ai/rescope`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, photoUrls }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "Rescope failed" };
    }

    await logJobEvent(jobId, "rescope_triggered", {
      photoCount: photoUrls.length,
      newTaskCount: data.count,
    });

    revalidatePath(`/ops/jobs/${jobId}`);
    return {
      success: true,
      data: { newTasks: data.newTasks, count: data.count },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
