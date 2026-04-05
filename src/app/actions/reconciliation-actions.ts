"use server";

import { createClient } from "@/utils/supabase/server";
import {
  ReconciliationAgent,
  type MatchResult,
} from "@/lib/clients/fhi/services/reconciliation-agent";
import { revalidatePath } from "next/cache";

export type ProposedMatch = MatchResult & {
  receipt: {
    id: string;
    merchant: string;
    date: string;
    total_amount: number;
    job_id?: string;
  };
  transaction: {
    id: string;
    description: string;
    date: string;
    amount: number;
  };
};

export type UnmatchedReceipt = {
  id: string;
  merchant: string;
  date: string;
  total_amount: number;
  job_id?: string;
  status: string;
};

export type UnmatchedTransaction = {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: string;
};

async function getDb() {
  return (await createClient()) as any;
}

export async function getUnmatchedItems(): Promise<{
  receipts: UnmatchedReceipt[];
  transactions: UnmatchedTransaction[];
}> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { receipts: [], transactions: [] };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { receipts: [], transactions: [] };

  // Unmatched receipts (no transaction_id)
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, merchant, date, total_amount, job_id, status")
    .eq("organization_id", profile.organization_id)
    .is("transaction_id", null)
    .order("date", { ascending: false });

  // Unmatched transactions (no receipt_id and not yet categorized to a receipt)
  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("id, description, date, amount, status")
    .eq("organization_id", profile.organization_id)
    .is("receipt_id", null)
    .order("date", { ascending: false });

  return {
    receipts: (receipts || []) as UnmatchedReceipt[],
    transactions: (transactions || []) as UnmatchedTransaction[],
  };
}

export async function runReconciliation(): Promise<ProposedMatch[]> {
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

  // Get unmatched receipts
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, merchant, date, total_amount, job_id, status")
    .eq("organization_id", profile.organization_id)
    .is("transaction_id", null);

  // Get unmatched transactions
  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("id, description, date, amount, status")
    .eq("organization_id", profile.organization_id)
    .is("receipt_id", null);

  if (!receipts?.length || !transactions?.length) return [];

  // Check for rejected matches to exclude
  const { data: rejections } = await supabase
    .from("reconciliation_rejections")
    .select("receipt_id, transaction_id")
    .eq("organization_id", profile.organization_id);

  const rejectedPairs = new Set(
    (rejections || []).map(
      (r: any) => `${r.receipt_id}:${r.transaction_id}`,
    ),
  );

  try {
    const agent = new ReconciliationAgent();
    const results = await agent.reconcile(
      transactions.map((t: any) => ({
        id: t.id,
        date: t.date,
        amount: Math.abs(t.amount),
        description: t.description,
      })),
      receipts.map((r: any) => ({
        id: r.id,
        date: r.date,
        total_amount: r.total_amount,
        merchant: r.merchant,
      })),
    );

    // Filter out rejected matches
    const filtered = results.filter(
      (m) => !rejectedPairs.has(`${m.receiptId}:${m.transactionId}`),
    );

    // Build rich match results
    const receiptMap = new Map<string, any>(receipts.map((r: any) => [r.id, r]));
    const txMap = new Map<string, any>(transactions.map((t: any) => [t.id, t]));

    return filtered
      .map((m) => {
        const receipt = receiptMap.get(m.receiptId);
        const tx = txMap.get(m.transactionId);
        if (!receipt || !tx) return null;
        return {
          ...m,
          receipt: {
            id: receipt.id,
            merchant: receipt.merchant,
            date: receipt.date,
            total_amount: receipt.total_amount,
            job_id: receipt.job_id,
          },
          transaction: {
            id: tx.id,
            description: tx.description,
            date: tx.date,
            amount: Math.abs(tx.amount),
          },
        };
      })
      .filter(Boolean) as ProposedMatch[];
  } catch (err) {
    console.error("Reconciliation failed:", err);
    return [];
  }
}

export async function approveMatch(
  receiptId: string,
  transactionId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getDb();

  // Link receipt to transaction
  const { error: e1 } = await supabase
    .from("receipts")
    .update({ transaction_id: transactionId })
    .eq("id", receiptId);

  if (e1) return { success: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("finance_transactions")
    .update({ receipt_id: receiptId })
    .eq("id", transactionId);

  if (e2) return { success: false, error: e2.message };

  revalidatePath("/ops/finance/reconciliation");
  return { success: true };
}

export async function rejectMatch(
  receiptId: string,
  transactionId: string,
): Promise<{ success: boolean; error?: string }> {
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
    return { success: false, error: "No org" };

  // Record rejection so it won't be re-proposed
  await supabase.from("reconciliation_rejections").insert({
    organization_id: profile.organization_id,
    receipt_id: receiptId,
    transaction_id: transactionId,
  });

  revalidatePath("/ops/finance/reconciliation");
  return { success: true };
}
