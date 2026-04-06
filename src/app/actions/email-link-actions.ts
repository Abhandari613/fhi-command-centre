"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

/**
 * Link an email thread to a job.
 */
export async function linkEmailToJob(
  threadId: string,
  jobId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  // Get gmail_thread_id for denormalization
  const { data: thread } = await (supabase.from as any)("email_threads")
    .select("gmail_thread_id")
    .eq("id", threadId)
    .single();

  // Insert link (upsert to handle duplicates)
  const { error } = await (supabase.from as any)("job_email_links").upsert(
    {
      job_id: jobId,
      thread_id: threadId,
      gmail_thread_id: thread?.gmail_thread_id || null,
      linked_by: user.id,
    } as any,
    { onConflict: "job_id,thread_id" },
  );

  if (error) return { success: false, error: error.message };

  // Also update email_threads.job_id for backward compat
  await (supabase.from as any)("email_threads")
    .update({ job_id: jobId })
    .eq("id", threadId);

  await logJobEvent(jobId, "email_linked", {
    threadId,
    gmailThreadId: thread?.gmail_thread_id,
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  revalidatePath("/inbox");
  return { success: true };
}

/**
 * Unlink an email thread from a job.
 */
export async function unlinkEmailFromJob(
  threadId: string,
  jobId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await (supabase.from as any)("job_email_links")
    .delete()
    .eq("job_id", jobId)
    .eq("thread_id", threadId);

  if (error) return { success: false, error: error.message };

  // Clear the email_threads.job_id if it pointed to this job
  await (supabase.from as any)("email_threads")
    .update({ job_id: null })
    .eq("id", threadId)
    .eq("job_id", jobId);

  revalidatePath(`/ops/jobs/${jobId}`);
  revalidatePath("/inbox");
  return { success: true };
}

/**
 * Get all emails linked to a job.
 */
export async function getJobEmails(jobId: string): Promise<
  {
    id: string;
    gmail_thread_id: string;
    subject: string;
    snippet: string;
    last_message_date: string;
    participants: string[];
    message_count: number;
    linked_at: string;
  }[]
> {
  const supabase = await createClient();

  const { data } = await (supabase.from as any)("job_email_links")
    .select(
      `
      linked_at,
      email_threads (
        id,
        gmail_thread_id,
        subject,
        snippet,
        last_message_date,
        participants,
        message_count
      )
    `,
    )
    .eq("job_id", jobId)
    .order("linked_at", { ascending: false });

  return (data || []).map((link: any) => ({
    id: link.email_threads?.id || "",
    gmail_thread_id: link.email_threads?.gmail_thread_id || "",
    subject: link.email_threads?.subject || "(no subject)",
    snippet: link.email_threads?.snippet || "",
    last_message_date: link.email_threads?.last_message_date || "",
    participants: link.email_threads?.participants || [],
    message_count: link.email_threads?.message_count || 0,
    linked_at: link.linked_at,
  }));
}

/**
 * Search jobs for linking (fuzzy search by job number, client name, address).
 */
export async function searchJobsForLinking(query: string): Promise<
  {
    id: string;
    job_number: string;
    title: string;
    property_address: string;
    status: string;
    client_name: string;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  const searchTerm = `%${query}%`;

  const { data } = await supabase
    .from("jobs")
    .select("id, job_number, title, property_address, status, clients(name)")
    .eq("organization_id", profile.organization_id)
    .or(
      `job_number.ilike.${searchTerm},title.ilike.${searchTerm},property_address.ilike.${searchTerm}`,
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(10);

  return (data || []).map((j: any) => ({
    id: j.id,
    job_number: j.job_number || "",
    title: j.title || "",
    property_address: j.property_address || "",
    status: j.status,
    client_name: j.clients?.name || "",
  }));
}

/**
 * Suggest matching jobs for an email thread based on sender + content.
 */
export async function suggestJobsForThread(
  threadId: string,
): Promise<
  { id: string; job_number: string; title: string; confidence: number }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  // Get thread details
  const { data: thread } = await (supabase.from as any)("email_threads")
    .select("subject, snippet, participants")
    .eq("id", threadId)
    .single();

  if (!thread) return [];

  // Get active jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_number, title, property_address, status, requester_email")
    .eq("organization_id", profile.organization_id)
    .not("status", "in", '("paid","cancelled")')
    .order("created_at", { ascending: false })
    .limit(20);

  if (!jobs?.length) return [];

  const suggestions: {
    id: string;
    job_number: string;
    title: string;
    confidence: number;
  }[] = [];

  const threadText =
    `${thread.subject || ""} ${thread.snippet || ""}`.toLowerCase();
  const participants = (thread.participants || []).map((p: string) =>
    p.toLowerCase(),
  );

  for (const job of jobs) {
    let score = 0;

    // Check if any participant matches the job requester
    if (
      (job as any).requester_email &&
      participants.some((p: string) =>
        p.includes((job as any).requester_email.toLowerCase()),
      )
    ) {
      score += 50;
    }

    // Check address keyword overlap
    const jobAddress = (job.property_address || "").toLowerCase();
    if (jobAddress) {
      const addressWords = jobAddress
        .split(/[\s,]+/)
        .filter((w: string) => w.length > 3);
      for (const word of addressWords) {
        if (threadText.includes(word)) score += 15;
      }
    }

    // Check title keyword overlap
    const jobTitle = (job.title || "").toLowerCase();
    const titleWords = jobTitle
      .split(/[\s—-]+/)
      .filter((w: string) => w.length > 3);
    for (const word of titleWords) {
      if (threadText.includes(word)) score += 10;
    }

    if (score > 20) {
      suggestions.push({
        id: job.id,
        job_number: job.job_number || "",
        title: job.title || "",
        confidence: Math.min(score, 100),
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}
