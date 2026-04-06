"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { logJobEvent } from "@/app/actions/event-actions";
import {
  createJobEvent,
  updateJobEvent,
  refreshAccessToken,
} from "@/lib/services/gcal";

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function getDb() {
  return (await createClient()) as any;
}

async function getGCalTokens(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("gcal_tokens")
    .select("*")
    .eq("organization_id", orgId)
    .limit(1)
    .single();

  if (!data) return null;

  // Refresh if expired
  const expiry = new Date(data.token_expiry);
  if (expiry < new Date()) {
    try {
      const refreshed = await refreshAccessToken(data.refresh_token);
      await supabase
        .from("gcal_tokens")
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(
            refreshed.expiry_date || Date.now() + 3600000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      return {
        ...data,
        access_token: refreshed.access_token,
      };
    } catch {
      return null;
    }
  }

  return data;
}

export async function getGCalStatus(): Promise<{
  connected: boolean;
  calendarId?: string;
}> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { connected: false };

  const tokens = await getGCalTokens(supabase, profile.organization_id);
  return {
    connected: !!tokens,
    calendarId: tokens?.calendar_id,
  };
}

export async function disconnectGCal(): Promise<ActionResult<void>> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("gcal_tokens")
    .delete()
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/schedule");
  return { success: true };
}

export async function scheduleJob(
  jobId: string,
  startDate: string,
  endDate: string,
  subIds: string[],
): Promise<ActionResult<{ gcalEventId?: string }>> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Get job details
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, job_number, property_address, organization_id, status, client_id, property_id, building_id, unit_id, preferred_schedule_date",
    )
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };

  // Use client's preferred date if start date not specified and client had a preference
  const finalStartDate = startDate || (job as any).preferred_schedule_date || startDate;
  const finalEndDate = endDate || finalStartDate;

  // Update job dates and status, clear preferred date since it's now confirmed
  await supabase
    .from("jobs")
    .update({
      start_date: finalStartDate,
      end_date: finalEndDate,
      status: "scheduled",
      preferred_schedule_date: null,
    } as any)
    .eq("id", jobId);

  // Get task summary for calendar description
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("description, quantity, unit_price")
    .eq("job_id", jobId)
    .eq("is_confirmed", true);

  const taskSummary = (tasks || [])
    .map((t: any) => `• ${t.description}`)
    .join("\n");

  // Get sub emails for assignments
  let subEmails: string[] = [];
  if (subIds.length > 0) {
    const { data: subs } = await supabase
      .from("subcontractors")
      .select("id, email")
      .in("id", subIds);

    subEmails = (subs || [])
      .filter((s: any) => s.email)
      .map((s: any) => s.email);
  }

  // Try GCal sync
  let gcalEventId: string | null = null;
  const tokens = await getGCalTokens(supabase, job.organization_id);

  if (tokens) {
    try {
      gcalEventId = await createJobEvent(tokens, {
        jobNumber: job.job_number || jobId.slice(0, 8),
        address: job.property_address || "TBD",
        taskSummary: taskSummary || "No tasks specified",
        startDate: finalStartDate,
        endDate: finalEndDate,
        subEmails,
      });

      if (gcalEventId) {
        await supabase
          .from("jobs")
          .update({ gcal_event_id: gcalEventId })
          .eq("id", jobId);
      }
    } catch (err: any) {
      console.error("GCal create event error:", err.message);
      // Non-blocking — job still gets scheduled even if GCal fails
    }
  }

  // Create assignments for each sub
  for (const subId of subIds) {
    const { data: existing } = await supabase
      .from("job_assignments")
      .select("id")
      .eq("job_id", jobId)
      .eq("subcontractor_id", subId)
      .single();

    if (!existing) {
      const { v4: uuidv4 } = await import("uuid");
      await supabase.from("job_assignments").insert({
        job_id: jobId,
        subcontractor_id: subId,
        status: "assigned",
        magic_link_token: uuidv4(),
        scheduled_start: finalStartDate,
        scheduled_end: finalEndDate,
        gcal_event_id: gcalEventId,
      });
    } else {
      await supabase
        .from("job_assignments")
        .update({
          scheduled_start: finalStartDate,
          scheduled_end: finalEndDate,
          gcal_event_id: gcalEventId,
        })
        .eq("id", existing.id);
    }
  }

  await logJobEvent(jobId, "job_scheduled", {
    startDate: finalStartDate,
    endDate: finalEndDate,
    subCount: subIds.length,
    gcalSynced: !!gcalEventId,
  });

  // Auto-create a linked work order if one doesn't already exist for this job
  const { data: existingWO } = await (supabase.from as any)("work_orders")
    .select("id")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!existingWO && job.client_id) {
    const { data: confirmedTasks } = await supabase
      .from("job_tasks")
      .select("description, quantity, unit_price")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    const { data: newWO } = await (supabase.from as any)("work_orders")
      .insert({
        organization_id: job.organization_id,
        client_id: job.client_id,
        job_id: jobId,
        property_address_or_unit: job.property_address || "TBD",
        status: "Scheduled",
        due_at: finalEndDate,
        ...(job.property_id && { property_id: job.property_id }),
        ...(job.building_id && { building_id: job.building_id }),
        ...(job.unit_id && { unit_id: job.unit_id }),
      })
      .select("id")
      .single();

    // Seed work order tasks from confirmed job tasks
    if (newWO && confirmedTasks && confirmedTasks.length > 0) {
      const woTaskInserts = confirmedTasks.map((t: any) => ({
        organization_id: job.organization_id,
        work_order_id: newWO.id,
        trade_type: t.description || "General",
        status: "Unassigned",
        cost_estimate: (t.quantity || 1) * (t.unit_price || 0),
      }));
      await (supabase.from as any)("work_order_tasks").insert(woTaskInserts);
    }
  }

  // AUTOMATION 3: Auto-dispatch to all assigned subs OR trigger AI matching
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (subIds.length === 0) {
    // No subs manually assigned — trigger AI matching
    fetch(`${appUrl}/api/jobs/auto-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    }).catch((err) => console.error("Auto-dispatch trigger failed:", err));
  } else {
    // Subs manually assigned — send dispatch emails to each
    for (const subId of subIds) {
      try {
        // Get sub details
        const { data: sub } = await supabase
          .from("subcontractors")
          .select("id, name, email")
          .eq("id", subId)
          .single();

        if (sub?.email) {
          // Generate magic link token if not exists
          const { data: assignment } = await supabase
            .from("job_assignments")
            .select("id, magic_link_token")
            .eq("job_id", jobId)
            .eq("subcontractor_id", subId)
            .single();

          if (assignment) {
            // Send dispatch email with calendar invite
            const magicLinkUrl = `${appUrl}/s/${assignment.magic_link_token}`;
            fetch(`${appUrl}/api/sub-portal/dispatch-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subName: sub.name,
                subEmail: sub.email,
                jobNumber: job.job_number || jobId.slice(0, 8),
                address: job.property_address || "TBD",
                magicLink: magicLinkUrl,
                organizationId: job.organization_id,
                startDate: finalStartDate,
                endDate: finalEndDate,
                taskSummary: taskSummary || "",
                assignmentId: assignment.id,
              }),
            }).catch((err) =>
              console.error(`Dispatch email failed for sub ${subId}:`, err),
            );

            await logJobEvent(jobId, "sub_dispatched", {
              subId,
              subName: sub.name,
              date: finalStartDate,
            });
          }
        }
      } catch (dispatchErr) {
        console.error(`Failed to dispatch sub ${subId}:`, dispatchErr);
      }
    }
  }

  // AUTOMATION 2: Trigger auto-schedule suggestion for related incoming jobs
  // (handled separately via autoScheduleJob when jobs enter incoming status)

  revalidatePath(`/ops/jobs/${jobId}`);
  revalidatePath("/ops/schedule");
  return { success: true, data: { gcalEventId: gcalEventId || undefined } };
}

