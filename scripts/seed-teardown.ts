/**
 * UAT Seed Teardown — Removes all data inserted by seed-uat.ts
 *
 * Deletes in reverse FK order to respect constraints.
 * Identifies seed data via SEED-UAT tags and source markers.
 *
 * Usage: npx tsx scripts/seed-teardown.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_TAG = "SEED-UAT";

async function deleteFrom(
  table: string,
  column: string,
  pattern: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .ilike(column, pattern)
    .select("id");
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    return 0;
  }
  return data?.length || 0;
}

async function deleteByOrg(table: string, orgId: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("organization_id", orgId)
    .select("id");
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    return 0;
  }
  return data?.length || 0;
}

async function teardown() {
  console.log("🧹 UAT TEARDOWN — Starting...\n");

  // Get org
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1);
  if (!orgs?.length) {
    console.error("No org found");
    process.exit(1);
  }
  const orgId = orgs[0].id;
  console.log(`📍 Organization: ${orgs[0].name} (${orgId})\n`);

  // Reverse FK order — deepest children first

  // Tier 8: Outcome Engine
  console.log("── Outcome Engine ──");
  // Get engagement IDs for this org
  const { data: engagements } = await supabase
    .from("engagements")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("notes", `%${SEED_TAG}%`);
  const engIds = engagements?.map((e) => e.id) || [];

  if (engIds.length > 0) {
    for (const engId of engIds) {
      // Delete metric snapshots
      const { data: metrics } = await supabase
        .from("relief_metrics")
        .select("id")
        .eq("engagement_id", engId);
      for (const m of metrics || []) {
        await supabase
          .from("metric_snapshots")
          .delete()
          .eq("relief_metric_id", m.id);
      }
      // Delete link tables
      const { data: frictions } = await supabase
        .from("friction_items")
        .select("id")
        .eq("engagement_id", engId);
      for (const f of frictions || []) {
        await supabase
          .from("friction_intervention_links")
          .delete()
          .eq("friction_item_id", f.id);
      }
      const { data: interventions } = await supabase
        .from("interventions")
        .select("id")
        .eq("engagement_id", engId);
      for (const inv of interventions || []) {
        await supabase
          .from("intervention_desire_links")
          .delete()
          .eq("intervention_id", inv.id);
        await supabase
          .from("friction_intervention_links")
          .delete()
          .eq("intervention_id", inv.id);
      }

      // Delete children
      await supabase
        .from("calibration_cycles")
        .delete()
        .eq("engagement_id", engId);
      await supabase.from("relief_metrics").delete().eq("engagement_id", engId);
      await supabase.from("interventions").delete().eq("engagement_id", engId);
      await supabase.from("friction_items").delete().eq("engagement_id", engId);
      await supabase.from("tools").delete().eq("engagement_id", engId);
      await supabase
        .from("process_activities")
        .delete()
        .eq("engagement_id", engId);
      await supabase.from("owner_desires").delete().eq("engagement_id", engId);
    }
    await supabase
      .from("engagements")
      .delete()
      .eq("organization_id", orgId)
      .ilike("notes", `%${SEED_TAG}%`);
    console.log(`  ✓ ${engIds.length} engagements and all children removed`);
  }

  // Tier 7: Notifications, email logs, work order drafts
  console.log("\n── Notifications & Comms ──");
  let n = await deleteByOrg("notifications", orgId);
  console.log(`  ✓ ${n} notifications`);
  n = await deleteByOrg("email_scan_log", orgId);
  console.log(`  ✓ ${n} email scan logs`);
  n = await deleteByOrg("work_order_drafts", orgId);
  console.log(`  ✓ ${n} work order drafts`);
  n = await deleteByOrg("email_sender_rules", orgId);
  console.log(`  ✓ ${n} email sender rules`);

  // Tier 6: Finance
  console.log("\n── Finance ──");
  n = await deleteFrom("finance_transactions", "source_id", `${SEED_TAG}%`);
  // Also catch seed_script source
  const { data: seedTxns } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("source", "seed_script")
    .select("id");
  n += seedTxns?.length || 0;
  console.log(`  ✓ ${n} finance transactions`);
  // job_payouts and payment_reminders tables not yet created — skipped
  n = await deleteByOrg("statement_uploads", orgId);
  console.log(`  ✓ ${n} statement uploads`);
  n = await deleteByOrg("financial_periods", orgId);
  console.log(`  ✓ ${n} financial periods`);
  n = await deleteByOrg("finance_rules", orgId);
  console.log(`  ✓ ${n} finance rules`);
  // recurring_schedules table not yet created — skipped

  // Tier 5: Turnovers
  console.log("\n── Turnovers ──");
  // Delete turnover tasks first
  const { data: turnovers } = await supabase
    .from("turnovers")
    .select("id")
    .eq("organization_id", orgId);
  for (const t of turnovers || []) {
    await supabase.from("turnover_tasks").delete().eq("turnover_id", t.id);
  }
  n = await deleteByOrg("turnovers", orgId);
  console.log(`  ✓ ${n} turnovers`);

  // Tier 4: Job children
  console.log("\n── Job Children ──");
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("organization_id", orgId);
  const jobIds = jobs?.map((j) => j.id) || [];

  let photoCount = 0,
    taskCount = 0,
    eventCount = 0,
    assignCount = 0,
    attachCount = 0;
  for (const jobId of jobIds) {
    const { data: photos } = await supabase
      .from("job_photos")
      .delete()
      .eq("job_id", jobId)
      .select("id");
    photoCount += photos?.length || 0;
    const { data: taskDel } = await supabase
      .from("job_tasks")
      .delete()
      .eq("job_id", jobId)
      .select("id");
    taskCount += taskDel?.length || 0;
    const { data: events } = await supabase
      .from("job_events")
      .delete()
      .eq("job_id", jobId)
      .select("id");
    eventCount += events?.length || 0;
    const { data: assigns } = await supabase
      .from("job_assignments")
      .delete()
      .eq("job_id", jobId)
      .select("id");
    assignCount += assigns?.length || 0;
    const { data: attch } = await supabase
      .from("job_attachments")
      .delete()
      .eq("job_id", jobId)
      .select("id");
    attachCount += attch?.length || 0;
  }
  console.log(
    `  ✓ ${photoCount} photos, ${taskCount} tasks, ${eventCount} events, ${assignCount} assignments`,
  );

  // Tier 3: Jobs
  console.log("\n── Jobs ──");
  n = await deleteByOrg("jobs", orgId);
  console.log(`  ✓ ${n} jobs`);

  // Tier 2: Units, Buildings, Properties
  console.log("\n── Location Hierarchy ──");
  n = await deleteByOrg("units", orgId);
  console.log(`  ✓ ${n} units`);
  n = await deleteByOrg("buildings", orgId);
  console.log(`  ✓ ${n} buildings`);
  n = await deleteByOrg("properties", orgId);
  console.log(`  ✓ ${n} properties`);

  // Tier 1: Clients, Subs, Saved Rates
  console.log("\n── Foundation ──");
  n = await deleteFrom("clients", "notes", `%${SEED_TAG}%`);
  console.log(`  ✓ ${n} clients`);
  n = await deleteByOrg("subcontractors", orgId);
  console.log(`  ✓ ${n} subcontractors`);
  n = await deleteByOrg("saved_rates", orgId);
  console.log(`  ✓ ${n} saved rates`);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("🧹 UAT TEARDOWN COMPLETE");
  console.log("═══════════════════════════════════════════════════════\n");
}

teardown().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
