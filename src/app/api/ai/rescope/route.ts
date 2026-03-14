import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RESCOPE_PROMPT = `You are helping a painting and home repair contractor identify ADDITIONAL work from new on-site photos.

The contractor already has these confirmed scope items:
{EXISTING_TASKS}

Look at the new photo(s) and list ONLY tasks that are NOT already covered by the existing scope. If a task is already listed above (even partially), do NOT include it.

Return a JSON array of strings with specific, trade-relevant task descriptions. If no new work is visible, return an empty array []. Return only the JSON array, no other text.`;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { data, mediaType: contentType };
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, photoUrls } = await req.json();

    if (!jobId || !photoUrls?.length) {
      return NextResponse.json(
        { error: "jobId and photoUrls required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing confirmed tasks
    const { data: existingTasks } = await supabase
      .from("job_tasks")
      .select("description")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    const existingList = (existingTasks || [])
      .map((t: any) => `- ${t.description}`)
      .join("\n") || "- (none yet)";

    const prompt = RESCOPE_PROMPT.replace("{EXISTING_TASKS}", existingList);

    // Build image content blocks
    const imageBlocks: any[] = [];
    for (const url of photoUrls) {
      const { data, mediaType } = await fetchImageAsBase64(url);
      imageBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data,
        },
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text.trim() : "[]";

    let newTasks: string[] = [];
    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        newTasks = parsed;
      }
    } catch {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean);
      newTasks = lines;
    }

    // Get current max scope_round for this job
    const { data: maxRound } = await supabase
      .from("job_tasks")
      .select("scope_round")
      .eq("job_id", jobId)
      .order("scope_round", { ascending: false })
      .limit(1)
      .single();

    const nextRound = ((maxRound as any)?.scope_round || 1) + 1;

    // Insert new tasks as unconfirmed
    if (newTasks.length > 0) {
      const rows = newTasks.map((desc) => ({
        job_id: jobId,
        description: desc,
        quantity: 1,
        unit_price: 0,
        is_confirmed: false,
        scope_round: nextRound,
        source: "on_site_photo",
      }));

      await supabase.from("job_tasks").insert(rows);
    }

    return NextResponse.json({
      newTasks,
      scopeRound: nextRound,
      count: newTasks.length,
    });
  } catch (err: any) {
    console.error("Rescope AI error:", err);
    return NextResponse.json(
      { error: err.message || "AI rescoping failed" },
      { status: 500 }
    );
  }
}
