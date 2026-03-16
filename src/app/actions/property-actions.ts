"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionValidation } from "@/lib/core/actions/wrapper";
import { createActionError } from "@/lib/core/actions/types";
import type {
  Property,
  Building,
  Unit,
  Turnover,
  TurnoverTask,
  TurnoverTemplate,
  PropertyTurnoverSummary,
} from "@/types/properties";

// ── Schemas ──

const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(3),
  client_id: z.string().uuid().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createBuildingSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  floor_count: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createUnitSchema = z.object({
  building_id: z.string().uuid(),
  unit_number: z.string().min(1),
  floor: z.number().int().optional().nullable(),
  bedrooms: z.number().int().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  sqft: z.number().int().optional().nullable(),
  status: z
    .enum(["occupied", "vacant", "turnover", "ready", "offline"])
    .optional(),
  notes: z.string().optional().nullable(),
});

const createTurnoverSchema = z.object({
  unit_id: z.string().uuid(),
  move_out_date: z.string().optional().nullable(),
  target_ready_date: z.string().optional().nullable(),
  move_in_date: z.string().optional().nullable(),
  stage: z
    .enum([
      "notice",
      "vacated",
      "inspection",
      "in_progress",
      "paint",
      "clean",
      "final_qc",
      "ready",
    ])
    .optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  estimated_cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
});

// ── Helpers ──

async function getOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!data?.organization_id) throw new Error("No org found");
  return { supabase, orgId: data.organization_id as string };
}

// ── Properties ──

export async function getProperties() {
  const { supabase, orgId } = await getOrgId();

  const { data: props, error } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error || !props?.length) return [] as PropertyTurnoverSummary[];

  // Enrich with counts from buildings/units/turnovers
  const propIds = props.map((p: any) => p.id);

  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, property_id")
    .in("property_id", propIds);

  const buildingIds = (buildings ?? []).map((b: any) => b.id);

  const { data: units } = buildingIds.length
    ? await supabase
        .from("units")
        .select("id, building_id, status")
        .in("building_id", buildingIds)
    : { data: [] };

  const { data: turnovers } = await supabase
    .from("turnovers")
    .select("id, unit_id, stage, is_active")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  // Build lookup maps
  const buildingsByProp: Record<string, string[]> = {};
  for (const b of buildings ?? []) {
    if (!buildingsByProp[b.property_id]) buildingsByProp[b.property_id] = [];
    buildingsByProp[b.property_id].push(b.id);
  }

  const unitsByBuilding: Record<string, any[]> = {};
  for (const u of units ?? []) {
    if (!unitsByBuilding[u.building_id]) unitsByBuilding[u.building_id] = [];
    unitsByBuilding[u.building_id].push(u);
  }

  const turnoversByUnit: Record<string, any[]> = {};
  for (const t of turnovers ?? []) {
    if (!turnoversByUnit[t.unit_id]) turnoversByUnit[t.unit_id] = [];
    turnoversByUnit[t.unit_id].push(t);
  }

  return props.map((p: any) => {
    const bldgIds = buildingsByProp[p.id] ?? [];
    const propUnits = bldgIds.flatMap(
      (bid: string) => unitsByBuilding[bid] ?? [],
    );
    const propTurnovers = propUnits.flatMap(
      (u: any) => turnoversByUnit[u.id] ?? [],
    );

    return {
      property_id: p.id,
      property_name: p.name,
      property_address: p.address,
      organization_id: p.organization_id,
      building_count: bldgIds.length,
      total_units: propUnits.length,
      units_in_turnover: propUnits.filter((u: any) => u.status === "turnover")
        .length,
      units_ready: propUnits.filter((u: any) => u.status === "ready").length,
      units_vacant: propUnits.filter((u: any) => u.status === "vacant").length,
      active_turnovers: propTurnovers.filter((t: any) => t.stage !== "ready")
        .length,
      completed_turnovers: propTurnovers.filter((t: any) => t.stage === "ready")
        .length,
    };
  }) as PropertyTurnoverSummary[];
}

