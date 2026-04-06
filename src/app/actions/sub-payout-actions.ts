"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * TRACK 8: Get pending sub payouts grouped by subcontractor.
 */
export async function getSubPayoutDashboard(): Promise<{
  groups: {
    subcontractor_id: string;
    subcontractor_name: string;
    payouts: any[];
    total_pending: number;
  }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { groups: [] };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { groups: [] };

  const { data: payouts } = await (supabase.from as any)("sub_payouts")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .in("status", ["pending_payout", "approved"])
    .order("created_at", { ascending: false });

  if (!payouts?.length) return { groups: [] };

  // Get subcontractor names
  const subIds = [...new Set(payouts.map((p: any) => p.subcontractor_id))];
  const { data: subs } = await (supabase.from as any)("subcontractors")
    .select("id, name")
    .in("id", subIds);

  const subMap = new Map<string, string>(
    (subs || []).map((s: any) => [s.id, s.name] as [string, string]),
  );

  // Group by subcontractor
  const grouped = new Map<string, any[]>();
  for (const p of payouts as any[]) {
    const key = p.subcontractor_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const groups = Array.from(grouped.entries()).map(([subId, payoutList]) => ({
    subcontractor_id: subId,
    subcontractor_name: subMap.get(subId) || "Unknown Sub",
    payouts: payoutList,
    total_pending: payoutList.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    ),
  }));

  return { groups };
}

/**
 * Record a payment to a subcontractor.
 */
export async function recordSubPayment(
  payoutId: string,
  paymentDetails: {
    payment_method: string;
    payment_reference: string;
    amount?: number;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await (supabase.from as any)("sub_payouts")
    .update({
      status: "paid",
      payment_method: paymentDetails.payment_method,
      payment_reference: paymentDetails.payment_reference,
      paid_at: new Date().toISOString(),
    })
    .eq("id", payoutId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance/payouts");
  return { success: true };
}

/**
 * Queue a sub payout from a completed task.
 */
export async function queueSubPayout(taskId: string): Promise<{
  success: boolean;
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

  const { data: task } = await (supabase.from as any)("work_order_tasks")
    .select("id, work_order_id, subcontractor_id, cost_estimate")
    .eq("id", taskId)
    .single();

  if (!task || !task.subcontractor_id) {
    return { success: false, error: "Task has no subcontractor assigned" };
  }

  const { data: wo } = await (supabase.from as any)("work_orders")
    .select("job_id")
    .eq("id", task.work_order_id)
    .single();

  const { error } = await (supabase.from as any)("sub_payouts").upsert(
    {
      organization_id: profile.organization_id,
      subcontractor_id: task.subcontractor_id,
      work_order_task_id: taskId,
      job_id: wo?.job_id || null,
      amount: task.cost_estimate || 0,
      status: "pending_payout",
    } as any,
    { onConflict: "work_order_task_id" },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance/payouts");
  return { success: true };
}
