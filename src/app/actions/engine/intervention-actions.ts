"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createIntervention(
  engagementId: string,
  name: string,
  description: string,
  type:
    | "automation"
    | "process_change"
    | "tool_integration"
    | "training"
    | "strategic_shift",
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("interventions")
    .insert({
      engagement_id: engagementId,
      name,
      description,
      intervention_type: type,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Error creating intervention:", error);
    throw new Error("Failed to create intervention");
  }

  revalidatePath(`/engine/proposal`);
  return data;
}

export async function getInterventions(engagementId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("interventions")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching interventions:", error);
    throw new Error("Failed to fetch interventions");
  }

  return data;
}
