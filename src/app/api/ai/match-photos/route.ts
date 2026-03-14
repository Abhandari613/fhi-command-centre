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

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { data, mediaType: contentType };
}

const MATCH_PROMPT = `You are helping a painting/home repair contractor match completion photos to specific job tasks.

Here are the tasks for this job:
{TASKS}

I will show you a completion photo. Determine which task(s) this photo best proves as completed.

Return JSON:
{
  "matches": [
    {
      "task_id": "the task id",
      "confidence": number (0-1),
      "reasoning": "brief explanation of why this photo matches this task"
    }
  ]
}

Only match tasks where the photo clearly shows the completed work. A photo can match multiple tasks. If the photo doesn't clearly match any task, return an empty matches array.

Return only JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { jobId, photoIds } = await req.json();

    if (!jobId)
      return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const supabase = getAdminClient();

    // Get confirmed tasks
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("id, description")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    if (!tasks?.length) {
      return NextResponse.json(
        { error: "No confirmed tasks" },
        { status: 400 },
      );
    }

    // Get unlinked photos (or specific photos if photoIds provided)
    let photoQuery = supabase
      .from("job_photos")
      .select("id, url")
      .eq("job_id", jobId)
      .eq("phase", "completion");

    if (photoIds?.length) {
      photoQuery = photoQuery.in("id", photoIds);
    }

    const { data: photos } = await photoQuery;

    if (!photos?.length) {
      return NextResponse.json(
        { error: "No completion photos found" },
        { status: 400 },
      );
    }

    // Get existing links to avoid duplicates
    const { data: existingLinks } = await supabase
      .from("task_photo_links")
      .select("task_id, photo_id")
      .in(
        "photo_id",
        (photos as any[]).map((p) => p.id),
      );

    const linkedSet = new Set(
      (existingLinks || []).map((l: any) => `${l.photo_id}:${l.task_id}`),
    );

    const tasksStr = (tasks as any[])
      .map((t) => `- ID: ${t.id}, Task: "${t.description}"`)
      .join("\n");

    const allMatches: {
      photoId: string;
      taskId: string;
      confidence: number;
      reasoning: string;
    }[] = [];

    for (const photo of photos as any[]) {
      try {
        const { data: imgData, mediaType } = await fetchImageAsBase64(
          photo.url,
        );
        const prompt = MATCH_PROMPT.replace("{TASKS}", tasksStr);

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType as
                      | "image/jpeg"
                      | "image/png"
                      | "image/gif"
                      | "image/webp",
                    data: imgData,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        const text =
          textBlock && "text" in textBlock ? textBlock.text.trim() : "{}";

        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const result = JSON.parse(cleaned);

        for (const match of result.matches || []) {
          const linkKey = `${photo.id}:${match.task_id}`;
          if (!linkedSet.has(linkKey) && match.confidence >= 0.6) {
            allMatches.push({
              photoId: photo.id,
              taskId: match.task_id,
              confidence: match.confidence,
              reasoning: match.reasoning,
            });
          }
        }
      } catch (photoErr) {
        console.error(`Failed to match photo ${photo.id}:`, photoErr);
      }
    }

    return NextResponse.json({
      matches: allMatches,
      totalPhotos: photos.length,
      totalMatches: allMatches.length,
    });
  } catch (err: any) {
    console.error("Photo match error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