export async function getProperty(propertyId: string) {
  const { supabase } = await getOrgId();

  const { data, error } = await supabase
    .from("properties")
    .select("*, clients(name)")
    .eq("id", propertyId)
    .single();

  if (error) return null;
  return {
    ...data,
    client_name: (data as Record<string, any>).clients?.name ?? null,
  } as Property & { client_name: string | null };
}

export async function createProperty(input: unknown) {
  return withActionValidation(
    createPropertySchema,
    input,
    async (validated) => {
      const { supabase, orgId } = await getOrgId();
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...validated, organization_id: orgId })
        .select()
        .single();

      if (error)
        return {
          success: false,
          error: createActionError("DB_ERROR", error.message, 500),
        };
      revalidatePath("/ops/properties");
      return { success: true, data };
    },
  );
}

// ── Buildings ──

export async function getBuildings(propertyId: string) {
  const { supabase } = await getOrgId();

  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("property_id", propertyId)
    .order("name");

  if (error) return [];

  const buildingIds = (data ?? []).map((b: any) => b.id);
  if (buildingIds.length === 0) return data as Building[];

  const { data: unitCounts } = await supabase
    .from("units")
    .select("building_id, status")
    .in("building_id", buildingIds);

  const countMap: Record<string, { total: number; turnover: number }> = {};
  for (const u of unitCounts ?? []) {
    if (!countMap[u.building_id])
      countMap[u.building_id] = { total: 0, turnover: 0 };
    countMap[u.building_id].total++;
    if (u.status === "turnover") countMap[u.building_id].turnover++;
  }

  return (data ?? []).map((b: any) => ({
    ...b,
    unit_count: countMap[b.id]?.total ?? 0,
    units_in_turnover: countMap[b.id]?.turnover ?? 0,
  })) as Building[];
}

export async function createBuilding(input: unknown) {
  return withActionValidation(
    createBuildingSchema,
    input,
    async (validated) => {
      const { supabase, orgId } = await getOrgId();
      const { data, error } = await supabase
        .from("buildings")
        .insert({ ...validated, organization_id: orgId })
        .select()
        .single();

      if (error)
        return {
          success: false,
          error: createActionError("DB_ERROR", error.message, 500),
        };
      revalidatePath("/ops/properties");
      return { success: true, data };
    },
  );
}

// ── Units ──

export async function getUnits(buildingId: string) {
  const { supabase } = await getOrgId();

  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("building_id", buildingId)
    .order("unit_number");

  if (error) return [];
  return (data ?? []) as Unit[];
}

export async function createUnit(input: unknown) {
  return withActionValidation(createUnitSchema, input, async (validated) => {
    const { supabase, orgId } = await getOrgId();
    const { data, error } = await supabase
      .from("units")
      .insert({ ...validated, organization_id: orgId })
      .select()
      .single();

    if (error)
      return {
        success: false,
        error: createActionError("DB_ERROR", error.message, 500),
      };
    revalidatePath("/ops/properties");
    return { success: true, data };
  });
}

export async function updateUnitStatus(unitId: string, status: string) {
  const { supabase } = await getOrgId();
  const { error } = await supabase
    .from("units")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", unitId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/properties");
  return { success: true };
}

// ── Turnovers ──

