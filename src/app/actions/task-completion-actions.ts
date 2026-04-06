"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * TRACK 3: Toggle a work order task as complete/incomplete.
 */
export async function toggleTaskComplete(
  taskId: string,
  completed: boolean,
): Promise<{ success: boolean; allComplete?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const update = completed
    ? { status: "Completed", completed_at: new Date().toISOString(), completed_by: user.id }
    : { status: "Pending", completed_at: null, completed_by: null };

  const { error } = await (supabase.from as any)("work_order_tasks")
    .update(update)
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };

  // Get the work order for this task to check all-complete status
  const { data: task } = await (supabase.from as any)("work_order_tasks")
    .select("work_order_id, subcontractor_id, cost_estimate")
    .eq("id", taskId)
    .single();

  if (task?.work_order_id) {
    // Check if all tasks in this work order are complete
    const { data: allTasks } = await (supabase.from as any)("work_order_tasks")
      .select("id, status")
      .eq("work_order_id", task.work_order_id);

    const allComplete = (allTasks || []).every(
      (t: any) => t.status === "Completed",
    );

    // AUTOMATION 4: Auto-invoice when all tasks complete
    if (allComplete && task.work_order_id) {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          // Check if org has auto_invoice enabled
          const { data: org } = await supabase
            .from("organizations")
            .select("auto_invoice")
            .eq("id", profile.organization_id)
            .single();

          const autoInvoice = (org as any)?.auto_invoice !== false; // default true

          // Check if invoice already exists for this work order
          const { data: existingInvoice } = await (supabase.from as any)("job_invoices")
            .select("id")
            .eq("work_order_id", task.work_order_id)
            .limit(1)
            .maybeSingle();

          if (!existingInvoice) {
            // Check if work order has billing_contact_id
            const { data: woData } = await (supabase.from as any)("work_orders")
              .select("billing_contact_id, job_id")
              .eq("id", task.work_order_id)
              .single();

            const { createInvoiceFromWorkOrder, sendInvoice } = await import(
              "@/app/actions/invoice-from-wo-actions"
            );
            const { pushNotification } = await import("@/lib/services/notifications");

            const invoiceResult = await createInvoiceFromWorkOrder(task.work_order_id);

            if (invoiceResult.success && invoiceResult.invoiceId) {
              if (autoInvoice && woData?.billing_contact_id) {
                // Auto-send the invoice
                const sendResult = await sendInvoice(invoiceResult.invoiceId);
                if (sendResult.success) {
                  // Get invoice total for notification
                  const { data: inv } = await (supabase.from as any)("job_invoices")
                    .select("total, invoice_number")
                    .eq("id", invoiceResult.invoiceId)
                    .single();

                  await pushNotification({
                    organizationId: profile.organization_id,
                    type: "auto_invoice_sent",
                    title: `Invoice ${(inv as any)?.invoice_number} auto-sent`,
                    body: `$${Number((inv as any)?.total || 0).toLocaleString()} for completed work order`,
                    metadata: {
                      invoice_id: invoiceResult.invoiceId,
                      job_id: woData?.job_id,
                      work_order_id: task.work_order_id,
                    },
                  });

                  if (woData?.job_id) {
                    const { logJobEvent } = await import("@/app/actions/event-actions");
                    await logJobEvent(woData.job_id, "auto_invoice_sent", {
                      invoiceId: invoiceResult.invoiceId,
                      total: (inv as any)?.total,
                    });
                  }
                }
              } else if (!woData?.billing_contact_id) {
                // No billing contact — notify Frank
                await pushNotification({
                  organizationId: profile.organization_id,
                  type: "invoice_needs_contact",
                  title: "All tasks complete but no billing contact",
                  body: `Add a billing contact to send the invoice.`,
                  metadata: { work_order_id: task.work_order_id, job_id: woData?.job_id },
                });
              } else {
                // Auto-invoice disabled — notify about draft
                await pushNotification({
                  organizationId: profile.organization_id,
                  type: "invoice_draft_ready",
                  title: "Invoice ready for review",
                  body: `All tasks complete — invoice created as draft.`,
                  metadata: { invoice_id: invoiceResult.invoiceId, job_id: woData?.job_id },
                });
              }
            }
          }
        }
      } catch (autoInvoiceErr) {
        console.error("Auto-invoice failed:", autoInvoiceErr);
      }
    }

    // AUTOMATION 7: Auto-advance turnover stages
    if (completed && task.work_order_id) {
      try {
        // Check if work order is linked to a unit with an active turnover
        const { data: wo } = await (supabase.from as any)("work_orders")
          .select("unit_id")
          .eq("id", task.work_order_id)
          .single();

        if (wo?.unit_id) {
          const { advanceTurnoverStage } = await import(
            "@/app/actions/turnover-automation-actions"
          );
          await advanceTurnoverStage(wo.unit_id);
        }
      } catch (turnoverErr) {
        console.error("Turnover auto-advance failed:", turnoverErr);
      }
    }

    // If task has a sub and was completed, queue payout (TRACK 8)
    if (completed && task.subcontractor_id && task.cost_estimate > 0) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        // Get linked job
        const { data: wo } = await (supabase.from as any)("work_orders")
          .select("job_id")
          .eq("id", task.work_order_id)
          .single();

        await (supabase.from as any)("sub_payouts").upsert(
          {
            organization_id: profile.organization_id,
            subcontractor_id: task.subcontractor_id,
            work_order_task_id: taskId,
            job_id: wo?.job_id || null,
            amount: task.cost_estimate,
            status: "pending_payout",
          } as any,
          { onConflict: "work_order_task_id" },
        );
      }
    }

    revalidatePath(`/ops/work-orders/${task.work_order_id}`);
    revalidatePath("/ops/work-orders");
    return { success: true, allComplete };
  }

  return { success: true };
}

/**
 * Get task progress for a work order.
 */
export async function getTaskProgress(workOrderId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}> {
  const supabase = await createClient();

  const { data } = await (supabase.from as any)("work_order_tasks")
    .select("id, status")
    .eq("work_order_id", workOrderId);

  const tasks = data || [];
  const completed = tasks.filter(
    (t: any) => t.status === "Completed",
  ).length;

  return {
    total: tasks.length,
    completed,
    percentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

/**
 * Toggle a job_task as complete (for the job detail page tasks).
 */
export async function toggleJobTaskComplete(
  taskId: string,
  completed: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_tasks")
    .update({
      is_confirmed: completed,
    } as any)
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };

  // Get job_id for revalidation
  const { data: task } = await supabase
    .from("job_tasks")
    .select("job_id")
    .eq("id", taskId)
    .single();

  if (task?.job_id) {
    revalidatePath(`/ops/jobs/${task.job_id}`);
  }

  return { success: true };
}
