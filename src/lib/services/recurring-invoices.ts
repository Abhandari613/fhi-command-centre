import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function advanceDate(date: string, frequency: string): string {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function processRecurringSchedules(): Promise<{
  generated: number;
  errors: number;
}> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().split("T")[0];
  let generated = 0;
  let errors = 0;

  // Get all active schedules due today or earlier
  const { data: schedules } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("is_active", true)
    .lte("next_due", today);

  if (!schedules?.length) return { generated: 0, errors: 0 };

  for (const schedule of schedules) {
    try {
      // Check if past end_date
      if (schedule.end_date && schedule.end_date < today) {
        await supabase
          .from("recurring_schedules")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", schedule.id);
        continue;
      }

      // Get a job_number
      const { data: maxJob } = await supabase
        .from("jobs")
        .select("job_number")
        .eq("organization_id", schedule.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastNum = maxJob?.job_number
        ? parseInt(maxJob.job_number.replace(/\D/g, ""), 10)
        : 0;
      const newJobNumber = `FHI-${String(lastNum + 1).padStart(4, "0")}`;

      // Get client for address info
      const { data: client } = await supabase
        .from("clients")
        .select("name, address")
        .eq("id", schedule.client_id)
        .single();

      // Create the job
      const { data: newJob, error: jobError } = await supabase
        .from("jobs")
        .insert({
          organization_id: schedule.organization_id,
          client_id: schedule.client_id,
          location_id: schedule.location_id,
          job_number: newJobNumber,
          title: schedule.title,
          description: schedule.description || `Recurring: ${schedule.title}`,
          property_address: client?.address || null,
          status: "draft",
          urgency: "normal",
          deposit_required: schedule.deposit_required || false,
          deposit_amount: schedule.deposit_amount || null,
        })
        .select("id")
        .single();

      if (jobError || !newJob) {
        console.error(
          `Failed to create job for schedule ${schedule.id}:`,
          jobError,
        );
        errors++;
        continue;
      }

      // Create job tasks from template line items
      const lineItems = schedule.line_items || [];
      for (const item of lineItems) {
        await supabase.from("job_tasks").insert({
          job_id: newJob.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          is_confirmed: true,
        });
      }

      // Advance the schedule
      const nextDue = advanceDate(schedule.next_due, schedule.frequency);
      await supabase
        .from("recurring_schedules")
        .update({
          next_due: nextDue,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id);

      // Notify
      await supabase.from("notifications").insert({
        organization_id: schedule.organization_id,
        type: "recurring_job_created",
        title: `Recurring job created — ${newJobNumber}`,
        body: `${schedule.title} for ${client?.name || "client"} (${schedule.frequency})`,
        metadata: {
          job_id: newJob.id,
          schedule_id: schedule.id,
          frequency: schedule.frequency,
        },
      });

      generated++;
    } catch (err) {
      console.error(`Error processing schedule ${schedule.id}:`, err);
      errors++;
    }
  }

  return { generated, errors };
}
