"use server";

import { createClient } from "@/utils/supabase/server";

export type StatementLineItem = {
  job_id: string;
  job_number: string;
  property_address: string | null;
  status: string;
  invoice_amount: number | null;
  paid_at: string | null;
  created_at: string;
  invoiced_at: string | null;
};

export type CustomerStatement = {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  payment_terms: string | null;
  statement_date: string;
  line_items: StatementLineItem[];
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  lifetime_revenue: number;
};

export type CustomerFinancialSummary = {
  client_id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  payment_terms: string | null;
  total_jobs: number;
  paid_jobs: number;
  unpaid_jobs: number;
  total_paid: number;
  total_outstanding: number;
  lifetime_revenue: number;
  first_job_date: string | null;
  last_job_date: string | null;
};

export async function getCustomerFinancialSummaries(): Promise<
  CustomerFinancialSummary[]
> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("customer_financial_summary")
    .select("*")
    .order("lifetime_revenue", { ascending: false });

  if (error) {
    console.error("Failed to fetch customer summaries:", error);
    return [];
  }

  return (data || []) as CustomerFinancialSummary[];
}

export async function getCustomerStatement(
  clientId: string,
): Promise<CustomerStatement | null> {
  const supabase = await createClient();

  // Get client info (payment_terms added via migration, cast through any)
  const { data: client } = await (supabase as any)
    .from("clients")
    .select("id, name, email, phone, address, payment_terms")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  // Get all jobs for this client that have financial data
  const { data: jobs } = await (supabase as any)
    .from("jobs")
    .select(
      "id, job_number, property_address, status, final_invoice_amount, paid_at, created_at, invoiced_at",
    )
    .eq("client_id", clientId)
    .in("status", ["completed", "invoiced", "paid"])
    .order("created_at", { ascending: false });

  const lineItems: StatementLineItem[] = (jobs || []).map((j: any) => ({
    job_id: j.id,
    job_number: j.job_number,
    property_address: j.property_address,
    status: j.status,
    invoice_amount: j.final_invoice_amount,
    paid_at: j.paid_at,
    created_at: j.created_at,
    invoiced_at: j.invoiced_at,
  }));

  const totalInvoiced = lineItems.reduce(
    (sum, li) =>
      li.status !== "completed" ? sum + (li.invoice_amount || 0) : sum,
    0,
  );
  const totalPaid = lineItems.reduce(
    (sum, li) => (li.status === "paid" ? sum + (li.invoice_amount || 0) : sum),
    0,
  );

  return {
    client_id: client.id,
    client_name: (client as any).name,
    client_email: (client as any).email,
    client_phone: (client as any).phone,
    client_address: (client as any).address,
    payment_terms: (client as any).payment_terms,
    statement_date: new Date().toISOString().split("T")[0],
    line_items: lineItems,
    total_invoiced: totalInvoiced,
    total_paid: totalPaid,
    total_outstanding: totalInvoiced - totalPaid,
    lifetime_revenue: totalInvoiced,
  };
}
