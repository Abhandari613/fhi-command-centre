"use server";

import { createClient } from "@/utils/supabase/server";

export type AgedReceivable = {
  job_id: string;
  job_number: string;
  title: string;
  property_address: string | null;
  final_invoice_amount: number;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  invoiced_at: string;
  days_outstanding: number;
  aging_bucket: "current" | "31-60" | "61-90" | "90+";
};

export type AgingSummary = {
  current: { count: number; total: number };
  "31-60": { count: number; total: number };
  "61-90": { count: number; total: number };
  "90+": { count: number; total: number };
  grand_total: number;
};

export async function getAgedReceivables(): Promise<AgedReceivable[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("aged_receivables")
    .select("*")
    .order("days_outstanding", { ascending: false });

  if (error) {
    console.error("Failed to fetch aged receivables:", error);
    return [];
  }

  return (data || []) as AgedReceivable[];
}

export async function getAgingSummary(): Promise<AgingSummary> {
  const receivables = await getAgedReceivables();

  const summary: AgingSummary = {
    current: { count: 0, total: 0 },
    "31-60": { count: 0, total: 0 },
    "61-90": { count: 0, total: 0 },
    "90+": { count: 0, total: 0 },
    grand_total: 0,
  };

  for (const r of receivables) {
    const bucket = r.aging_bucket;
    summary[bucket].count += 1;
    summary[bucket].total += r.final_invoice_amount;
    summary.grand_total += r.final_invoice_amount;
  }

  return summary;
}
