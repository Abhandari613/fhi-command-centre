"use server";

import { revalidatePath } from "next/cache";

export type InvoiceData = {
  job_id: string;
  job_number: string;
  property_address: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  total: number;
  profit_summary: {
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
    health: "green" | "yellow" | "red";
  };
  generated_at: string;
};

export async function generateInvoice(
  jobId: string,
): Promise<{ success: boolean; invoice?: InvoiceData; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/jobs/generate-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    revalidatePath("/dashboard");
    revalidatePath(`/ops/jobs/${jobId}`);
    revalidatePath("/ops/finance");

    return { success: true, invoice: data.invoice };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
