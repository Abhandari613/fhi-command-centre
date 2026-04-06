"use server";

import { createClient } from "@supabase/supabase-js";
import { pushNotification } from "@/lib/services/notifications";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type MatchResult = {
  matched: number;
  flagged: number;
  skipped: number;
  details: Array<{
    transactionId: string;
    invoiceId?: string;
    jobId?: string;
    amount: number;
    status: "matched" | "ambiguous" | "no_match";
  }>;
};

/**
 * Auto-match bank deposits to outstanding invoices.
 * Runs as a cron job or after bank statement upload.
 */
export async function autoMatchDeposits(): Promise<MatchResult> {
  const supabase = getAdminClient();
  let matched = 0;
  let flagged = 0;
  let skipped = 0;
  const details: MatchResult["details"] = [];

  // Get all unmatched deposit transactions
  const { data: deposits } = await supabase
    .from("finance_transactions")
    .select("id, amount, description, organization_id, job_id")
    .eq("status", "INGESTED")
    .gt("amount", 0)
    .is("job_id", null);

  if (!deposits?.length) {
    return { matched: 0, flagged: 0, skipped: 0, details: [] };
  }

  for (const deposit of deposits) {
    const amount = Number(deposit.amount);
    const orgId = deposit.organization_id;

    // Check if this pair was previously rejected
    const { data: rejections } = await (supabase.from as any)(
      "reconciliation_rejections",
    )
      .select("id")
      .eq("transaction_id", deposit.id)
      .limit(1);

    const rejectedInvoiceIds = new Set(
      (rejections || []).map((r: any) => r.invoice_id),
    );

    // Tolerance: 1% or $1.00, whichever is larger
    const tolerance = Math.max(amount * 0.01, 1.0);
    const minAmount = amount - tolerance;
    const maxAmount = amount + tolerance;

    // Search for matching invoices
    const { data: matchingInvoices } = await (supabase.from as any)(
      "job_invoices",
    )
      .select("id, job_id, total, invoice_number")
      .eq("organization_id", orgId)
      .eq("status", "sent")
      .gte("total", minAmount)
      .lte("total", maxAmount);

    // Filter out previously rejected matches
    const validMatches = (matchingInvoices || []).filter(
      (inv: any) => !rejectedInvoiceIds.has(inv.id),
    );

    if (validMatches.length === 1) {
      // Exact single match — auto-link
      const invoice = validMatches[0];

      // Update transaction
      await supabase
        .from("finance_transactions")
        .update({
          job_id: invoice.job_id,
          status: "CONFIRMED",
          category_id: await getSalesCategoryId(supabase, orgId),
          rationale: `Auto-matched to invoice ${invoice.invoice_number}`,
          confidence_score: 0.95,
        } as any)
        .eq("id", deposit.id);

      // Update invoice status
      await (supabase.from as any)("job_invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      // Update job status to paid
      await supabase
        .from("jobs")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        } as any)
        .eq("id", invoice.job_id);

      // Record revenue
      const { recordJobRevenue } = await import(
        "@/app/actions/finance-bridge-actions"
      );
      await recordJobRevenue(invoice.job_id, Number(invoice.total));

      // Log event
      const { logJobEvent } = await import("@/app/actions/event-actions");
      await logJobEvent(invoice.job_id, "auto_payment_matched", {
        transactionId: deposit.id,
        invoiceId: invoice.id,
        amount,
        invoiceNumber: invoice.invoice_number,
      });

      // Notify Frank
      await pushNotification({
        organizationId: orgId,
        type: "payment_matched",
        title: `Payment received — $${amount.toLocaleString()}`,
        body: `Auto-matched to invoice ${invoice.invoice_number}`,
        metadata: {
          job_id: invoice.job_id,
          transaction_id: deposit.id,
          invoice_id: invoice.id,
          amount,
        },
      });

      // Trigger post-completion
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/jobs/post-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: invoice.job_id }),
      }).catch((err) =>
        console.error("Post-completion trigger failed:", err),
      );

      matched++;
      details.push({
        transactionId: deposit.id,
        invoiceId: invoice.id,
        jobId: invoice.job_id,
        amount,
        status: "matched",
      });
    } else if (validMatches.length > 1) {
      // Ambiguous — flag for review
      await supabase
        .from("finance_transactions")
        .update({
          status: "AMBIGUOUS",
          rationale: `Multiple invoices match amount $${amount}: ${validMatches.map((i: any) => i.invoice_number).join(", ")}`,
        } as any)
        .eq("id", deposit.id);

      flagged++;
      details.push({
        transactionId: deposit.id,
        amount,
        status: "ambiguous",
      });
    } else {
      // No invoice match — try matching against jobs.final_invoice_amount
      const { data: matchingJobs } = await supabase
        .from("jobs")
        .select("id, job_number, final_invoice_amount")
        .eq("organization_id", orgId)
        .eq("status", "invoiced")
        .gte("final_invoice_amount", minAmount)
        .lte("final_invoice_amount", maxAmount);

      if (matchingJobs?.length === 1) {
        const job = matchingJobs[0];

        await supabase
          .from("finance_transactions")
          .update({
            job_id: job.id,
            status: "CONFIRMED",
            category_id: await getSalesCategoryId(supabase, orgId),
            rationale: `Auto-matched to job ${(job as any).job_number} by invoice amount`,
            confidence_score: 0.85,
          } as any)
          .eq("id", deposit.id);

        await supabase
          .from("jobs")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          } as any)
          .eq("id", job.id);

        const { logJobEvent } = await import("@/app/actions/event-actions");
        await logJobEvent(job.id, "auto_payment_matched", {
          transactionId: deposit.id,
          amount,
          matchedBy: "final_invoice_amount",
        });

        await pushNotification({
          organizationId: orgId,
          type: "payment_matched",
          title: `Payment received — $${amount.toLocaleString()}`,
          body: `Matched to job ${(job as any).job_number}`,
          metadata: { job_id: job.id, transaction_id: deposit.id, amount },
        });

        matched++;
        details.push({
          transactionId: deposit.id,
          jobId: job.id,
          amount,
          status: "matched",
        });
      } else {
        skipped++;
        details.push({
          transactionId: deposit.id,
          amount,
          status: "no_match",
        });
      }
    }
  }

  return { matched, flagged, skipped, details };
}

async function getSalesCategoryId(
  supabase: ReturnType<typeof getAdminClient>,
  orgId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("tax_categories")
    .select("id")
    .eq("name", "Sales / Revenue")
    .limit(1)
    .single();
  return data?.id || null;
}
