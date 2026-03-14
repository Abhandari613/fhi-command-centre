"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createEngagement(organizationId: string, name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("engagements")
    .insert({ organization_id: organizationId, name } as any)
    .select()
    .single();

  if (error) {
    console.error("Error creating engagement:", error);
    throw new Error("Failed to create engagement");
  }

  revalidatePath("/engine");
  return data;
}

export async function getEngagements(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("engagements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching engagements:", error);
    throw new Error("Failed to fetch engagements");
  }

  return data;
}

export async function getEngagement(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching engagement:", error);
    throw new Error("Failed to fetch engagement");
  }

  return data;
}
