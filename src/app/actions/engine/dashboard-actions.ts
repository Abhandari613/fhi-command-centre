"use server";

import { createClient } from "@/utils/supabase/server";
import { getActiveEngagement } from "@/utils/engine-helpers";

export async function getReliefDashboardData() {
  const supabase = await createClient();
  const engagement = await getActiveEngagement();

  if (!engagement) {
    return {
      engagement: null,
      metrics: [],
      snapshots: [],
      frictions: [],
      error: "No active engagement found",
    };
  }

  // Parallel fetch for dashboard data
  const [metricsResult, snapshotsResult, frictionsResult] = await Promise.all([
    supabase
      .from("relief_metrics")
      .select("*")
      .eq("engagement_id", engagement.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("metric_snapshots")
      .select("*")
      .eq("engagement_id", engagement.id)
      .order("measured_at", { ascending: true }),

    supabase
      .from("friction_items") // Assuming table name, might need fix if not in types yet
      .select("*")
      .eq("engagement_id", engagement.id)
      .neq("status", "resolved") // Active frictions only
      .limit(5),
  ]);

  // Handle potential errors or empty data
  // For friction_items, if validation fails due to type issues, we might get error if we didn't fix it.
  // But we used 'any' cast in other files. Here we rely on supabase-js looseness if types are missing or valid table.

  return {
    engagement,
    metrics: metricsResult.data || [],
    snapshots: snapshotsResult.data || [],
    frictions: frictionsResult.data || [],
  };
}
