import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    // Get job
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, address, organization_id, status",
      )
      .eq("id", jobId)
      .single();

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Get confirmed tasks with prices
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("id, description, quantity, unit_price")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    if (!tasks?.length) {
      return NextResponse.json(
        { error: "No confirmed tasks to invoice" },
        { status: 400 },
      );
    }

    const revenue = (tasks as any[]).reduce(
      (sum, t) => sum + (t.quantity || 1) * (t.unit_price || 0),
      0,
    );

    // Get sub payouts (costs)
    const { data: payouts } = await supabase
      .from("job_payouts")
      .select("amount")
      .eq("job_id", jobId);

    const costs = (payouts || []).reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    );
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Check margin and warn if low
    if (margin < 10) {
      await pushNotification({
        organizationId: (job as any).organization_id,
        type: "margin_warning",
        title: `Low margin alert: ${(job as any).job_number} at ${margin.toFixed(0)}%`,
        body: `Revenue: $${revenue.toFixed(0)}, Costs: $${costs.toFixed(0)}, Profit: $${profit.toFixed(0)}. Review before invoicing.`,
        metadata: {
          job_id: jobId,
          job_number: (job as any).job_number,
          revenue,
          costs,
          profit,
          margin: Math.round(margin),
        },
      });
    } else if (margin < 20) {
      await pushNotification({
        organizationId: (job as any).organization_id,
        type: "margin_warning",
        title: `${(job as any).job_number} margin is ${margin.toFixed(0)}% — below target`,
        body: `Revenue: $${revenue.toFixed(0)}, Costs: $${costs.toFixed(0)}. Target is 20%+.`,
        metadata: {
          job_id: jobId,
          job_number: (job as any).job_number,
          margin: Math.round(margin),
        },
      });
    }

    // Generate invoice data
    const invoiceData = {
      job_id: jobId,
      job_number: (job as any).job_number,
      property_address: (job as any).property_address || (job as any).address,
      line_items: (tasks as any[]).map((t) => ({
        description: t.description,
        quantity: t.quantity || 1,
        unit_price: t.unit_price || 0,
        total: (t.quantity || 1) * (t.unit_price || 0),
      })),
      subtotal: revenue,
      total: revenue,
      profit_summary: {
        revenue,
        costs,
        profit,
        margin: Math.round(margin),
        health: margin >= 20 ? "green" : margin >= 10 ? "yellow" : "red",
      },
      generated_at: new Date().toISOString(),
    };

    // Update job status to invoiced
    await supabase
      .from("jobs")
      .update({ status: "invoiced" } as any)
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    });
  } catch (err: any) {
    console.error("Invoice generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
