"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type PriceSuggestion = {
  task_id: string;
  description: string;
  suggested_quantity: number;
  suggested_unit_price: number;
  confidence: "high" | "medium" | "low";
  based_on: "history" | "estimate";
  reasoning: string;
};

export async function getSuggestedPrices(
  jobId: string,
): Promise<PriceSuggestion[]> {
  const supabase = await createClient();

  // Get unpriced confirmed tasks for this job
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("id, description, quantity, unit_price")
    .eq("job_id", jobId)
    .eq("is_confirmed", true);

  if (!tasks?.length) return [];

  // Get org id
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${appUrl}/api/ai/suggest-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks,
        organizationId: profile?.organization_id,
      }),
    });

    const data = await res.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}

export async function applyPriceSuggestion(
  taskId: string,
  quantity: number,
  unitPrice: number,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_tasks")
    .update({ quantity, unit_price: unitPrice })
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/jobs");
  revalidatePath("/ops/quotes");
  return { success: true };
}

export async function applyAllPriceSuggestions(
  suggestions: { task_id: string; quantity: number; unit_price: number }[],
) {
  const supabase = await createClient();

  for (const s of suggestions) {
    await supabase
      .from("job_tasks")
      .update({ quantity: s.quantity, unit_price: s.unit_price })
      .eq("id", s.task_id);
  }

  revalidatePath("/ops/jobs");
  revalidatePath("/ops/quotes");
  return { success: true };
}
