"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";

export type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

import { JobStatus, canTransition, checkConstraints } from "@/lib/fsm/job-state";

export async function updateJobStatus(jobId: string, newStatus: JobStatus): Promise<ActionResult<void>> {
    const supabase = await createClient();

    // 1. Fetch current job state
    const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (fetchError || !job) {
        return { success: false, error: "Job not found" };
    }

    // 2. Validate Transition
    if (!canTransition(job.status as JobStatus, newStatus)) {
        return { success: false, error: `Invalid transition from ${job.status} to ${newStatus}` };
    }

    // 3. Check Business Constraints
    const constraintError = checkConstraints(job, newStatus);
    if (constraintError) {
        return { success: false, error: constraintError };
    }

    // 4. Update
    const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // 5. Log & Revalidate
    await logJobEvent(jobId, `status_change`, { from: job.status, to: newStatus });

    // 6. Notifications
    if (newStatus === 'completed') {
        // Simulate sending email
        console.log(`[NOTIFICATION] Sending 'Job Complete' email to client for Job ${jobId}`);
        await logJobEvent(jobId, 'notification_sent', { type: 'job_complete_email', recipient: 'client' });
    }

    revalidatePath(`/ops/jobs`);
    revalidatePath(`/portal/${jobId}`);

    return { success: true };
}

export async function convertQuoteToJob(jobId: string): Promise<ActionResult<void>> {
    // Uses the new centralized state manager
    // Quote conversion usually implies moving from 'draft'/'sent' to 'active' (skipping 'approved' if internal)
    // OR 'approved' -> 'active'
    return updateJobStatus(jobId, 'active');
}

export async function approveQuote(jobId: string) {
    // Client clicked "Approve" in portal
    return updateJobStatus(jobId, 'approved');
}

export async function confirmSupplies(jobId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('jobs')
        .update({
            supplies_confirmed_at: new Date().toISOString()
        } as any)
        .eq('id', jobId);

    if (error) {
        console.error("Error confirming supplies:", error);
        return { success: false, error: "Failed to confirm supplies" };
    }

    await logJobEvent(jobId, 'supplies_confirmed', { source: 'portal' });
    revalidatePath(`/portal/${jobId}`);
    return { success: true };
}

export async function markDepositPaid(jobId: string, method: string = 'manual') {
    const supabase = await createClient();

    const { error } = await supabase
        .from('jobs')
        .update({
            deposit_status: 'paid'
        } as any)
        .eq('id', jobId);

    if (error) {
        console.error("Error updating deposit:", error);
        return { success: false, error: "Failed to update deposit status" };
    }

    await logJobEvent(jobId, 'deposit_paid', { method });
    revalidatePath(`/portal/${jobId}`);
    return { success: true };
}
