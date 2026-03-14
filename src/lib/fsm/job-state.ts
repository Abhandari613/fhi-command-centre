export type JobStatus =
  | "incoming"
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

// 10-stop workflow:
// 1. incoming (Auto-Detected)
// 2. draft (What Needs Doing)
// 3. quoted (Price It Up)
// 4. sent → approved (Client Says Yes)
// 5. scheduled (Lock In the Date + Crew Dispatched)
// 6. in_progress (Boots on the Ground)
// 7. completed (AI Verifies Completion)
// 8. invoiced (Auto-Invoice)
// 9. paid (Done + Follow-Up)
export const JOB_STATUS_FLOW: Record<JobStatus, JobStatus[]> = {
  incoming: ["draft", "cancelled"],
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
  incoming: "Incoming",
  draft: "Draft",
  quoted: "Quoted",
  sent: "Sent to Client",
  approved: "Approved",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
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
