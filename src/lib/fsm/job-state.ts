export type JobStatus = 'draft' | 'sent' | 'approved' | 'active' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export const JOB_STATUS_FLOW: Record<JobStatus, JobStatus[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['approved', 'cancelled', 'draft'], // Can go back to draft if rejected/edited
    approved: ['active', 'cancelled'],
    active: ['scheduled', 'cancelled', 'completed'], // Completed allowed if skipped usage of scheduled
    scheduled: ['in_progress', 'cancelled', 'active'], // Back to active if unscheduled
    in_progress: ['completed', 'cancelled', 'scheduled'],
    completed: ['active'], // Re-open if needed
    cancelled: ['draft'] // Revive as draft
};

export const STATUS_LABELS: Record<JobStatus, string> = {
    draft: 'Draft',
    sent: 'Sent to Client',
    approved: 'Quote Approved',
    active: 'Active Job',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

/**
 * Validates if a status transition is allowed.
 * @param currentStatus The current status of the job.
 * @param newStatus The desired new status.
 * @returns true if the transition is allowed, false otherwise.
 */
export function canTransition(currentStatus: JobStatus, newStatus: JobStatus): boolean {
    if (currentStatus === newStatus) return true;
    const allowed = JOB_STATUS_FLOW[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
}

/**
 * Checks constraints before allowing a transition.
 * @param job The job object containing current state and data.
 * @param newStatus The allowed new status (assumes canTransition passed).
 * @returns Error string if constraint fails, null if OK.
 */
export function checkConstraints(job: any, newStatus: JobStatus): string | null {
    // Constraint: Cannot complete a job if deposit is pending (unless it's $0)
    if (newStatus === 'completed') {
        if (job.deposit_status === 'pending' && job.deposit_amount > 0) {
            return "Cannot complete job with pending deposit.";
        }
    }

    // Constraint: Cannot schedule without an active job (conceptually)
    // But our flow allows active -> scheduled. 

    return null;
}
