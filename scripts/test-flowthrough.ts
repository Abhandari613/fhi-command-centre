/**
 * Flow-Through Integration Test — Handoff Validation
 *
 * Walks real data through every status transition pipeline using the app's
 * actual FSM logic + direct DB operations (service role, no Next.js context).
 *
 * Pipelines tested:
 *   1. Job Pipeline: incoming → draft → quoted → sent → approved → scheduled → in_progress → completed → invoiced → paid
 *   2. Turnover Pipeline: notice → vacated → inspection → in_progress → paint → clean → final_qc → ready
 *   3. Finance Transaction Classification: INGESTED → AUTO_CLASSIFIED → CONFIRMED
 *   4. Work Order Draft → Job Creation
 *
 * Usage: npx tsx scripts/test-flowthrough.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Import FSM validation (pure functions, no Next.js deps)
import {
  JobStatus,
  JOB_STATUS_FLOW,
  canTransition,
  checkConstraints,
} from "../src/lib/fsm/job-state";

// ─── ENV SETUP ──────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_ID = "9f05bb19-3913-4590-9d6e-82804e9cd094";
const TEST_TAG = "FLOWTHROUGH-TEST";

// ─── Test tracking ──────────────────────────────────────────────────────────

interface TestResult {
  pipeline: string;
  transition: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const results: TestResult[] = [];
const createdIds: { table: string; id: string }[] = [];

function record(
  pipeline: string,
  transition: string,
  passed: boolean,
  expected: string,
  actual: string,
) {
  results.push({ pipeline, transition, passed, expected, actual });
  const icon = passed ? "✓" : "✗";
  console.log(
    `  ${icon} ${transition}: ${passed ? "PASS" : `FAIL (expected: ${expected}, got: ${actual})`}`,
  );
}

// Track IDs for cleanup
function track(table: string, id: string) {
  createdIds.push({ table, id });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getSalesCategoryId(): Promise<string | null> {
  const { data } = await supabase
    .from("tax_categories")
    .select("id")
    .eq("name", "Sales / Revenue")
    .single();
  return data?.id ?? null;
}

async function getOrCreateClient(): Promise<string> {
  // Find existing seed client or create one
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", ORG_ID)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("clients")
    .insert({
      organization_id: ORG_ID,
      name: `${TEST_TAG} Client`,
      type: "Residential",
      notes: TEST_TAG,
    })
    .select("id")
    .single();

  if (created) track("clients", created.id);
  return created!.id;
}

// ─── PIPELINE 1: Job Status Transitions ─────────────────────────────────────

async function testJobPipeline() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("PIPELINE 1: Job Status (10 transitions)");
  console.log("═══════════════════════════════════════════════════════\n");

  const clientId = await getOrCreateClient();

  // Create a test job at "incoming"
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      organization_id: ORG_ID,
      client_id: clientId,
      title: `${TEST_TAG} — Flow-Through Test Job`,
      description: `Automated flow-through test. ${TEST_TAG}`,
      status: "incoming",
      urgency: "standard",
      property_address: "123 Test St",
      address: "123 Test St",
    } as any)
    .select("*")
    .single();

  if (jobErr || !job) {
    console.error("  ✗ Failed to create test job:", jobErr?.message);
    record("Job", "create", false, "job created", jobErr?.message || "no data");
    return;
  }

  track("jobs", job.id);
  record("Job", "create → incoming", true, "incoming", job.status);

  // Add confirmed tasks so invoicing can calculate a total
  const { data: task } = await supabase
    .from("job_tasks")
    .insert({
      job_id: job.id,
      description: `${TEST_TAG} task — kitchen repair`,
      quantity: 2,
      unit_price: 150,
      is_confirmed: true,
    } as any)
    .select("id")
    .single();

  if (task) track("job_tasks", task.id);

  // Walk the happy path
  const transitions: JobStatus[] = [
    "draft",
    "quoted",
    "sent",
    "approved",
    "scheduled",
    "in_progress",
    "completed",
    "invoiced",
    "paid",
  ];

  let currentStatus: JobStatus = "incoming";

  for (const nextStatus of transitions) {
    // 1. FSM validation
    const fsmOk = canTransition(currentStatus, nextStatus);
    if (!fsmOk) {
      record(
        "Job",
        `${currentStatus} → ${nextStatus}`,
        false,
        "FSM allows",
        "FSM blocked",
      );
      break;
    }

    // 2. Check constraints (fetch fresh job state)
    const { data: freshJob } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job.id)
      .single();

    const constraint = checkConstraints(freshJob, nextStatus);
    if (constraint) {
      record(
        "Job",
        `${currentStatus} → ${nextStatus}`,
        false,
        "no constraint",
        constraint,
      );
      break;
    }

    // 3. Apply transition
    const { error: updateErr } = await supabase
      .from("jobs")
      .update({ status: nextStatus })
      .eq("id", job.id);

    if (updateErr) {
      record(
        "Job",
        `${currentStatus} → ${nextStatus}`,
        false,
        "update OK",
        updateErr.message,
      );
      break;
    }

    // 4. Log job event (replicate server action side effect)
    const { data: evt } = await supabase
      .from("job_events")
      .insert({
        job_id: job.id,
        event_type: "status_change",
        metadata: { from: currentStatus, to: nextStatus, source: TEST_TAG },
      })
      .select("id")
      .single();

    if (evt) track("job_events", evt.id);

    // 5. Status-specific side effects
    if (nextStatus === "completed") {
      const { data: completedEvt } = await supabase
        .from("job_events")
        .insert({
          job_id: job.id,
          event_type: "status_completed",
          metadata: { note: "Job marked complete", source: TEST_TAG },
        })
        .select("id")
        .single();
      if (completedEvt) track("job_events", completedEvt.id);
    }

    if (nextStatus === "invoiced") {
      // Calculate invoice from confirmed tasks (replicates job-actions.ts logic)
      const { data: tasks } = await supabase
        .from("job_tasks")
        .select("quantity, unit_price")
        .eq("job_id", job.id)
        .eq("is_confirmed", true);

      const total = (tasks || []).reduce(
        (sum: number, t: any) =>
          sum + Number(t.quantity) * Number(t.unit_price),
        0,
      );

      // NOTE: final_invoice_amount / invoiced_at / paid_at columns don't exist yet.
      // The server actions use `as any` so updates silently fail.
      // We test that task total calculation works and log the schema gap.
      const { error: invoiceUpdateErr } = await supabase
        .from("jobs")
        .update({
          final_invoice_amount: total > 0 ? total : null,
          invoiced_at: new Date().toISOString(),
        } as any)
        .eq("id", job.id);

      if (invoiceUpdateErr) {
        record(
          "Job",
          "invoiced side-effect (invoice columns)",
          false,
          `columns exist, total=${total}`,
          `SCHEMA GAP: ${invoiceUpdateErr.message} — needs migration to add final_invoice_amount, invoiced_at, paid_at`,
        );
      } else {
        const { data: invoicedJob } = await supabase
          .from("jobs")
          .select("final_invoice_amount, invoiced_at")
          .eq("id", job.id)
          .single();

        record(
          "Job",
          "invoiced side-effect (invoice amount)",
          invoicedJob?.invoiced_at != null,
          `total=${total}, invoiced_at set`,
          `amount=${invoicedJob?.final_invoice_amount}, invoiced_at=${invoicedJob?.invoiced_at}`,
        );
      }
    }

    if (nextStatus === "paid") {
      // paid_at column may not exist yet (same schema gap as invoiced_at)
      await supabase
        .from("jobs")
        .update({ paid_at: new Date().toISOString() } as any)
        .eq("id", job.id);

      // Record revenue using the task-calculated total (since DB column may not exist)
      // In production, this reads final_invoice_amount from the job row.
      const { data: confirmedTasks } = await supabase
        .from("job_tasks")
        .select("quantity, unit_price")
        .eq("job_id", job.id)
        .eq("is_confirmed", true);

      const invoiceAmt = (confirmedTasks || []).reduce(
        (sum: number, t: any) =>
          sum + Number(t.quantity) * Number(t.unit_price),
        0,
      );

      if (invoiceAmt > 0) {
        const categoryId = await getSalesCategoryId();
        const { data: txn, error: txnErr } = await supabase
          .from("finance_transactions")
          .insert({
            organization_id: ORG_ID,
            amount: invoiceAmt,
            description: `${TEST_TAG} Job revenue payment`,
            transaction_date: new Date().toISOString().split("T")[0],
            job_id: job.id,
            category_id: categoryId,
            status: "CONFIRMED",
            confidence_score: 1.0,
            rationale: `${TEST_TAG} Auto-recorded from job completion`,
            source: "job_completion",
            source_id: `${TEST_TAG}-revenue-${job.id.slice(0, 8)}`,
          })
          .select("id")
          .single();

        if (txn) track("finance_transactions", txn.id);

        record(
          "Job",
          "paid side-effect (revenue recorded)",
          !!txn,
          "finance_transaction created",
          txn ? `txn ${txn.id}` : `failed: ${txnErr?.message}`,
        );
      }
    }

    // 6. Verify DB state
    const { data: verifyJob } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", job.id)
      .single();

    const dbStatus = verifyJob?.status;
    record(
      "Job",
      `${currentStatus} → ${nextStatus}`,
      dbStatus === nextStatus,
      nextStatus,
      dbStatus || "null",
    );

    // Verify event was logged
    const { count: eventCount } = await supabase
      .from("job_events")
      .select("*", { count: "exact", head: true })
      .eq("job_id", job.id)
      .eq("event_type", "status_change");

    currentStatus = nextStatus;
  }

  // Verify total events logged
  const { count: totalEvents } = await supabase
    .from("job_events")
    .select("*", { count: "exact", head: true })
    .eq("job_id", job.id);

  console.log(`\n  📊 Total job_events logged: ${totalEvents}`);
}

// ─── PIPELINE 2: Turnover Stages ────────────────────────────────────────────

async function testTurnoverPipeline() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("PIPELINE 2: Turnover Stages (7 transitions)");
  console.log("═══════════════════════════════════════════════════════\n");

  // Create property → building → unit → turnover chain
  const { data: property } = await supabase
    .from("properties")
    .insert({
      organization_id: ORG_ID,
      name: `${TEST_TAG} Property`,
      address: "456 Test Ave",
    })
    .select("id")
    .single();

  if (!property) {
    record("Turnover", "setup", false, "property created", "insert failed");
    return;
  }
  track("properties", property.id);

  const { data: building } = await supabase
    .from("buildings")
    .insert({
      organization_id: ORG_ID,
      property_id: property.id,
      name: `${TEST_TAG} Building A`,
    })
    .select("id")
    .single();

  if (!building) {
    record("Turnover", "setup", false, "building created", "insert failed");
    return;
  }
  track("buildings", building.id);

  const { data: unit } = await supabase
    .from("units")
    .insert({
      organization_id: ORG_ID,
      building_id: building.id,
      unit_number: "FT-101",
      status: "turnover",
    })
    .select("id")
    .single();

  if (!unit) {
    record("Turnover", "setup", false, "unit created", "insert failed");
    return;
  }
  track("units", unit.id);

  const { data: turnover } = await supabase
    .from("turnovers")
    .insert({
      organization_id: ORG_ID,
      unit_id: unit.id,
      stage: "notice",
      move_out_date: new Date().toISOString().split("T")[0],
      notes: TEST_TAG,
    })
    .select("*")
    .single();

  if (!turnover) {
    record("Turnover", "setup", false, "turnover created", "insert failed");
    return;
  }
  track("turnovers", turnover.id);
  record("Turnover", "create → notice", true, "notice", turnover.stage);

  // Walk through stages (replicates advanceTurnoverStage logic)
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

  for (let i = 0; i < stages.length - 1; i++) {
    const currentStage = stages[i];
    const nextStage = stages[i + 1];

    // Fetch current state
    const { data: currentTurnover } = await supabase
      .from("turnovers")
      .select("stage, unit_id")
      .eq("id", turnover.id)
      .single();

    if (!currentTurnover || currentTurnover.stage !== currentStage) {
      record(
        "Turnover",
        `${currentStage} → ${nextStage}`,
        false,
        currentStage,
        currentTurnover?.stage || "null",
      );
      break;
    }

    // Advance stage
    const { error: advanceErr } = await supabase
      .from("turnovers")
      .update({ stage: nextStage, updated_at: new Date().toISOString() })
      .eq("id", turnover.id);

    if (advanceErr) {
      record(
        "Turnover",
        `${currentStage} → ${nextStage}`,
        false,
        "update OK",
        advanceErr.message,
      );
      break;
    }

    // If moved to ready, update unit status (replicates advanceTurnoverStage side effect)
    if (nextStage === "ready") {
      await supabase
        .from("units")
        .update({ status: "ready", updated_at: new Date().toISOString() })
        .eq("id", unit.id);

      const { data: readyUnit } = await supabase
        .from("units")
        .select("status")
        .eq("id", unit.id)
        .single();

      record(
        "Turnover",
        "ready side-effect (unit status → ready)",
        readyUnit?.status === "ready",
        "ready",
        readyUnit?.status || "null",
      );
    }

    // Verify
    const { data: verifyTurnover } = await supabase
      .from("turnovers")
      .select("stage")
      .eq("id", turnover.id)
      .single();

    record(
      "Turnover",
      `${currentStage} → ${nextStage}`,
      verifyTurnover?.stage === nextStage,
      nextStage,
      verifyTurnover?.stage || "null",
    );
  }
}

// ─── PIPELINE 3: Finance Transaction Classification ─────────────────────────

async function testFinancePipeline() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("PIPELINE 3: Finance Transaction Classification (2 transitions)");
  console.log("═══════════════════════════════════════════════════════\n");

  // Create a transaction at INGESTED status
  const { data: txn, error: txnErr } = await supabase
    .from("finance_transactions")
    .insert({
      organization_id: ORG_ID,
      amount: -42.5,
      description: `${TEST_TAG} Office supplies purchase`,
      transaction_date: new Date().toISOString().split("T")[0],
      status: "INGESTED",
      source: TEST_TAG,
      source_id: `${TEST_TAG}-${uuidv4().slice(0, 8)}`,
    })
    .select("*")
    .single();

  if (txnErr || !txn) {
    record(
      "Finance",
      "create → INGESTED",
      false,
      "txn created",
      txnErr?.message || "no data",
    );
    return;
  }
  track("finance_transactions", txn.id);
  record("Finance", "create → INGESTED", true, "INGESTED", txn.status);

  // Transition: INGESTED → AUTO_CLASSIFIED (simulate rule-based classification)
  const categoryId = await getSalesCategoryId();

  const { error: classifyErr } = await supabase
    .from("finance_transactions")
    .update({
      status: "AUTO_CLASSIFIED",
      category_id: categoryId,
      confidence_score: 0.85,
      rationale: `${TEST_TAG} Auto-classified by rule match`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", txn.id);

  if (classifyErr) {
    record(
      "Finance",
      "INGESTED → AUTO_CLASSIFIED",
      false,
      "update OK",
      classifyErr.message,
    );
  } else {
    const { data: classified } = await supabase
      .from("finance_transactions")
      .select("status, category_id, confidence_score")
      .eq("id", txn.id)
      .single();

    record(
      "Finance",
      "INGESTED → AUTO_CLASSIFIED",
      classified?.status === "AUTO_CLASSIFIED" &&
        classified?.category_id != null,
      "AUTO_CLASSIFIED with category",
      `status=${classified?.status}, category=${classified?.category_id ? "set" : "null"}`,
    );
  }

  // Transition: AUTO_CLASSIFIED → CONFIRMED (user confirms classification)
  const { error: confirmErr } = await supabase
    .from("finance_transactions")
    .update({
      status: "CONFIRMED",
      confidence_score: 1.0,
      rationale: `${TEST_TAG} User confirmed`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", txn.id);

  if (confirmErr) {
    record(
      "Finance",
      "AUTO_CLASSIFIED → CONFIRMED",
      false,
      "update OK",
      confirmErr.message,
    );
  } else {
    const { data: confirmed } = await supabase
      .from("finance_transactions")
      .select("status, confidence_score")
      .eq("id", txn.id)
      .single();

    record(
      "Finance",
      "AUTO_CLASSIFIED → CONFIRMED",
      confirmed?.status === "CONFIRMED" &&
        Number(confirmed?.confidence_score) === 1.0,
      "CONFIRMED with score=1.0",
      `status=${confirmed?.status}, score=${confirmed?.confidence_score}`,
    );
  }
}

// ─── PIPELINE 4: Work Order Draft → Job Creation ────────────────────────────

async function testDraftToJobPipeline() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("PIPELINE 4: Work Order Draft → Job Creation");
  console.log("═══════════════════════════════════════════════════════\n");

  // Create a work order draft (simulates email ingestion)
  // Schema: id, organization_id, raw_content, source, status, extracted_data (jsonb), created_at, updated_at
  const { data: draft, error: draftErr } = await supabase
    .from("work_order_drafts")
    .insert({
      organization_id: ORG_ID,
      status: "needs_review",
      raw_content: `${TEST_TAG} — Tenant reports leaking faucet in unit 201`,
      source: "email",
      extracted_data: {
        address: "789 Flow-Through Blvd, Unit 201",
        trade: "Plumbing",
        scope: "Fix leaking kitchen faucet",
      },
    })
    .select("*")
    .single();

  if (draftErr || !draft) {
    record(
      "Draft→Job",
      "create draft",
      false,
      "draft created",
      draftErr?.message || "no data",
    );
    return;
  }
  track("work_order_drafts", draft.id);
  record(
    "Draft→Job",
    "create draft → needs_review",
    true,
    "needs_review",
    draft.status,
  );

  // Approve the draft: create a job at "incoming" (replicates approveWorkOrderDraft logic)
  const clientId = await getOrCreateClient();

  const { data: newJob, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      organization_id: ORG_ID,
      client_id: clientId,
      title: `Plumbing — 789 Flow-Through Blvd, Unit 201`,
      description: "Fix leaking kitchen faucet",
      status: "incoming",
      urgency: "standard",
      property_address: "789 Flow-Through Blvd, Unit 201",
      address: "789 Flow-Through Blvd, Unit 201",
      source_email_body: draft.raw_content,
    } as any)
    .select("id, job_number, status")
    .single();

  if (jobErr || !newJob) {
    record(
      "Draft→Job",
      "approve → create job",
      false,
      "job created at incoming",
      jobErr?.message || "no data",
    );
    return;
  }
  track("jobs", newJob.id);

  // Create a task from the scope
  const { data: jobTask } = await supabase
    .from("job_tasks")
    .insert({
      job_id: newJob.id,
      description: "Plumbing: Fix leaking kitchen faucet",
      quantity: 1,
      unit_price: 0,
      is_confirmed: false,
    } as any)
    .select("id")
    .single();

  if (jobTask) track("job_tasks", jobTask.id);

  // Update draft status to approved
  await supabase
    .from("work_order_drafts")
    .update({ status: "approved" })
    .eq("id", draft.id);

  // Verify: job exists at "incoming", draft is "approved"
  const { data: verifyJob } = await supabase
    .from("jobs")
    .select("status, title")
    .eq("id", newJob.id)
    .single();

  const { data: verifyDraft } = await supabase
    .from("work_order_drafts")
    .select("status")
    .eq("id", draft.id)
    .single();

  record(
    "Draft→Job",
    "approve → job at incoming",
    verifyJob?.status === "incoming",
    "incoming",
    verifyJob?.status || "null",
  );

  record(
    "Draft→Job",
    "draft status → approved",
    verifyDraft?.status === "approved",
    "approved",
    verifyDraft?.status || "null",
  );

  // Verify task was attached
  const { count: taskCount } = await supabase
    .from("job_tasks")
    .select("*", { count: "exact", head: true })
    .eq("job_id", newJob.id);

  record(
    "Draft→Job",
    "job_task created",
    (taskCount || 0) >= 1,
    "≥1 task",
    `${taskCount} tasks`,
  );
}

// ─── CLEANUP ────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("CLEANUP");
  console.log("═══════════════════════════════════════════════════════\n");

  // Delete in reverse order (deepest children first)
  const deleteOrder = [
    "finance_transactions",
    "job_events",
    "job_tasks",
    "jobs",
    "work_order_drafts",
    "turnovers",
    "units",
    "buildings",
    "properties",
    "clients",
  ];

  for (const table of deleteOrder) {
    const idsForTable = createdIds
      .filter((r) => r.table === table)
      .map((r) => r.id);

    if (idsForTable.length === 0) continue;

    const { error } = await supabase.from(table).delete().in("id", idsForTable);

    if (error) {
      console.log(`  ⚠ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}: ${idsForTable.length} rows deleted`);
    }
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("FLOW-THROUGH INTEGRATION TEST");
  console.log(`Tag: ${TEST_TAG}  |  Org: ${ORG_ID}`);
  console.log("═══════════════════════════════════════════════════════");

  try {
    await testJobPipeline();
    await testTurnoverPipeline();
    await testFinancePipeline();
    await testDraftToJobPipeline();
  } catch (err) {
    console.error("\nFATAL ERROR:", err);
  }

  // Cleanup
  await cleanup();

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (failed > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(
        `  ✗ [${r.pipeline}] ${r.transition}: expected "${r.expected}", got "${r.actual}"`,
      );
    }
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
