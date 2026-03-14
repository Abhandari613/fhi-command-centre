import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCOPE_PROMPT = `You are helping a painting and home repair contractor scope work from apartment inspection photos. List specific tasks visible in this photo as a JSON array of strings. Be concise and trade-specific (e.g. "Paint bedroom walls", "Replace kitchen cabinet doors", "Repair drywall patch approx 12 inch"). Return only the JSON array, no other text.`;

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { data, mediaType: contentType };
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls } = (await req.json()) as { imageUrls: string[] };

    if (!imageUrls?.length) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 },
      );
    }

    const allTasks: string[] = [];

    for (const url of imageUrls) {
      const { data, mediaType } = await fetchImageAsBase64(url);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
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
                  data,
                },
              },
              {
                type: "text",
                text: SCOPE_PROMPT,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const text =
        textBlock && "text" in textBlock ? textBlock.text.trim() : "[]";

      try {
        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const tasks = JSON.parse(cleaned);
        if (Array.isArray(tasks)) {
          allTasks.push(...tasks);
        }
      } catch {
        const lines = text
          .split("\n")
          .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
          .filter(Boolean);
        allTasks.push(...lines);
      }
    }

    return NextResponse.json({ tasks: allTasks });
  } catch (err: any) {
    console.error("Scope photo AI error:", err);
    return NextResponse.json(
      { error: err.message || "AI processing failed" },
      { status: 500 },
    );
  }
}
