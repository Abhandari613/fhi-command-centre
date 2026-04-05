"use server";

import { createClient } from "@/utils/supabase/server";
import { pushNotification } from "@/lib/services/notifications";
import { revalidatePath } from "next/cache";

export type AvailableSlot = {
  date: string; // ISO date string (YYYY-MM-DD)
  dayName: string;
  displayDate: string;
};

/**
 * Returns available weekday slots for the next 2 weeks.
 * Excludes weekends and days that already have GCal events (if connected).
 */
export async function getAvailableSlots(
  jobId: string,
  weekOffset: number = 0,
): Promise<AvailableSlot[]> {
  const supabase = (await createClient()) as any;

  // Get job org
  const { data: job } = await supabase
    .from("jobs")
    .select("organization_id")
    .eq("id", jobId)
    .single();

  if (!job) return [];

  // Get existing scheduled job dates to exclude
  const { data: scheduledJobs } = await supabase
    .from("jobs")
    .select("start_date, end_date")
    .eq("organization_id", job.organization_id)
    .in("status", ["scheduled", "in_progress"])
    .not("start_date", "is", null);

  const busyDates = new Set<string>();
  for (const sj of scheduledJobs || []) {
    if (sj.start_date) {
      // Mark start date and any dates between start and end as busy
      const start = new Date(sj.start_date);
      const end = sj.end_date ? new Date(sj.end_date) : start;
      const current = new Date(start);
      while (current <= end) {
        busyDates.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }
  }

  // Generate available weekdays for next 2 weeks from offset
  const slots: AvailableSlot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from tomorrow + offset weeks
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 1 + weekOffset * 7);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);

  const current = new Date(startDate);
  while (current < endDate) {
    const day = current.getDay();
    const dateStr = current.toISOString().split("T")[0];

    // Skip weekends and busy dates
    if (day !== 0 && day !== 6 && !busyDates.has(dateStr)) {
      slots.push({
        date: dateStr,
        dayName: current.toLocaleDateString("en-US", { weekday: "short" }),
        displayDate: current.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Client selects a preferred date. Creates a pending notification for Frank.
 * Does NOT auto-create GCal event or move to scheduled status.
 */
export async function clientSelectDate(
  jobId: string,
  selectedDate: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = (await createClient()) as any;

  // Get job details
  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, property_address, address, organization_id, status")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "approved") {
    return { success: false, error: "Job must be in approved status" };
  }

  // Store the client's preferred date on the job
  await supabase
    .from("jobs")
    .update({
      preferred_schedule_date: selectedDate,
    } as any)
    .eq("id", jobId);

  // Notify Frank
  const address = job.property_address || job.address || "a project";
  await pushNotification({
    organizationId: job.organization_id,
    type: "schedule_request",
    title: `Client requested ${new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
    body: `${job.job_number} — ${address}. Review and confirm the schedule.`,
    metadata: {
      job_id: job.id,
      job_number: job.job_number,
      preferred_date: selectedDate,
    },
  });

  revalidatePath(`/portal/${jobId}`);
  return { success: true };
}
