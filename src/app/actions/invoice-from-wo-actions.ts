"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * TRACK 4: Create an invoice from a work order's tasks.
 */
export async function createInvoiceFromWorkOrder(workOrderId: string): Promise<{
  success: boolean;
  invoiceId?: string;
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

  // Get work order with tasks and client
  const { data: wo } = await (supabase.from as any)("work_orders")
    .select("*, work_order_tasks(*), clients(*)")
    .eq("id", workOrderId)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };

  // Build line items from tasks
  const lineItems = (wo.work_order_tasks || []).map((task: any) => ({
    description: `${task.trade_type || "General"}: ${task.description || "Work performed"}`,
    quantity: 1,
    unit_price: task.cost_estimate || 0,
    total: task.cost_estimate || 0,
  }));

  const subtotal = lineItems.reduce(
    (sum: number, item: any) => sum + item.total,
    0,
  );
  const tax = Math.round(subtotal * 0.13 * 100) / 100; // Ontario HST
  const total = subtotal + tax;

  // Get billing contact
  let billingContactId = wo.billing_contact_id || null;
  let billingContact = null;
  if (billingContactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", billingContactId)
      .single();
    billingContact = contact;
  }

  // Generate invoice number
  const invoiceNumber = "INV-" + Date.now();

  // Create invoice
  const { data: invoice, error: insertError } = await (supabase.from as any)("job_invoices")
    .insert({
      organization_id: profile.organization_id,
      job_id: wo.job_id || workOrderId,
      work_order_id: workOrderId,
      invoice_number: invoiceNumber,
      billing_contact_id: billingContactId,
      line_items: lineItems,
      subtotal,
      tax,
      total,
      status: "draft",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    } as any)
    .select("id")
    .single();

  if (insertError || !invoice) {
    return {
      success: false,
      error: "Failed to create invoice: " + insertError?.message,
    };
  }

  // Update job status to invoiced if linked
  if (wo.job_id) {
    await supabase
      .from("jobs")
      .update({
        status: "invoiced",
        final_invoice_amount: total,
        invoiced_at: new Date().toISOString(),
      } as any)
      .eq("id", wo.job_id);

    await logJobEvent(wo.job_id, "invoice_created", {
      invoiceId: invoice.id,
      invoiceNumber,
      total,
    });
  }

  revalidatePath("/ops/finance");
  revalidatePath(`/ops/work-orders/${workOrderId}`);
  return { success: true, invoiceId: invoice.id };
}

/**
 * Send an invoice via email.
 */
export async function sendInvoice(invoiceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get invoice with details
  const { data: invoice } = await (supabase.from as any)("job_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { success: false, error: "Invoice not found" };

  // Get billing contact email
  let recipientEmail = "";
  if ((invoice as any).billing_contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, name")
      .eq("id", (invoice as any).billing_contact_id)
      .single();
    recipientEmail = contact?.email || "";
  }

  if (!recipientEmail) {
    // Fallback: get client email from the job
    const { data: job } = await supabase
      .from("jobs")
      .select("clients(email)")
      .eq("id", (invoice as any).job_id)
      .single();
    recipientEmail = (job as any)?.clients?.email || "";
  }

  if (!recipientEmail) {
    return { success: false, error: "No billing email found" };
  }

  // Build invoice HTML
  const lineItems = ((invoice as any).line_items || []) as any[];
  const lineItemsHtml = lineItems
    .map(
      (item: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;">${item.description}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right;">$${item.total.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
        <h1 style="margin:0;color:#ff6b00;">Invoice ${(invoice as any).invoice_number}</h1>
        <p style="margin:4px 0 0;opacity:0.6;">Frank's Home Improvement</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="border-bottom:2px solid #333;">
            <th style="padding:8px;text-align:left;color:#999;">Description</th>
            <th style="padding:8px;text-align:right;color:#999;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
        <tfoot>
          <tr><td style="padding:8px;font-weight:bold;">Subtotal</td><td style="padding:8px;text-align:right;">$${(invoice as any).subtotal.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">HST (13%)</td><td style="padding:8px;text-align:right;">$${(invoice as any).tax.toFixed(2)}</td></tr>
          <tr style="border-top:2px solid #ff6b00;">
            <td style="padding:12px 8px;font-weight:bold;font-size:18px;color:#ff6b00;">Total Due</td>
            <td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:18px;color:#ff6b00;">$${(invoice as any).total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="opacity:0.6;font-size:14px;">Payment due by ${new Date((invoice as any).due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      <p style="opacity:0.6;font-size:14px;">Please send e-transfer to frank@fhi.ca</p>
    </div>
  `;

  try {
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: "FHI Invoicing <invoices@fhi.ca>",
      to: recipientEmail,
      subject: `Invoice ${(invoice as any).invoice_number} — Frank's Home Improvement`,
      html,
    });

    if (sendError) {
      return { success: false, error: sendError.message };
    }

    // Log the send
    await (supabase.from as any)("invoice_send_log").insert({
      invoice_id: invoiceId,
      sent_to: recipientEmail,
      method: "email",
      resend_message_id: sendResult?.id || null,
    } as any);

    // Update invoice status
    await (supabase.from as any)("job_invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if ((invoice as any).job_id) {
      await logJobEvent((invoice as any).job_id, "invoice_sent", {
        invoiceId,
        to: recipientEmail,
      });
    }

    revalidatePath("/ops/finance");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get invoices for a job.
 */
export async function getJobInvoices(jobId: string) {
  const supabase = await createClient();

  const { data } = await (supabase.from as any)("job_invoices")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  return data || [];
}
