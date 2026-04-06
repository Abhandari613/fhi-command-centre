"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

export type DraftReviewData = {
  id: string;
  client_name: string | null;
  property_address_or_unit: string | null;
  trade_type: string | null;
  description: string | null;
  raw_content: string | null;
  source: string | null;
  status: string;
  created_at: string;
  email_thread_id: string | null;
  converted_job_id: string | null;
};

/**
 * Get all unconverted drafts for review.
 */
export async function getUnconvertedDrafts(): Promise<DraftReviewData[]> {
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

  const { data } = await supabase
    .from("work_order_drafts")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .in("status", ["pending", "needs_review"])
    .is("converted_job_id", null)
    .order("created_at", { ascending: false });

  return (data || []) as unknown as DraftReviewData[];
}

/**
 * Get a single draft for detailed review.
 */
export async function reviewDraft(
  draftId: string,
): Promise<DraftReviewData | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_order_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  return (data as unknown as DraftReviewData) || null;
}

/**
 * Convert a draft to a full job with optional edits.
 */
export async function convertDraftToJob(
  draftId: string,
  edits: {
    client_name?: string;
    property_address?: string;
    description?: string;
    trade_type?: string;
    tasks?: { description: string; quantity: number; unit_price: number }[];
  },
): Promise<{
  success: boolean;
  jobId?: string;
  jobNumber?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id)
    return { success: false, error: "No organization" };

  const orgId = profile.organization_id;

  // 1. Fetch the draft
  const { data: draft } = await supabase
    .from("work_order_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (!draft) return { success: false, error: "Draft not found" };

  // 2. Resolve client
  const clientName =
    edits.client_name || (draft as any).client_name || "Unknown Client";
  let clientId: string | null = null;

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("name", clientName)
    .limit(1)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        organization_id: orgId,
        name: clientName,
        type: "Property Manager",
      })
      .select("id")
      .single();
    clientId = newClient?.id || null;
  }

  if (!clientId) {
    const { data: fallback } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .single();
    clientId = fallback?.id || null;
  }

  // 3. Detect urgency
  const RUSH_KEYWORDS = [
    "rush",
    "asap",
    "urgent",
    "emergency",
    "immediately",
  ];
  const text =
    `${edits.property_address || ""} ${edits.description || ""} ${(draft as any).raw_content || ""}`.toLowerCase();
  const urgency = RUSH_KEYWORDS.some((kw) => text.includes(kw))
    ? "rush"
    : "standard";

  const propertyAddress =
    edits.property_address ||
    (draft as any).property_address_or_unit ||
    "Unknown";
  const description =
    edits.description || (draft as any).description || "";
  const tradeType = edits.trade_type || (draft as any).trade_type || "General";

  // 4. Create job
  const { data: newJob, error: jobError } = await supabase
    .from("jobs")
    .insert({
      organization_id: orgId,
      client_id: clientId,
      title: `${tradeType} — ${propertyAddress}`,
      description,
      status: "incoming",
      urgency,
      property_address: propertyAddress,
      address: propertyAddress,
      requester_name: clientName,
      source_email_subject:
        ((draft as any).raw_content || "").split("\n")[0] || null,
      source_email_body: (draft as any).raw_content || null,
    } as any)
    .select("id, job_number")
    .single();

  if (jobError || !newJob) {
    return {
      success: false,
      error: "Failed to create job: " + jobError?.message,
    };
  }

  // 5. Create tasks/quote items
  const tasks = edits.tasks || [
    { description: `${tradeType}: ${description}`, quantity: 1, unit_price: 0 },
  ];

  for (const task of tasks) {
    await supabase.from("job_tasks").insert({
      job_id: newJob.id,
      description: task.description,
      quantity: task.quantity,
      unit_price: task.unit_price,
      is_confirmed: false,
    } as any);
  }

  // 6. Link email thread if present
  if ((draft as any).email_thread_id) {
    await (supabase.from as any)("job_email_links").insert({
      job_id: newJob.id,
      thread_id: (draft as any).email_thread_id,
      linked_by: user.id,
    } as any);

    // Also update the email_threads.job_id for backward compat
    await (supabase.from as any)("email_threads")
      .update({ job_id: newJob.id })
      .eq("id", (draft as any).email_thread_id);
  }

  // 7. Update draft
  await supabase
    .from("work_order_drafts")
    .update({
      status: "converted",
      converted_job_id: newJob.id,
    } as any)
    .eq("id", draftId);

  // 8. Log event
  await logJobEvent(newJob.id, "job_created_from_draft", {
    draftId,
    source: (draft as any).source,
  });

  revalidatePath("/ops/work-orders");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");

  return {
    success: true,
    jobId: newJob.id,
    jobNumber: (newJob as any).job_number,
  };
}

/**
 * Get count of unconverted drafts (for badge).
 */
export async function getUnconvertedDraftCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return 0;

  const { count } = await supabase
    .from("work_order_drafts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .in("status", ["pending", "needs_review"])
    .is("converted_job_id", null);

  return count || 0;
}
