"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

/**
 * TRACK 6: Add scope from an email to an existing job.
 */
export async function addScopeFromEmail(
  jobId: string,
  threadId: string | null,
  items: { description: string; quantity: number; unit_price: number }[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  if (!items.length) return { success: false, error: "No items provided" };

  // Get job to find quote_id
  const { data: job } = await supabase
    .from("jobs")
    .select("id, organization_id")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };

  // Add items as job_tasks with change_order flag
  for (const item of items) {
    await supabase.from("job_tasks").insert({
      job_id: jobId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      is_confirmed: false,
    } as any);
  }

  // Also try to add to quote_items if a quote exists
  const { data: quote } = await (supabase.from as any)("quotes")
    .select("id")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (quote) {
    for (const item of items) {
      await (supabase.from as any)("quote_items").insert({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_change_order: true,
        source_email_thread_id: threadId,
      } as any);
    }
  }

  await logJobEvent(jobId, "scope_change_added", {
    itemCount: items.length,
    source: threadId ? "email" : "manual",
    threadId,
    totalValue: items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0,
    ),
  });

  revalidatePath(`/ops/jobs/${jobId}`);
  revalidatePath(`/ops/jobs/${jobId}/scope`);
  return { success: true };
}

/**
 * Send an updated change order quote to the client.
 */
export async function sendChangeOrderQuote(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get all change order items
  const { data: changeItems } = await supabase
    .from("job_tasks")
    .select("*")
    .eq("job_id", jobId)
    .eq("is_confirmed", false);

  if (!changeItems?.length) {
    return { success: false, error: "No pending change order items" };
  }

  // Trigger the existing quote send mechanism
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/quote/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        isChangeOrder: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || "Failed to send quote" };
    }

    await logJobEvent(jobId, "change_order_quote_sent", {
      itemCount: changeItems.length,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
