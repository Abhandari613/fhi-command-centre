import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId query param required" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Get client
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, email, phone, address, payment_terms")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get all financial jobs for this client
    const { data: jobs } = await supabase
      .from("jobs")
      .select(
        "id, job_number, title, property_address, status, final_invoice_amount, paid_at, created_at, invoiced_at",
      )
      .eq("client_id", clientId)
      .in("status", ["completed", "invoiced", "paid"])
      .order("created_at", { ascending: false });

    const lineItems = (jobs || []).map((j: any) => ({
      job_id: j.id,
      job_number: j.job_number,
      title: j.title,
      property_address: j.property_address,
      status: j.status,
      invoice_amount: j.final_invoice_amount,
      paid_at: j.paid_at,
      created_at: j.created_at,
      invoiced_at: j.invoiced_at,
    }));

    const totalInvoiced = lineItems.reduce(
      (sum: number, li: any) =>
        li.status !== "completed"
          ? sum + (Number(li.invoice_amount) || 0)
          : sum,
      0,
    );
    const totalPaid = lineItems.reduce(
      (sum: number, li: any) =>
        li.status === "paid" ? sum + (Number(li.invoice_amount) || 0) : sum,
      0,
    );

    const statement = {
      client,
      statement_date: new Date().toISOString().split("T")[0],
      line_items: lineItems,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      total_outstanding: totalInvoiced - totalPaid,
    };

    return NextResponse.json(statement);
  } catch (err: any) {
    console.error("Customer statement error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
