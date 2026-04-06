"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

import {
  JobStatus,
  canTransition,
  checkConstraints,
} from "@/lib/fsm/job-state";

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  // 1. Fetch current job state
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Job not found" };
  }

  // 2. Validate Transition
  if (!canTransition(job.status as JobStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition from ${job.status} to ${newStatus}`,
    };
  }

  // 3. Check Business Constraints
  const constraintError = checkConstraints(job, newStatus);
  if (constraintError) {
    return { success: false, error: constraintError };
  }

  // 4. Update
  const { error: updateError } = await supabase
    .from("jobs")
    .update({ status: newStatus })
    .eq("id", jobId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 5. Log & Revalidate
  await logJobEvent(jobId, `status_change`, {
    from: job.status,
    to: newStatus,
  });

  // 6. Side effects on status change
  if (newStatus === "completed") {
    await logJobEvent(jobId, "status_completed", {
      note: "Job marked complete — build completion report next",
    });

    // AUTOMATION 10: End-of-Job Autopilot
    try {
      const completedSteps: string[] = [];
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      const orgId = profile?.organization_id;

      // Step 1: Auto-invoice — find linked work order and create invoice
      const { data: linkedWO } = await (supabase.from as any)("work_orders")
        .select("id, billing_contact_id")
        .eq("job_id", jobId)
        .limit(1)
        .maybeSingle();

      if (linkedWO) {
        // Check org auto_invoice setting
        let autoInvoice = true;
        if (orgId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("auto_invoice")
            .eq("id", orgId)
            .single();
          autoInvoice = (org as any)?.auto_invoice !== false;
        }

        // Check if invoice already exists
        const { data: existingInv } = await (supabase.from as any)("job_invoices")
          .select("id")
          .eq("work_order_id", linkedWO.id)
          .limit(1)
          .maybeSingle();

        if (!existingInv) {
          const { createInvoiceFromWorkOrder, sendInvoice } = await import(
            "@/app/actions/invoice-from-wo-actions"
          );
          const invResult = await createInvoiceFromWorkOrder(linkedWO.id);
          if (invResult.success && invResult.invoiceId) {
            completedSteps.push("invoice_created");
            if (autoInvoice && linkedWO.billing_contact_id) {
              const sendResult = await sendInvoice(invResult.invoiceId);
              if (sendResult.success) completedSteps.push("invoice_sent");
            }
          }
        }
      }

      // Step 2: Share photos if job has any
      const { data: photos } = await (supabase.from as any)("job_photos")
        .select("id")
        .eq("job_id", jobId);

      if (photos?.length) {
        const photoIds = photos.map((p: any) => p.id);
        const { sharePhotosWithClient } = await import(
          "@/app/actions/photo-share-actions"
        );
        const shareResult = await sharePhotosWithClient(jobId, photoIds);
        if (shareResult.success) completedSteps.push("photos_shared");
      }

      // Steps 3 & 4: Post-completion + status email are already triggered below

      // Log autopilot
      if (completedSteps.length > 0) {
        await logJobEvent(jobId, "autopilot_completed", {
          steps: completedSteps,
        });

        if (orgId) {
          const { pushNotification } = await import("@/lib/services/notifications");
          const { data: invInfo } = await (supabase.from as any)("job_invoices")
            .select("total")
            .eq("job_id", jobId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          await pushNotification({
            organizationId: orgId,
            type: "autopilot_completed",
            title: `Job completed — autopilot ran ${completedSteps.length} step${completedSteps.length > 1 ? "s" : ""}`,
            body: `${job.property_address || job.title}${invInfo ? ` — $${Number((invInfo as any).total).toLocaleString()}` : ""}`,
            metadata: {
              job_id: jobId,
              steps: completedSteps,
            },
          });
        }
      }
    } catch (autopilotErr) {
      console.error("End-of-job autopilot error:", autopilotErr);
      // Non-blocking — job still completes even if autopilot fails
    }
  }

  if (newStatus === "invoiced") {
    // Calculate final invoice amount from confirmed tasks
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("quantity, unit_price")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    const total = (tasks || []).reduce(
      (sum: number, t: any) => sum + Number(t.quantity) * Number(t.unit_price),
      0,
    );

    if (total > 0) {
      await supabase
        .from("jobs")
        .update({
          final_invoice_amount: total,
          invoiced_at: new Date().toISOString(),
        } as any)
        .eq("id", jobId);
    } else {
      await supabase
        .from("jobs")
        .update({ invoiced_at: new Date().toISOString() } as any)
        .eq("id", jobId);
    }
  }

  if (newStatus === "paid") {
    await supabase
      .from("jobs")
      .update({ paid_at: new Date().toISOString() } as any)
      .eq("id", jobId);

    if (
      (job as any).final_invoice_amount &&
      Number((job as any).final_invoice_amount) > 0
    ) {
      const { recordJobRevenue } =
        await import("@/app/actions/finance-bridge-actions");
      await recordJobRevenue(jobId, Number((job as any).final_invoice_amount));
    }

    // Step 10: Auto-send review request + detect recurring work
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/jobs/post-completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    }).catch((err) => console.error("Post-completion trigger failed:", err));
  }

  revalidatePath(`/ops/jobs`);
  revalidatePath(`/ops/finance`);
  revalidatePath(`/portal/${jobId}`);

  return { success: true };
}

export async function convertQuoteToJob(
  jobId: string,
): Promise<ActionResult<void>> {
  // Internal conversion: skip client approval, go straight to scheduling
  return updateJobStatus(jobId, "scheduled");
}

export async function approveQuote(jobId: string) {
  // Client clicked "Approve" in portal
  return updateJobStatus(jobId, "approved");
}

export async function confirmSupplies(jobId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({
      supplies_confirmed_at: new Date().toISOString(),
    } as any)
    .eq("id", jobId);

  if (error) {
    console.error("Error confirming supplies:", error);
    return { success: false, error: "Failed to confirm supplies" };
  }

  await logJobEvent(jobId, "supplies_confirmed", { source: "portal" });
  revalidatePath(`/portal/${jobId}`);
  return { success: true };
}

export async function markDepositPaid(
  jobId: string,
  method: string = "manual",
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({
      deposit_status: "paid",
    } as any)
    .eq("id", jobId);

  if (error) {
    console.error("Error updating deposit:", error);
    return { success: false, error: "Failed to update deposit status" };
  }

  await logJobEvent(jobId, "deposit_paid", { method });
  revalidatePath(`/portal/${jobId}`);
  return { success: true };
}
