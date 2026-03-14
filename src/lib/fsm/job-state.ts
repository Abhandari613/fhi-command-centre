export type JobStatus =
    | 'incoming' | 'draft' | 'sent' | 'quoted' | 'approved'
    | 'active' | 'scheduled' | 'in_progress'
    | 'completed' | 'invoiced' | 'paid'
    | 'cancelled';

export const JOB_STATUS_FLOW: Record<JobStatus, JobStatus[]> = {
    incoming: ['draft', 'cancelled'],
    draft: ['sent', 'quoted', 'cancelled'],
    sent: ['approved', 'cancelled', 'draft'],
    quoted: ['approved', 'in_progress', 'cancelled', 'draft'], // Dashboard shortcut: quoted → in_progress
    approved: ['active', 'cancelled'],
    active: ['scheduled', 'cancelled', 'completed'],
    scheduled: ['in_progress', 'cancelled', 'active'],
    in_progress: ['completed', 'cancelled', 'scheduled'],
    completed: ['invoiced', 'active'], // invoiced is the next step; active re-opens
    invoiced: ['paid', 'completed'], // paid is the next step; completed rolls back
    paid: [], // Terminal state
    cancelled: ['draft'],
};

export const STATUS_LABELS: Record<JobStatus, string> = {
    incoming: 'Incoming',
    draft: 'Draft',
    sent: 'Sent to Client',
    quoted: 'Quoted',
    approved: 'Quote Approved',
    active: 'Active Job',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    cancelled: 'Cancelled',
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
