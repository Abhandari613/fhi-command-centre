"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createMetricSnapshot(
  metricId: string,
  engagementId: string,
  value: number,
  notes?: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("metric_snapshots")
    .insert({
      relief_metric_id: metricId,
      engagement_id: engagementId,
      measured_value: value,
      measured_at: new Date().toISOString(),
      source: "calibration_cycle",
      notes: notes,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Error creating metric snapshot:", error);
    throw new Error("Failed to create metric snapshot");
  }

  revalidatePath(`/engine/dashboard`);
  return data;
}

export async function createReliefMetric(
  engagementId: string,
  name: string,
  metricType: string,
  unit: string,
  baselineValue: number,
  targetValue: number,
) {
  const supabase = await createClient();

  // Note: 'metric_type' needs to be one of the enum values. Assuming simplified input for now.
  // 'current_date' usage needs to be careful.

  const { data, error } = await supabase
    .from("relief_metrics")
    .insert({
      engagement_id: engagementId,
      name,
      metric_type: metricType as any, // Type cast for flexibility for now, needs validation
      unit,
      baseline_value: baselineValue,
      target_value: targetValue,
      status: "awaiting_baseline",
      baseline_date: new Date().toISOString(), // Default
      baseline_source: "self_report",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating relief metric:", error);
    throw new Error("Failed to create relief metric");
  }

  revalidatePath(`/engine/dashboard`);
  return data;
}

export async function getReliefMetrics(engagementId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("relief_metrics")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching relief metrics:", error);
    throw new Error("Failed to fetch relief metrics");
  }

  return data;
}

export async function getMetricHistory(metricId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("metric_snapshots")
    .select("*")
    .eq("relief_metric_id", metricId)
    .order("measured_at", { ascending: true });

  if (error) {
    console.error("Error fetching metric history:", error);
    return [];
  }

  return data;
}
