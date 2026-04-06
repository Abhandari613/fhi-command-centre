export const JOB_STATUS = {
  INCOMING: "incoming",
  SITE_VISIT: "site_visit",
  QUOTE: "draft",
  QUOTED: "quoted",
  SENT: "sent",
  APPROVED: "approved",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  INVOICED: "invoiced",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