export async function getTurnovers(filters?: {
  propertyId?: string;
  stage?: string;
}) {
  const { supabase, orgId } = await getOrgId();

  // Can't use nested joins on untyped tables — fetch separately and join in JS
  const { data: turnoverData, error } = await supabase
    .from("turnovers")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("target_ready_date", { ascending: true, nullsFirst: false });

  if (error || !turnoverData?.length) return [] as Turnover[];

  // Fetch related data
  const unitIds = [...new Set(turnoverData.map((t: any) => t.unit_id))];
  const { data: units } = await supabase
    .from("units")
    .select("id, unit_number, building_id")
    .in("id", unitIds);

  const buildingIds = [
    ...new Set((units ?? []).map((u: any) => u.building_id)),
  ];
  const { data: buildings } = buildingIds.length
    ? await supabase
        .from("buildings")
        .select("id, name, code, property_id")
        .in("id", buildingIds)
    : { data: [] };

  const propertyIds = [
    ...new Set((buildings ?? []).map((b: any) => b.property_id)),
  ];
  const { data: properties } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("id, name, address")
        .in("id", propertyIds)
    : { data: [] };

  const subIds = turnoverData.map((t: any) => t.assigned_to).filter(Boolean);
  const { data: subs } = subIds.length
    ? await supabase.from("subcontractors").select("id, name").in("id", subIds)
    : { data: [] };

  // Build lookups
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]));
  const buildingMap = Object.fromEntries(
    (buildings ?? []).map((b: any) => [b.id, b]),
  );
  const propMap = Object.fromEntries(
    (properties ?? []).map((p: any) => [p.id, p]),
  );
  const subMap = Object.fromEntries((subs ?? []).map((s: any) => [s.id, s]));

  let result = turnoverData.map((t: any) => {
    const unit = unitMap[t.unit_id];
    const building = unit ? buildingMap[unit.building_id] : null;
    const property = building ? propMap[building.property_id] : null;

    return {
      ...t,
      unit_number: unit?.unit_number,
      building_name: building?.name,
      building_code: building?.code,
      property_id: property?.id ?? null,
      property_name: property?.name,
      property_address: property?.address,
      assigned_name: t.assigned_to ? subMap[t.assigned_to]?.name : null,
      days_vacant: t.move_out_date
        ? Math.floor(
            (Date.now() - new Date(t.move_out_date).getTime()) / 86400000,
          )
        : null,
    };
  }) as Turnover[];

  if (filters?.propertyId) {
    const filteredBuildingIds = (buildings ?? [])
      .filter((b: any) => b.property_id === filters.propertyId)
      .map((b: any) => b.id);
    const filteredUnitIds = (units ?? [])
      .filter((u: any) => filteredBuildingIds.includes(u.building_id))
      .map((u: any) => u.id);
    result = result.filter((t) => filteredUnitIds.includes(t.unit_id));
  }

  return result;
}

/** Fetch all active turnovers across all properties — for the Countdown view */
export async function getAllActiveTurnovers() {
  return getTurnovers(); // no filters = all org turnovers
}

export async function createTurnover(input: unknown) {
  return withActionValidation(
    createTurnoverSchema,
    input,
    async (validated) => {
      const { supabase, orgId } = await getOrgId();
      const { template_id, ...turnoverData } = validated;

      const { data: turnover, error } = await supabase
        .from("turnovers")
        .insert({ ...turnoverData, organization_id: orgId })
        .select()
        .single();

      if (error)
        return {
          success: false,
          error: createActionError("DB_ERROR", error.message, 500),
        };

      // Update unit status to turnover
      await supabase
        .from("units")
        .update({ status: "turnover", updated_at: new Date().toISOString() })
        .eq("id", validated.unit_id);

      // If template provided, generate tasks
      if (template_id) {
        const { data: template } = await supabase
          .from("turnover_templates")
          .select("tasks")
          .eq("id", template_id)
          .single();

        if (template?.tasks && Array.isArray(template.tasks)) {
          const tasks = (
            template.tasks as {
              description: string;
              trade?: string;
              estimated_cost?: number;
              sort_order?: number;
            }[]
          ).map((t) => ({
            turnover_id: turnover.id,
            organization_id: orgId,
            description: t.description,
            trade: t.trade ?? null,
            estimated_cost: t.estimated_cost ?? null,
            sort_order: t.sort_order ?? 0,
          }));
          await supabase.from("turnover_tasks").insert(tasks);
        }
      }

      revalidatePath("/ops/properties");
      return { success: true, data: turnover };
    },
  );
}

