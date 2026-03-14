import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_PROMPT = `You are helping a painting and home repair contractor extract work tasks from an email description.

Read the email and identify specific tasks that need to be done. Be trade-specific and practical:
- "Paint bedroom walls" not "painting"
- "Replace kitchen faucet" not "plumbing work"
- "Patch drywall hole ~12 inch in hallway" not "wall repair"

If the email mentions wanting a quote/estimate, still extract the tasks they're describing.
If the email is vague ("I need some work done"), return what you can identify, even if it's just one general task.

Return a JSON object:
{
  "tasks": ["task description 1", "task description 2"],
  "needs_site_visit": boolean, // true if tasks are unclear and Frank should visit first
  "notes": "any context Frank should know" // e.g. "Client mentioned they have their own paint"
}

Return only JSON, no other text.`;

export async function POST(req: NextRequest) {
  try {
    const { subject, body } = await req.json();

    if (!subject && !body) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 },
      );
    }

    const emailContent = `Subject: ${subject || "(no subject)"}\n\n${body || ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${EXTRACT_PROMPT}\n\n--- EMAIL ---\n${emailContent}`,
        },
      ],
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
        tasks: [],
        needs_site_visit: true,
        notes: "Could not parse email for tasks",
      });
    }
  } catch (err: any) {
    console.error("Extract tasks error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
