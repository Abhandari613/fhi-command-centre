"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";
import { scheduleJob } from "@/app/actions/schedule-actions";
import { pushNotification } from "@/lib/services/notifications";

type AvailableSlot = {
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
};

type UrgencyLevel = "fire" | "hot" | "warm" | "cool";

/**
 * Determine job urgency based on turnover deadlines and job metadata.
 */
function computeUrgency(
  job: any,
  moveInDate?: string | null,
): UrgencyLevel {
  if (!moveInDate) {
    // Check job-level urgency hints
    if (job.urgency === "rush") return "hot";
    return "cool";
  }

  const daysUntilMoveIn = Math.ceil(
    (new Date(moveInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilMoveIn <= 3) return "fire";
  if (daysUntilMoveIn <= 7) return "hot";
  if (daysUntilMoveIn <= 14) return "warm";
  return "cool";
}

/**
 * Estimate job size based on task count.
 * Returns duration in hours.
 */
function estimateJobDuration(taskCount: number): number {
  if (taskCount <= 2) return 2; // small
  if (taskCount <= 5) return 4; // medium
  return 8; // full day
}

/**
 * Find available scheduling slots by checking GCal events and existing jobs.
 */
export async function findAvailableSlots(
  startDate: string,
  endDate: string,
  durationHours: number,
): Promise<AvailableSlot[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  // Get existing scheduled/in_progress jobs in the date range
  const { data: scheduledJobs } = await supabase
    .from("jobs")
    .select("id, start_date, end_date")
    .eq("organization_id", profile.organization_id)
    .in("status", ["scheduled", "in_progress"])
    .gte("start_date", startDate)
    .lte("start_date", endDate);

  // Build a set of occupied dates
  const occupiedDates = new Set<string>();
  for (const job of scheduledJobs || []) {
    if (job.start_date) {
      const start = new Date(job.start_date);
      const end = job.end_date ? new Date(job.end_date) : start;
      const current = new Date(start);
      while (current <= end) {
        occupiedDates.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }
  }

  // Generate available slots
  const slots: AvailableSlot[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dateStr === now.toISOString().split("T")[0];
    const isPastAfternoon = isToday && now.getHours() >= 14;

    // Skip weekends (unless urgency overrides — handled by caller)
    // Skip today if past 2 PM
    // Skip occupied dates
    if (!isWeekend && !isPastAfternoon && !occupiedDates.has(dateStr)) {
      if (durationHours <= 4) {
        // Morning slot
        slots.push({
          date: dateStr,
          startTime: "08:00",
          endTime: `${8 + durationHours}:00`,
          durationHours,
        });
        // Afternoon slot (if small job)
        if (durationHours <= 2) {
          slots.push({
            date: dateStr,
            startTime: "13:00",
            endTime: `${13 + durationHours}:00`,
            durationHours,
          });
        }
      } else {
        // Full day
        slots.push({
          date: dateStr,
          startTime: "08:00",
          endTime: "17:00",
          durationHours: 8,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Auto-schedule a job based on urgency and availability.
 * Called after job reaches "incoming" status.
 */
export async function autoScheduleJob(jobId: string): Promise<{
  success: boolean;
  action: "auto_scheduled" | "suggestion_sent" | "no_action";
  date?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, action: "no_action", error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id)
    return { success: false, action: "no_action", error: "No organization" };

  const orgId = profile.organization_id;

  // Get job details
  const { data: job } = await supabase
    .from("jobs")
    .select("*, unit_id")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, action: "no_action", error: "Job not found" };

  // Check if job is linked to a unit with move_in_date (turnover)
  let moveInDate: string | null = null;
  if ((job as any).unit_id) {
    const { data: turnover } = await (supabase.from as any)("turnovers")
      .select("move_in_date")
      .eq("unit_id", (job as any).unit_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (turnover) moveInDate = (turnover as any).move_in_date;
  }

  // Compute urgency
  const urgency = computeUrgency(job, moveInDate);

  // Count tasks for job size estimation
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("id")
    .eq("job_id", jobId);

  const taskCount = tasks?.length || 1;
  const durationHours = estimateJobDuration(taskCount);

  // Look 2 weeks ahead for slots
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  const slots = await findAvailableSlots(
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
    durationHours,
  );

  if (!slots.length) {
    await pushNotification({
      organizationId: orgId,
      type: "schedule_alert",
      title: "No available slots for auto-scheduling",
      body: `Job at ${job.property_address || job.title} needs scheduling but no open slots found in the next 2 weeks.`,
      metadata: { job_id: jobId, urgency },
    });
    return { success: true, action: "no_action" };
  }

  // For fire/hot urgency: pick earliest slot, including weekends if fire
  if (urgency === "fire" || urgency === "hot") {
    const slot = slots[0];
    const result = await scheduleJob(jobId, slot.date, slot.date, []);

    if (result.success) {
      await logJobEvent(jobId, "auto_scheduled", {
        urgency,
        date: slot.date,
        durationHours,
        moveInDate,
      });

      await pushNotification({
        organizationId: orgId,
        type: "auto_scheduled",
        title: `Job auto-scheduled — ${urgency} urgency`,
        body: `${job.property_address || job.title} scheduled for ${slot.date}`,
        metadata: {
          job_id: jobId,
          date: slot.date,
          urgency,
        },
      });

      return { success: true, action: "auto_scheduled", date: slot.date };
    }

    return { success: false, action: "no_action", error: result.error };
  }

  // For warm/cool: suggest but don't auto-schedule
  const suggestedSlot = slots[0];
  await pushNotification({
    organizationId: orgId,
    type: "schedule_suggestion",
    title: `Schedule suggestion for ${job.property_address || job.title}`,
    body: `Suggested: ${suggestedSlot.date} (${suggestedSlot.startTime}–${suggestedSlot.endTime}). Tap to confirm or pick a different slot.`,
    metadata: {
      job_id: jobId,
      suggested_date: suggestedSlot.date,
      suggested_start: suggestedSlot.startTime,
      suggested_end: suggestedSlot.endTime,
      urgency,
    },
  });

  await logJobEvent(jobId, "schedule_suggested", {
    suggestedDate: suggestedSlot.date,
    urgency,
    durationHours,
  });

  return { success: true, action: "suggestion_sent", date: suggestedSlot.date };
}
