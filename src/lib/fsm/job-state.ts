export type JobStatus =
  | "incoming"
  | "site_visit"
  | "draft"
  | "quoted"
  | "sent"
  | "approved"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "paid"
  | "cancelled";

// 11-step workflow (matches how Neil emails Frank work):
// 1. incoming    — New request came in (email from Neil)
// 2. site_visit  — Go look at the unit / get measurements
// 3. draft       — Write up what needs doing
// 4. quoted      — Price it up
// 5. sent        — Quote sent to Neil / Coady
// 6. approved    — Neil says go ahead
// 7. scheduled   — Date + crew locked in
// 8. in_progress — Work is happening
// 9. completed   — Done, take photos
// 10. invoiced   — Invoice sent to Coady
// 11. paid       — Money received
export const JOB_STATUS_FLOW: Record<JobStatus, JobStatus[]> = {
  incoming: ["site_visit", "draft", "cancelled"],
  site_visit: ["draft", "cancelled", "incoming"],
  draft: ["quoted", "cancelled"],
  quoted: ["sent", "cancelled", "draft"],
  sent: ["approved", "cancelled", "quoted"],
  approved: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled", "approved"],
  in_progress: ["completed", "cancelled", "scheduled"],
  completed: ["invoiced", "in_progress"],
  invoiced: ["paid", "completed"],
  paid: [],
  cancelled: ["draft"],
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  incoming: "New Request",
  site_visit: "Go Look",
  draft: "Scope It Out",
  quoted: "Priced Up",
  sent: "Quote Sent",
  approved: "Got the Go-Ahead",
  scheduled: "Booked In",
  in_progress: "On the Job",
  completed: "Work Done",
  invoiced: "Invoice Sent",
  paid: "Paid",
  cancelled: "Cancelled",
};

/**
 * Validates if a status transition is allowed.
 * @param currentStatus The current status of the job.
 * @param newStatus The desired new status.
 * @returns true if the transition is allowed, false otherwise.
 */
export function canTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus,
): boolean {
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
export function checkConstraints(
  job: any,
  newStatus: JobStatus,
): string | null {
  // Constraint: Cannot complete a job if deposit is pending (unless it's $0)
  if (newStatus === "completed") {
    if (job.deposit_status === "pending" && job.deposit_amount > 0) {
      return "Cannot complete job with pending deposit.";
    }
  }

  // Constraint: Cannot schedule without an active job (conceptually)
  // But our flow allows active -> scheduled.

  return null;
}
