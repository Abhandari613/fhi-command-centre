"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type RecurringSchedule = {
  id: string;
  client_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  next_due: string;
  end_date: string | null;
  is_active: boolean;
  line_items: { description: string; quantity: number; unit_price: number }[];
  deposit_required: boolean;
  deposit_amount: number | null;
  last_generated_at: string | null;
  created_at: string;
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

export async function getRecurringSchedules(): Promise<RecurringSchedule[]> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return [];

  const { data, error } = await (ctx.supabase as any)
    .from("recurring_schedules")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .order("next_due", { ascending: true });

  if (error) {
    console.error("Failed to fetch recurring schedules:", error);
    return [];
  }

  return (data || []) as RecurringSchedule[];
}

export async function createRecurringSchedule(input: {
  client_id: string;
  location_id?: string;
  title: string;
  description?: string;
  frequency: string;
  next_due: string;
  end_date?: string;
  line_items: { description: string; quantity: number; unit_price: number }[];
  deposit_required?: boolean;
  deposit_amount?: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return { success: false, error: "Unauthorized" };

  const { data, error } = await (ctx.supabase as any)
    .from("recurring_schedules")
    .insert({
      organization_id: ctx.orgId,
      client_id: input.client_id,
      location_id: input.location_id || null,
      title: input.title,
      description: input.description || null,
      frequency: input.frequency,
      next_due: input.next_due,
      end_date: input.end_date || null,
      line_items: input.line_items,
      deposit_required: input.deposit_required || false,
      deposit_amount: input.deposit_amount || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance");
  return { success: true, id: data.id };
}

export async function updateRecurringSchedule(
  scheduleId: string,
  updates: Partial<{
    title: string;
    description: string;
    frequency: string;
    next_due: string;
    end_date: string | null;
    is_active: boolean;
    line_items: { description: string; quantity: number; unit_price: number }[];
    deposit_required: boolean;
    deposit_amount: number | null;
  }>,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getOrgId();
  if (!ctx?.orgId) return { success: false, error: "Unauthorized" };

  const { error } = await (ctx.supabase as any)
    .from("recurring_schedules")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", scheduleId)
    .eq("organization_id", ctx.orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/finance");
  return { success: true };
}

export async function deactivateRecurringSchedule(
  scheduleId: string,
): Promise<{ success: boolean; error?: string }> {
  return updateRecurringSchedule(scheduleId, { is_active: false });
}
