import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SCOPE_PROMPT = `You are helping a painting and home repair contractor scope work from apartment inspection photos. List specific tasks visible in this photo as a JSON array of strings. Be concise and trade-specific (e.g. 'Paint bedroom walls', 'Replace kitchen cabinet doors', 'Repair drywall patch approx 12 inch'). Return only the JSON array.`;

export async function POST(req: NextRequest) {
  try {
    const { imageUrls } = (await req.json()) as { imageUrls: string[] };

    if (!imageUrls?.length) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const allTasks: string[] = [];

    for (const url of imageUrls) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SCOPE_PROMPT },
              { type: "image_url", image_url: { url, detail: "low" } },
            ],
          },
        ],
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content?.trim() || "[]";
      try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const tasks = JSON.parse(cleaned);
        if (Array.isArray(tasks)) {
          allTasks.push(...tasks);
        }
      } catch {
        // If parsing fails, try line-by-line
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
      { status: 500 }
    );
  }
}
