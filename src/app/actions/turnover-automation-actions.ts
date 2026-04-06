"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/lib/services/notifications";

/**
 * Turnover stage order — defines the progression sequence.
 */
const STAGE_ORDER: string[] = [
  "notice",
  "vacated",
  "inspection",
  "in_progress",
  "paint",
  "clean",
  "final_qc",
  "ready",
];

/**
 * Mapping of turnover stages to trade type keywords.
 * Used to determine which tasks belong to which stage.
 */
const STAGE_TRADE_MAP: Record<string, string[]> = {
  paint: ["paint", "painting", "primer", "wall prep"],
  clean: ["clean", "cleaning", "janitorial", "sanitiz"],
  inspection: ["inspect", "inspection", "walkthrough", "assessment"],
  in_progress: ["repair", "fix", "replace", "install", "general", "drywall", "plumbing", "electrical", "flooring", "carpentry"],
  final_qc: ["qc", "quality", "final check", "punch list", "punchlist"],
};

/**
 * Determine which stage a task belongs to based on its trade_type or description.
 */
function getTaskStage(tradeType: string, description?: string): string | null {
  const text = `${tradeType || ""} ${description || ""}`.toLowerCase();
  for (const [stage, keywords] of Object.entries(STAGE_TRADE_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return stage;
    }
  }
  return null;
}

/**
 * Get the next stage in the turnover sequence.
 */
function getNextStage(currentStage: string): string | null {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

/**
 * Check if all tasks belonging to a specific turnover stage are complete.
 * If so, advance the turnover to the next stage.
 */
export async function advanceTurnoverStage(
  unitId: string,
): Promise<{
  success: boolean;
  advanced: boolean;
  newStage?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, advanced: false, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id)
    return { success: false, advanced: false, error: "No organization" };

  const orgId = profile.organization_id;

  // Get active turnover for this unit
  const { data: turnover } = await (supabase.from as any)("turnovers")
    .select("id, stage, unit_id, property_id, move_in_date")
    .eq("unit_id", unitId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!turnover) {
    return { success: false, advanced: false, error: "No active turnover" };
  }

  const currentStage = (turnover as any).stage;

  // Get all turnover tasks for this turnover
  const { data: allTasks } = await (supabase.from as any)("turnover_tasks")
    .select("id, trade_type, description, status, assigned_to")
    .eq("turnover_id", (turnover as any).id);

  if (!allTasks?.length) {
    return { success: true, advanced: false };
  }

  // Filter tasks that belong to the current stage
  const stageTasks = (allTasks as any[]).filter((t) => {
    const taskStage = getTaskStage(t.trade_type, t.description);
    return taskStage === currentStage;
  });

  // If no tasks match the current stage, check all tasks
  if (stageTasks.length === 0) {
    return { success: true, advanced: false };
  }

  // Check if all stage tasks are complete
  const allStageComplete = stageTasks.every(
    (t: any) => t.status === "completed" || t.status === "skipped",
  );

  if (!allStageComplete) {
    return { success: true, advanced: false };
  }

  // Advance to next stage
  const nextStage = getNextStage(currentStage);
  if (!nextStage) {
    // Turnover is complete
    await (supabase.from as any)("turnovers")
      .update({
        stage: "ready",
        completed_at: new Date().toISOString(),
        actual_ready_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", (turnover as any).id);

    // Update unit status
    await (supabase.from as any)("units")
      .update({ status: "ready" })
      .eq("id", unitId);

    // Log turnover event
    await (supabase.from as any)("turnover_events").insert({
      turnover_id: (turnover as any).id,
      organization_id: orgId,
      event_type: "completed",
      previous_value: { stage: currentStage },
      new_value: { stage: "ready" },
      actor_id: user.id,
    });

    // Get unit info for notification
    const { data: unit } = await (supabase.from as any)("units")
      .select("unit_number, buildings(name, properties(name))")
      .eq("id", unitId)
      .single();

    const unitLabel = unit
      ? `Unit ${(unit as any).unit_number} at ${(unit as any).buildings?.properties?.name || "property"}`
      : `Unit ${unitId.slice(0, 8)}`;

    await pushNotification({
      organizationId: orgId,
      type: "turnover_complete",
      title: `Turnover complete — ${unitLabel}`,
      body: "All stages finished. Unit is ready.",
      metadata: {
        unit_id: unitId,
        turnover_id: (turnover as any).id,
      },
    });

    revalidatePath("/ops/turnovers");
    return { success: true, advanced: true, newStage: "ready" };
  }

  // Update turnover stage
  await (supabase.from as any)("turnovers")
    .update({ stage: nextStage })
    .eq("id", (turnover as any).id);

  // Log stage change event
  await (supabase.from as any)("turnover_events").insert({
    turnover_id: (turnover as any).id,
    organization_id: orgId,
    event_type: "stage_changed",
    previous_value: { stage: currentStage },
    new_value: { stage: nextStage },
    actor_id: user.id,
  });

  // Get unit info for notification
  const { data: unit } = await (supabase.from as any)("units")
    .select("unit_number, buildings(name, properties(name))")
    .eq("id", unitId)
    .single();

  const unitLabel = unit
    ? `Unit ${(unit as any).unit_number} at ${(unit as any).buildings?.properties?.name || "property"}`
    : `Unit ${unitId.slice(0, 8)}`;

  await pushNotification({
    organizationId: orgId,
    type: "turnover_stage_advanced",
    title: `${unitLabel} advanced to ${nextStage}`,
    body: `${currentStage} → ${nextStage}`,
    metadata: {
      unit_id: unitId,
      turnover_id: (turnover as any).id,
      from_stage: currentStage,
      to_stage: nextStage,
    },
  });

  // Auto-dispatch subs for the next stage
  const nextStageTasks = (allTasks as any[]).filter((t) => {
    const taskStage = getTaskStage(t.trade_type, t.description);
    return taskStage === nextStage && t.assigned_to;
  });

  for (const task of nextStageTasks) {
    // Get sub details
    const { data: sub } = await (supabase.from as any)("subcontractors")
      .select("id, name, email")
      .eq("id", task.assigned_to)
      .single();

    if (sub && (sub as any).email) {
      // Send dispatch notification via Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "FHI Dispatch <dispatch@fhi.ca>",
            to: (sub as any).email,
            subject: `${unitLabel} is ready for ${nextStage} — your tasks`,
            html: `
              <div style="font-family:system-ui;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
                <div style="border-bottom:2px solid #ff6b00;padding-bottom:16px;margin-bottom:24px;">
                  <h2 style="margin:0;color:#ff6b00;">Ready for You</h2>
                  <p style="margin:4px 0 0;opacity:0.6;">${unitLabel}</p>
                </div>
                <p>Hi ${(sub as any).name || "there"},</p>
                <p><strong>${unitLabel}</strong> has advanced to the <strong>${nextStage}</strong> stage and is ready for your work.</p>
                <p><strong>Your task:</strong> ${task.trade_type}: ${task.description || "See details in portal"}</p>
                ${(turnover as any).move_in_date ? `<p><strong>Move-in date:</strong> ${new Date((turnover as any).move_in_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>` : ""}
                <p>Reply YES to confirm or log in to the sub portal for details.</p>
                <p style="margin-top:24px;opacity:0.6;font-size:13px;">— FHI Automation</p>
              </div>`,
          });
        } catch (err) {
          console.error(
            `Failed to dispatch sub ${(sub as any).name} for turnover stage:`,
            err,
          );
        }
      }
    }
  }

  revalidatePath("/ops/turnovers");
  return { success: true, advanced: true, newStage: nextStage };
}
