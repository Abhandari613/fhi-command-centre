"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type ServiceItem = {
  id: string;
  task_name: string;
  description: string | null;
  unit_price: number;
  default_quantity: number;
  item_type: "labor" | "material" | "flat_rate";
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function getOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, orgId: profile?.organization_id as string | undefined };
}

export async function getServicesCatalog(): Promise<ServiceItem[]> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return [];

  const { data, error } = await (ctx.supabase as any)
    .from("saved_rates")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .eq("is_active", true)
    .order("task_name", { ascending: true });

  if (error) {
    console.error("Failed to fetch services catalog:", error);
    return [];
  }

  return (data || []) as ServiceItem[];
}

export async function upsertServiceItem(input: {
  id?: string;
  task_name: string;
  description?: string;
  unit_price: number;
  default_quantity?: number;
  item_type?: string;
  category_id?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return { success: false, error: "Unauthorized" };

  const payload = {
    organization_id: ctx.orgId,
    task_name: input.task_name,
    description: input.description || null,
    unit_price: input.unit_price,
    default_quantity: input.default_quantity || 1,
    item_type: input.item_type || "labor",
    category_id: input.category_id || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await (ctx.supabase as any)
      .from("saved_rates")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", ctx.orgId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/ops/finance");
    return { success: true, id: input.id };
  }

  const { data, error } = await (ctx.supabase as any)
    .from("saved_rates")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance");
  return { success: true, id: data.id };
}

export async function deactivateServiceItem(
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return { success: false, error: "Unauthorized" };

  const { error } = await (ctx.supabase as any)
    .from("saved_rates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("organization_id", ctx.orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance");
  return { success: true };
}
