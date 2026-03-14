"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function getDb() {
  return (await createClient()) as any;
}

async function getSalesCategoryId(supabase: any) {
  const { data } = await supabase
    .from("tax_categories")
    .select("id")
    .eq("name", "Sales / Revenue")
    .single();
  return data?.id;
}

async function getExpenseCategoryId(supabase: any) {
  const { data } = await supabase
    .from("tax_categories")
    .select("id")
    .eq("name", "Contract Labor")
    .single();
  // Fallback to any expense category
  if (!data) {
    const { data: fallback } = await supabase
      .from("tax_categories")
      .select("id")
      .ilike("name", "%expense%")
      .limit(1)
      .single();
    return fallback?.id;
  }
  return data.id;
}

export async function recordJobRevenue(
  jobId: string,
  amount: number,
): Promise<ActionResult<{ transactionId: string }>> {
  const supabase = await getDb();
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

  const categoryId = await getSalesCategoryId(supabase);

  const { data: txn, error } = await supabase
    .from("finance_transactions")
    .insert({
      organization_id: profile.organization_id,
      amount,
      description: `Job revenue payment`,
      transaction_date: new Date().toISOString().split("T")[0],
      job_id: jobId,
      category_id: categoryId,
      status: "CONFIRMED",
      confidence_score: 1.0,
      rationale: "Auto-recorded from job completion",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logJobEvent(jobId, "revenue_recorded", {
    amount,
    transactionId: txn.id,
  });

  revalidatePath("/ops/finance");
  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true, data: { transactionId: txn.id } };
}

export async function recordSubPayout(
  jobId: string,
  subcontractorId: string,
  amount: number,
  description: string,
): Promise<ActionResult<{ payoutId: string }>> {
  const supabase = await getDb();
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

  const categoryId = await getExpenseCategoryId(supabase);

  // Create negative finance transaction
  const { data: txn, error: txnError } = await supabase
    .from("finance_transactions")
    .insert({
      organization_id: profile.organization_id,
      amount: -Math.abs(amount),
      description: `Sub payout: ${description}`,
      transaction_date: new Date().toISOString().split("T")[0],
      job_id: jobId,
      category_id: categoryId,
      status: "CONFIRMED",
      confidence_score: 1.0,
      rationale: "Sub payout recorded from job finance",
    })
    .select("id")
    .single();

  if (txnError) return { success: false, error: txnError.message };

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from("job_payouts")
    .insert({
      job_id: jobId,
      organization_id: profile.organization_id,
      subcontractor_id: subcontractorId,
      amount: Math.abs(amount),
      description,
      paid_at: new Date().toISOString(),
      finance_transaction_id: txn.id,
    })
    .select("id")
    .single();

  if (payoutError) return { success: false, error: payoutError.message };

  await logJobEvent(jobId, "sub_payout_recorded", {
    subcontractorId,
    amount,
    payoutId: payout.id,
  });

  revalidatePath("/ops/finance");
  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true, data: { payoutId: payout.id } };
}

export async function getJobProfitSummary(jobId: string) {
  const supabase = await getDb();

  const { data } = await supabase
    .from("job_profit_summary")
    .select("*")
    .eq("job_id", jobId)
    .single();

  return data;
}

export async function getCompletedJobsFinanceSummary() {
  const supabase = await getDb();
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
    .from("job_profit_summary")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("revenue", { ascending: false });

  return data || [];
}

export async function getJobPayouts(jobId: string) {
  const supabase = await getDb();

  const { data } = await supabase
    .from("job_payouts")
    .select("*, subcontractor:subcontractors(name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  return data || [];
}