export async function rescheduleJob(
  jobId: string,
  newStart: string,
  newEnd: string,
): Promise<ActionResult<void>> {
  const supabase = await getDb();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, property_address, organization_id, gcal_event_id")
    .eq("id", jobId)
    .single();

  if (!job) return { success: false, error: "Job not found" };

  await supabase
    .from("jobs")
    .update({ start_date: newStart, end_date: newEnd })
    .eq("id", jobId);

  // Update GCal if connected
  if (job.gcal_event_id) {
    const tokens = await getGCalTokens(supabase, job.organization_id);
    if (tokens) {
      try {
        await updateJobEvent(tokens, job.gcal_event_id, {
          startDate: newStart,
          endDate: newEnd,
        });
      } catch (err: any) {
        console.error("GCal reschedule error:", err.message);
      }
    }
  }

  // Update assignment dates
  await supabase
    .from("job_assignments")
    .update({ scheduled_start: newStart, scheduled_end: newEnd })
    .eq("job_id", jobId);

  await logJobEvent(jobId, "job_rescheduled", { newStart, newEnd });

  revalidatePath(`/ops/jobs/${jobId}`);
  revalidatePath("/ops/schedule");
  return { success: true };
}

export async function getScheduledJobs() {
  const supabase = await getDb();
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

  const { data } = await supabase
    .from("jobs")
    .select(
      "id, job_number, property_address, status, start_date, end_date, gcal_event_id",
    )
    .eq("organization_id", profile.organization_id)
    .in("status", ["scheduled", "in_progress", "completed"])
    .not("start_date", "is", null)
    .order("start_date");

  return data || [];
}

// --- AI Schedule Suggestions ---

export type ScheduleSuggestion = {
  date: string;
  reason: string;
  nearby_jobs: string[];
  confidence: "high" | "medium" | "low";
};

export async function getScheduleSuggestions(
  jobId: string,
): Promise<{ suggestions: ScheduleSuggestion[]; notes: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/ai/suggest-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    return {
      suggestions: data.suggestions || [],
      notes: data.notes || "",
    };
  } catch {
    return { suggestions: [], notes: "Failed to get suggestions" };
  }
}

export async function quickScheduleJob(jobId: string, date: string) {
  const supabase = await getDb();

  const { error } = await supabase
    .from("jobs")
    .update({
      due_date: date,
      status: "scheduled",
    } as any)
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/ops/schedule");
  revalidatePath(`/ops/jobs/${jobId}`);
  return { success: true };
}
