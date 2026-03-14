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

const PRICE_PROMPT = `You are helping a painting and home repair contractor auto-fill prices for job tasks.

Here are the contractor's historical prices for similar work:
{HISTORY}

For each task below, suggest a unit_price and quantity based on the history above. If no history matches, use your knowledge of typical contractor pricing for residential work in the US.

Tasks to price:
{TASKS}

Return JSON array:
[
  {
    "task_id": "the task id",
    "description": "the task description",
    "suggested_quantity": number,
    "suggested_unit_price": number,
    "confidence": "high" | "medium" | "low",
    "based_on": "history" | "estimate",
    "reasoning": "brief explanation"
  }
]

Return only the JSON array.`;

export async function POST(req: NextRequest) {
  try {
    const { tasks, organizationId } = await req.json();

    if (!tasks?.length) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch historical pricing data from completed jobs
    const { data: historicalTasks } = await supabase
      .from("job_tasks")
      .select(
        `
        description,
        quantity,
        unit_price,
        job:jobs!inner(status, organization_id)
      `,
      )
      .eq("is_confirmed", true)
      .gt("unit_price", 0)
      .order("created_at", { ascending: false })
      .limit(200);

    // Also check saved_rates table (schema: id, organization_id, task_name, unit_price)
    const { data: savedRates } = await supabase
      .from("saved_rates")
      .select("*")
      .limit(100);

    // Build history string
    const historyLines: string[] = [];

    if (historicalTasks?.length) {
      const seen = new Set<string>();
      for (const t of historicalTasks as any[]) {
        const key = `${t.description}|${t.unit_price}`;
        if (!seen.has(key)) {
          seen.add(key);
          historyLines.push(
            `- "${t.description}" → qty ${t.quantity}, $${t.unit_price}/unit`,
          );
        }
      }
    }

    if (savedRates?.length) {
      for (const r of savedRates as any[]) {
        historyLines.push(
          `- "${r.task_name}" → $${r.unit_price}/unit (saved rate)`,
        );
      }
    }

    const historyStr = historyLines.length
      ? historyLines.join("\n")
      : "(No pricing history yet — use general contractor pricing knowledge)";

    const tasksStr = tasks
      .map((t: any) => `- ID: ${t.id}, Description: "${t.description}"`)
      .join("\n");

    const prompt = PRICE_PROMPT.replace("{HISTORY}", historyStr).replace(
      "{TASKS}",
      tasksStr,
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text =
      textBlock && "text" in textBlock ? textBlock.text.trim() : "[]";

    try {
      const cleaned = text
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const suggestions = JSON.parse(cleaned);
      return NextResponse.json({ suggestions });
    } catch {
      return NextResponse.json({
        suggestions: [],
        error: "Could not parse AI response",
      });
    }
  } catch (err: any) {
    console.error("Suggest prices error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
