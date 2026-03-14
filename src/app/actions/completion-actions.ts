"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Helper: cast supabase to any for tables not yet in generated types
// (completion_reports, task_photo_links, punch_list_items)
// Regenerate types after running migrations to remove these casts.
async function getDb() {
  return (await createClient()) as any;
}

export async function createCompletionReport(
  jobId: string,
): Promise<ActionResult<{ reportId: string }>> {
  const supabase = await getDb();

  // Get job's org
  const { data: job } = await supabase
    .from("jobs")
    .select("organization_id")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };

  // Check if draft report already exists
  const { data: existing } = await supabase
    .from("completion_reports")
    .select("id")
    .eq("job_id", jobId)
    .eq("status", "draft")
    .single();

  if (existing) {
    return { success: true, data: { reportId: existing.id } };
  }

  const { data: report, error } = await supabase
    .from("completion_reports")
    .insert({
      job_id: jobId,
      organization_id: job.organization_id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logJobEvent(jobId, "completion_report_created", {
    reportId: report.id,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true, data: { reportId: report.id } };
}

export async function getCompletionReport(jobId: string) {
  const supabase = await getDb();

  const { data: report } = await supabase
    .from("completion_reports")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return report;
}

export async function linkPhotoToTask(
  taskId: string,
  photoId: string,
): Promise<ActionResult<void>> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("task_photo_links").insert({
    task_id: taskId,
    photo_id: photoId,
    linked_by: user?.id,
  });

  if (error) {
    if (error.code === "23505") {
      // Already linked
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function unlinkPhotoFromTask(
  taskId: string,
  photoId: string,
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  const { error } = await supabase
    .from("task_photo_links")
    .delete()
    .eq("task_id", taskId)
    .eq("photo_id", photoId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getReconciliationStatus(jobId: string) {
  const supabase = await getDb();

  // Get all confirmed tasks
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("id, description, quantity, unit_price")
    .eq("job_id", jobId)
    .eq("is_confirmed", true);

  if (!tasks) return { total: 0, linked: 0, unlinked: 0, tasks: [] };

  // Get all links for these tasks
  const taskIds = tasks.map((t: any) => t.id);
  const { data: links } = await supabase
    .from("task_photo_links")
    .select("task_id, photo_id")
    .in("task_id", taskIds);

  const linkedTaskIds = new Set((links || []).map((l: any) => l.task_id));

  const enrichedTasks = tasks.map((t: any) => ({
    ...t,
    hasPhoto: linkedTaskIds.has(t.id),
    photoCount: (links || []).filter((l: any) => l.task_id === t.id).length,
  }));

  return {
    total: tasks.length,
    linked: enrichedTasks.filter((t: any) => t.hasPhoto).length,
    unlinked: enrichedTasks.filter((t: any) => !t.hasPhoto).length,
    tasks: enrichedTasks,
  };
}

export async function getCompletionPhotos(jobId: string) {
  const supabase = await getDb();

  const { data: photos } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", jobId)
    .in("type", ["completion", "after", "other"])
    .order("created_at", { ascending: false });

  return photos || [];
}

export async function sendCompletionReport(
  reportId: string,
  emails: string[],
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  // Get report + job
  const { data: report } = await supabase
    .from("completion_reports")
    .select("*, jobs(id, job_number, property_address, address)")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };

  const jobId = (report as any).job_id;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/completion/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, reportId, recipientEmails: emails }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || "Send failed" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // Update report
  await supabase
    .from("completion_reports")
    .update({
      status: "sent",
      sent_to: emails,
      sent_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  await logJobEvent(jobId, "completion_report_sent", {
    reportId,
    recipients: emails,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true };
}

export async function approveCompletion(
  reportId: string,
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  const { data: report } = await supabase
    .from("completion_reports")
    .select("job_id")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };

  await supabase
    .from("completion_reports")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // Advance job to completed (verified), then auto-invoice (step 9)
  await supabase
    .from("jobs")
    .update({ status: "completed" })
    .eq("id", report.job_id);

  await logJobEvent(report.job_id, "completion_approved", { reportId });

  // Step 9: Auto-generate invoice with margin check
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/jobs/generate-invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: report.job_id }),
  }).catch((err) => console.error("Auto-invoice trigger failed:", err));

  revalidatePath(`/ops/jobs/${report.job_id}`);
  revalidatePath(`/portal/${report.job_id}`);
  return { success: true };
}

export async function addPunchListItems(
  reportId: string,
  jobId: string,
  items: { description: string; photoUrl?: string }[],
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  // Update report status
  await supabase
    .from("completion_reports")
    .update({ status: "punch_list" })
    .eq("id", reportId);

  // Insert punch list items
  const rows = items.map((item) => ({
    completion_report_id: reportId,
    job_id: jobId,
    description: item.description,
    photo_url: item.photoUrl || null,
    status: "open",
  }));

  const { error } = await supabase.from("punch_list_items").insert(rows);

  if (error) return { success: false, error: error.message };

  await logJobEvent(jobId, "punch_list_created", {
    reportId,
    itemCount: items.length,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true };
}

export async function getPunchListItems(jobId: string) {
  const supabase = await getDb();

  const { data } = await supabase
    .from("punch_list_items")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at");

  return data || [];
}

export async function resolvePunchListItem(
  itemId: string,
  photoId: string,
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  const { error } = await supabase
    .from("punch_list_items")
    .update({
      status: "resolved",
      resolved_photo_id: photoId,
    })
    .eq("id", itemId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
