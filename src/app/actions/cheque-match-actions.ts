"use server";

import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type MatchResult = {
  lineItemId: string;
  reference: string;
  paymentAmount: number;
  status: "matched" | "discrepancy" | "not_found";
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  jobId?: string;
  jobNumber?: string;
  jobTitle?: string;
  propertyAddress?: string;
  discrepancyAmount?: number;
  discrepancyNote?: string;
};

export type ChequeMatchSummary = {
  chequeId: string;
  chequeNumber: string;
  totalAmount: number;
  matched: number;
  discrepancies: number;
  notFound: number;
  results: MatchResult[];
};

export async function matchChequeToInvoices(
  chequeId: string,
  organizationId: string,
): Promise<ChequeMatchSummary> {
  const supabase = getAdminClient();

  // 1. Get the cheque record
  const { data: cheque } = await supabase
    .from("cheque_records")
    .select("*")
    .eq("id", chequeId)
    .single();

  if (!cheque) {
    throw new Error("Cheque record not found");
  }

  // 2. Get all line items for this cheque
  const { data: lineItems } = await supabase
    .from("cheque_line_items")
    .select("*")
    .eq("cheque_id", chequeId)
    .order("created_at");

  if (!lineItems || lineItems.length === 0) {
    throw new Error("No line items found for this cheque");
  }

  // 3. Get all invoices for this org (sent or overdue — candidates for matching)
  const { data: invoices } = await supabase
    .from("job_invoices")
    .select("id, invoice_number, total, status, job_id, sent_at")
    .eq("organization_id", organizationId)
    .in("status", ["sent", "overdue", "draft"]);

  // Build lookup by invoice number
  const invoiceByNumber = new Map<string, any>();
  for (const inv of invoices || []) {
    if (inv.invoice_number) {
      invoiceByNumber.set(inv.invoice_number.toString(), inv);
    }
  }

  // 4. Get job details for matched invoices
  const jobIds = [...new Set((invoices || []).map((i: any) => i.job_id).filter(Boolean))];
  let jobMap: Record<string, any> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_number, title, property_address")
      .in("id", jobIds);
    for (const j of (jobs || []) as any[]) {
      jobMap[j.id] = j;
    }
  }

  // 5. Match each line item
  const results: MatchResult[] = [];

  for (const line of lineItems) {
    const ref = line.reference_number?.toString();
    const invoice = ref ? invoiceByNumber.get(ref) : null;

    if (!invoice) {
      // No matching invoice found
      await supabase
        .from("cheque_line_items")
        .update({ match_status: "not_found" })
        .eq("id", line.id);

      results.push({
        lineItemId: line.id,
        reference: ref || "—",
        paymentAmount: Number(line.payment_amount),
        status: "not_found",
      });
      continue;
    }

    const invoiceTotal = Number(invoice.total);
    const paymentAmount = Number(line.payment_amount);
    const discount = Number(line.discount) || 0;
    const diff = Math.abs(invoiceTotal - paymentAmount - discount);
    const hasDiscrepancy = diff > 0.01; // tolerance for rounding

    const job = invoice.job_id ? jobMap[invoice.job_id] : null;

    if (hasDiscrepancy) {
      // Discrepancy detected
      const discrepancyAmount = invoiceTotal - paymentAmount;
      const note =
        discrepancyAmount > 0
          ? `Underpaid by $${discrepancyAmount.toFixed(2)} (invoiced $${invoiceTotal.toFixed(2)}, paid $${paymentAmount.toFixed(2)})`
          : `Overpaid by $${Math.abs(discrepancyAmount).toFixed(2)} (invoiced $${invoiceTotal.toFixed(2)}, paid $${paymentAmount.toFixed(2)})`;

      await supabase
        .from("cheque_line_items")
        .update({
          matched_invoice_id: invoice.id,
          matched_job_id: invoice.job_id,
          match_status: "discrepancy",
          discrepancy_amount: discrepancyAmount,
          discrepancy_note: note,
        })
        .eq("id", line.id);

      results.push({
        lineItemId: line.id,
        reference: ref || "—",
        paymentAmount,
        status: "discrepancy",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoiceTotal,
        jobId: invoice.job_id,
        jobNumber: job?.job_number,
        jobTitle: job?.title,
        propertyAddress: job?.property_address,
        discrepancyAmount,
        discrepancyNote: note,
      });
    } else {
      // Clean match — mark invoice as paid
      await supabase
        .from("cheque_line_items")
        .update({
          matched_invoice_id: invoice.id,
          matched_job_id: invoice.job_id,
          match_status: "matched",
        })
        .eq("id", line.id);

      // Mark the invoice as paid
      await supabase
        .from("job_invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      // Mark the job as paid if it has one
      if (invoice.job_id) {
        await supabase
          .from("jobs")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoice.job_id);
      }

      results.push({
        lineItemId: line.id,
        reference: ref || "—",
        paymentAmount,
        status: "matched",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoiceTotal,
        jobId: invoice.job_id,
        jobNumber: job?.job_number,
        jobTitle: job?.title,
        propertyAddress: job?.property_address,
      });
    }
  }

  // 6. Update cheque record status
  const matched = results.filter((r) => r.status === "matched").length;
  const discrepancies = results.filter((r) => r.status === "discrepancy").length;
  const notFound = results.filter((r) => r.status === "not_found").length;

  let chequeStatus = "matched";
  if (notFound > 0 || discrepancies > 0) {
    chequeStatus = matched > 0 ? "partial_match" : "needs_review";
  }

  await supabase
    .from("cheque_records")
    .update({ status: chequeStatus, updated_at: new Date().toISOString() })
    .eq("id", chequeId);

  // 7. Push notification with summary
  const summaryParts: string[] = [];
  if (matched > 0) summaryParts.push(`${matched} paid`);
  if (discrepancies > 0) summaryParts.push(`${discrepancies} discrepancies`);
  if (notFound > 0) summaryParts.push(`${notFound} not found`);

  await pushNotification({
    organizationId,
    type: "cheque_matched",
    title: `Cheque #${cheque.cheque_number} — $${Number(cheque.total_amount).toFixed(2)}`,
    body: summaryParts.join(", "),
    metadata: {
      cheque_id: chequeId,
      cheque_number: cheque.cheque_number,
      total: cheque.total_amount,
      matched,
      discrepancies,
      not_found: notFound,
    },
  });

  return {
    chequeId,
    chequeNumber: cheque.cheque_number || "—",
    totalAmount: Number(cheque.total_amount),
    matched,
    discrepancies,
    notFound,
    results,
  };
}

