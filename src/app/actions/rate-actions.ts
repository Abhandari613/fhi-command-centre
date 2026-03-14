"use server";

import { createClient } from "@/utils/supabase/server";

const DEFAULT_RATES: Record<string, number> = {
  "Paint room": 150,
  "Paint ceiling": 80,
  "Cabinet painting (per door)": 35,
  "Drywall patch (small)": 95,
  "Tile repair (per sq ft)": 25,
};

async function getOrgId(): Promise<string | null> {
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

  return profile?.organization_id || null;
}

export async function getSavedRates(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return DEFAULT_RATES;

  const { data } = await (supabase
    .from("saved_rates" as any)
    .select("task_name, unit_price")
    .eq("organization_id", orgId) as any);

  if (!data || data.length === 0) {
    // Seed defaults on first access
    const rows = Object.entries(DEFAULT_RATES).map(
      ([task_name, unit_price]) => ({
        organization_id: orgId,
        task_name,
        unit_price,
      }),
    );
    await (supabase.from("saved_rates" as any) as any).insert(rows);
    return DEFAULT_RATES;
  }

  const rates: Record<string, number> = {};
  for (const r of data as any[]) {
    rates[r.task_name] = r.unit_price;
  }
  return rates;
}

export async function upsertRate(taskName: string, unitPrice: number) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return { success: false, error: "No organization" };

  const { error } = await (supabase.from("saved_rates" as any) as any).upsert(
    {
      organization_id: orgId,
      task_name: taskName,
      unit_price: unitPrice,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: "organization_id,task_name" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