export async function advanceTurnoverStage(turnoverId: string) {
  const { supabase } = await getOrgId();
  const stages = [
    "notice",
    "vacated",
    "inspection",
    "in_progress",
    "paint",
    "clean",
    "final_qc",
    "ready",
  ];

  const { data: turnover } = await supabase
    .from("turnovers")
    .select("stage, unit_id")
    .eq("id", turnoverId)
    .single();

  if (!turnover) return { success: false, error: "Turnover not found" };

  const currentIdx = stages.indexOf(turnover.stage);
  if (currentIdx >= stages.length - 1)
    return { success: false, error: "Already at final stage" };

  const nextStage = stages[currentIdx + 1];
  const { error } = await supabase
    .from("turnovers")
    .update({ stage: nextStage, updated_at: new Date().toISOString() })
    .eq("id", turnoverId);

  if (error) return { success: false, error: error.message };

  // If moved to ready, update unit status
  if (nextStage === "ready") {
    await supabase
      .from("units")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", turnover.unit_id);
  }

  revalidatePath("/ops/properties");
  return { success: true };
}

export async function assignTurnoverSub(
  turnoverId: string,
  subId: string | null,
) {
  const { supabase } = await getOrgId();
  const { error } = await supabase
    .from("turnovers")
    .update({ assigned_to: subId, updated_at: new Date().toISOString() })
    .eq("id", turnoverId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/properties");
  return { success: true };
}

// ── Turnover Tasks ──

export async function getTurnoverTasks(turnoverId: string) {
  const { supabase } = await getOrgId();
  const { data, error } = await supabase
    .from("turnover_tasks")
    .select("*")
    .eq("turnover_id", turnoverId)
    .order("sort_order")
    .order("created_at");

  if (error) return [];

  const subIds = (data ?? []).map((t: any) => t.assigned_to).filter(Boolean);
  const { data: subs } = subIds.length
    ? await supabase.from("subcontractors").select("id, name").in("id", subIds)
    : { data: [] };
  const subMap = Object.fromEntries((subs ?? []).map((s: any) => [s.id, s]));

  return (data ?? []).map((t: any) => ({
    ...t,
    assigned_name: t.assigned_to ? subMap[t.assigned_to]?.name : null,
  })) as TurnoverTask[];
}

export async function updateTurnoverTaskStatus(taskId: string, status: string) {
  const { supabase } = await getOrgId();
  const updates: any = {
    status,
    ...(status === "completed"
      ? { completed_at: new Date().toISOString() }
      : {}),
  };
  const { error } = await supabase
    .from("turnover_tasks")
    .update(updates)
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/properties");
  return { success: true };
}

// ── Cascading Picker Data ──

export async function getPropertyBuildingUnitTree() {
  const { supabase, orgId } = await getOrgId();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (!properties?.length) return [];

  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, property_id, name, code")
    .eq("organization_id", orgId)
    .order("name");

  const { data: units } = await supabase
    .from("units")
    .select("id, building_id, unit_number, status")
    .eq("organization_id", orgId)
    .order("unit_number");

  return properties.map((p: any) => ({
    ...p,
    buildings: (buildings ?? [])
      .filter((b: any) => b.property_id === p.id)
      .map((b: any) => ({
        ...b,
        units: (units ?? []).filter((u: any) => u.building_id === b.id),
      })),
  }));
}

// ── Turnover Templates ──

const templateTaskSchema = z.object({
  description: z.string().min(1),
  trade: z.string().min(1),
  estimated_cost: z.number().nullable().optional(),
  sort_order: z.number().int(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  tasks: z.array(templateTaskSchema).min(1, "At least one task required"),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  tasks: z.array(templateTaskSchema).min(1, "At least one task required"),
});

export async function getTurnoverTemplates() {
  const { supabase, orgId } = await getOrgId();

  const { data, error } = await supabase
    .from("turnover_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return (data ?? []) as TurnoverTemplate[];
}

export async function createTurnoverTemplate(input: unknown) {
  return withActionValidation(
    createTemplateSchema,
    input,
    async (validated) => {
      const { supabase, orgId } = await getOrgId();
      const { data, error } = await supabase
        .from("turnover_templates")
        .insert({
          name: validated.name,
          description: validated.description ?? null,
          tasks: validated.tasks,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error)
        return {
          success: false,
          error: createActionError("DB_ERROR", error.message, 500),
        };
      revalidatePath("/ops/properties/templates");
      return { success: true, data };
    },
  );
}

export async function updateTurnoverTemplate(input: unknown) {
  return withActionValidation(
    updateTemplateSchema,
    input,
    async (validated) => {
      const { supabase, orgId } = await getOrgId();
      const { data, error } = await supabase
        .from("turnover_templates")
        .update({
          name: validated.name,
          description: validated.description ?? null,
          tasks: validated.tasks,
        })
        .eq("id", validated.id)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (error)
        return {
          success: false,
          error: createActionError("DB_ERROR", error.message, 500),
        };
      revalidatePath("/ops/properties/templates");
      return { success: true, data };
    },
  );
}

export async function createJobFromTurnover(
  turnoverId: string,
  jobTitle?: string,
) {
  const { supabase, orgId } = await getOrgId();

  // Fetch turnover + unit + building + property chain
  const { data: turnover, error: tErr } = await supabase
    .from("turnovers")
    .select("*")
    .eq("id", turnoverId)
    .eq("organization_id", orgId)
    .single();

  if (tErr || !turnover) return { success: false, error: "Turnover not found" };
  if (turnover.job_id)
    return { success: false, error: "Turnover already linked to a job" };

  const { data: unit } = await supabase
    .from("units")
    .select("id, unit_number, building_id")
    .eq("id", turnover.unit_id)
    .single();

  const { data: building } = unit
    ? await supabase
        .from("buildings")
        .select("id, name, code, property_id, address")
        .eq("id", unit.building_id)
        .single()
    : { data: null };

  const { data: property } = building
    ? await supabase
        .from("properties")
        .select("id, name, address, client_id")
        .eq("id", building.property_id)
        .single()
    : { data: null };

  const address = building?.address || property?.address || "";
  const unitLabel = unit?.unit_number ? `Unit ${unit.unit_number}` : "";
  const buildingLabel = building?.name || "";
  const title =
    jobTitle?.trim() || `${unitLabel} — ${buildingLabel} Turnover`.trim();

  // Create job
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      organization_id: orgId,
      title,
      description:
        turnover.notes || `Turnover for ${unitLabel} at ${buildingLabel}`,
      status: "draft",
      urgency: "standard",
      property_address: address,
      address,
      property_id: property?.id ?? null,
      building_id: building?.id ?? null,
      unit_id: unit?.id ?? null,
      client_id: property?.client_id ?? null,
    } as any)
    .select("id, job_number")
    .single();

  if (jobErr || !job)
    return {
      success: false,
      error: "Failed to create job: " + (jobErr?.message || ""),
    };

  // Link turnover to job
  await supabase
    .from("turnovers")
    .update({ job_id: job.id, updated_at: new Date().toISOString() })
    .eq("id", turnoverId);

  // Copy turnover tasks as job_tasks if any exist
  const { data: turnoverTasks } = await supabase
    .from("turnover_tasks")
    .select("description, trade, estimated_cost, sort_order")
    .eq("turnover_id", turnoverId)
    .order("sort_order");

  if (turnoverTasks?.length) {
    await supabase.from("job_tasks").insert(
      turnoverTasks.map(
        (t: any) =>
          ({
            job_id: job.id,
            description: `${t.trade ? t.trade + ": " : ""}${t.description}`,
            quantity: 1,
            unit_price: t.estimated_cost ?? 0,
            is_confirmed: false,
          }) as any,
      ),
    );
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/jobs");
  return {
    success: true,
    data: { jobId: job.id, jobNumber: (job as any).job_number },
  };
}

export async function deleteTurnoverTemplate(templateId: string) {
  const { supabase, orgId } = await getOrgId();
  const { error } = await supabase
    .from("turnover_templates")
    .update({ is_active: false })
    .eq("id", templateId)
    .eq("organization_id", orgId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/properties/templates");
  return { success: true };
}