/**
 * Generate a discrepancy audit for a specific property/unit and return
 * HTML suitable for emailing to Coady or whoever handles billing.
 */
export async function generatePaymentAudit(
  organizationId: string,
  filters: { propertyAddress?: string; jobId?: string },
): Promise<{ subject: string; html: string; summary: string }> {
  const supabase = getAdminClient();

  // Get invoices matching the filter
  let query = supabase
    .from("job_invoices")
    .select("id, invoice_number, total, status, paid_at, sent_at, job_id")
    .eq("organization_id", organizationId);

  let jobs: any[] = [];
  if (filters.jobId) {
    query = query.eq("job_id", filters.jobId);
    const { data } = await supabase.from("jobs").select("*").eq("id", filters.jobId);
    jobs = data || [];
  } else if (filters.propertyAddress) {
    const { data: matchedJobs } = await supabase
      .from("jobs")
      .select("id, job_number, title, property_address, status")
      .eq("organization_id", organizationId)
      .ilike("property_address", `%${filters.propertyAddress}%`);
    jobs = matchedJobs || [];
    if (jobs.length > 0) {
      query = query.in("job_id", jobs.map((j: any) => j.id));
    }
  }

  const { data: invoices } = await query.order("sent_at", { ascending: true });
  if (!invoices || invoices.length === 0) {
    return { subject: "No invoices found", html: "", summary: "No invoices found for the given filter." };
  }

  const jobMap: Record<string, any> = {};
  for (const j of jobs) jobMap[j.id] = j;

  // Get cheque line items matched to these invoices
  const invoiceIds = invoices.map((i: any) => i.id);
  const { data: chequeLines } = await supabase
    .from("cheque_line_items")
    .select("*, cheque_records!inner(cheque_number, cheque_date, payer)")
    .in("matched_invoice_id", invoiceIds);

  const chequeByInvoice = new Map<string, any>();
  for (const cl of chequeLines || []) {
    chequeByInvoice.set(cl.matched_invoice_id, cl);
  }

  // Build audit
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalPaid = (chequeLines || []).reduce((s: number, c: any) => s + Number(c.payment_amount), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const propertyLabel = filters.propertyAddress || jobs[0]?.property_address || "All Properties";

  const rows = invoices.map((inv: any) => {
    const job = inv.job_id ? jobMap[inv.job_id] : null;
    const chequeLine = chequeByInvoice.get(inv.id);
    const paid = chequeLine ? Number(chequeLine.payment_amount) : 0;
    const diff = Number(inv.total) - paid;

    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${inv.invoice_number || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${job?.property_address || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${job?.title || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">$${Number(inv.total).toFixed(2)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">$${paid.toFixed(2)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:${diff > 0.01 ? "#dc2626" : "#16a34a"};">${diff > 0.01 ? `$${diff.toFixed(2)}` : "Paid"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${chequeLine ? `#${(chequeLine as any).cheque_records?.cheque_number}` : "—"}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:800px;margin:0 auto;">
      <h2 style="color:#ff6b00;">Payment Audit — ${propertyLabel}</h2>
      <p style="color:#666;">Generated ${new Date().toLocaleDateString("en-CA")} by FHI Command Centre</p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;">Invoice #</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;">Property</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;">Job</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #ddd;">Invoiced</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #ddd;">Paid</th>
            <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #ddd;">Balance</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;">Cheque</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#f8f8f8;">
            <td colspan="3" style="padding:8px 10px;">Totals</td>
            <td style="padding:8px 10px;text-align:right;">$${totalInvoiced.toFixed(2)}</td>
            <td style="padding:8px 10px;text-align:right;">$${totalPaid.toFixed(2)}</td>
            <td style="padding:8px 10px;text-align:right;color:${totalOutstanding > 0.01 ? "#dc2626" : "#16a34a"};">
              ${totalOutstanding > 0.01 ? `$${totalOutstanding.toFixed(2)}` : "Settled"}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <p style="color:#999;font-size:11px;margin-top:24px;">Frank's Home Improvement — Payment Audit Report</p>
    </div>
  `;

  const summary = totalOutstanding > 0.01
    ? `${invoices.length} invoices totalling $${totalInvoiced.toFixed(2)} — $${totalPaid.toFixed(2)} paid, $${totalOutstanding.toFixed(2)} outstanding`
    : `${invoices.length} invoices totalling $${totalInvoiced.toFixed(2)} — fully settled`;

  return {
    subject: `Payment Audit — ${propertyLabel} — ${totalOutstanding > 0.01 ? `$${totalOutstanding.toFixed(2)} outstanding` : "Settled"}`,
    html,
    summary,
  };
}
