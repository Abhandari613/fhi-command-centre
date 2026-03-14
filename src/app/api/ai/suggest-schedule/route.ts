import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SCHEDULE_PROMPT = `You are a scheduling assistant for Frank's Home Improvement, a painting and home repair contractor.

Frank's currently scheduled jobs:
{SCHEDULED_JOBS}

Frank needs to schedule this new job:
- Job: {JOB_NUMBER} at {JOB_ADDRESS}
- Tasks: {TASKS}
- Urgency: {URGENCY}

Suggest the best 3 dates for this job, considering:
1. Geographic clustering — schedule near other jobs at nearby addresses to save drive time
2. Workload balance — don't stack too many jobs on one day
3. Urgency — rush jobs should be within 2-3 days
4. Allow reasonable time between jobs

Return JSON:
{
  "suggestions": [
    {
      "date": "YYYY-MM-DD",
      "reason": "Why this date is good",
      "nearby_jobs": ["JOB-XXX at 123 Main St"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "Any scheduling advice for Frank"
}

Return only JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Get the target job
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, job_number, property_address, address, urgency, organization_id",
      )
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get tasks for this job
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("description")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    // Get all scheduled/in-progress jobs for the next 30 days
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const { data: scheduledJobs } = await supabase
      .from("jobs")
      .select("id, job_number, property_address, address, due_date, status")
      .eq("organization_id", (job as any).organization_id)
      .in("status", ["scheduled", "in_progress", "quoted", "approved"])
      .not("due_date", "is", null)
      .lte("due_date", thirtyDaysOut.toISOString().split("T")[0])
      .order("due_date", { ascending: true });

    const scheduledStr = (scheduledJobs || []).length
      ? (scheduledJobs as any[])
          .map(
            (j) =>
              `- ${j.job_number} at ${j.property_address || j.address || "unknown"} on ${j.due_date}`,
          )
          .join("\n")
      : "(No jobs currently scheduled)";

    const tasksStr =
      (tasks || []).map((t: any) => t.description).join(", ") || "No tasks yet";
    const jobAddress =
      (job as any).property_address ||
      (job as any).address ||
      "address unknown";

    const prompt = SCHEDULE_PROMPT.replace("{SCHEDULED_JOBS}", scheduledStr)
      .replace("{JOB_NUMBER}", (job as any).job_number || "NEW")
      .replace("{JOB_ADDRESS}", jobAddress)
      .replace("{TASKS}", tasksStr)
      .replace("{URGENCY}", (job as any).urgency || "standard");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text =
      textBlock && "text" in textBlock ? textBlock.text.trim() : "{}";

    try {
      const cleaned = text
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({
        suggestions: [],
        notes: "Could not generate schedule suggestions",
      });
    }
  } catch (err: any) {
    console.error("Schedule suggest error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
