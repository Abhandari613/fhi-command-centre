import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLASSIFY_PROMPT = `You are an AI assistant for Frank's Home Improvement, a painting and home repair contractor.

Classify this incoming email into one of these categories:

1. "new_work" — Someone is requesting work to be done (repairs, painting, renovation, etc.)
2. "quote_request" — Someone wants Frank to come give a quote/estimate (site visit needed)
3. "job_update" — An update about an existing job (photos, schedule change, question about ongoing work)
4. "irrelevant" — Not related to work (spam, newsletter, personal, promotions, automated notifications)

Also extract:
- client_name: The sender's name (if identifiable)
- property_address: Any address mentioned
- urgency: "rush" if urgent language is used, otherwise "standard"
- summary: A 1-2 sentence summary of what they need (for Frank to read at a glance)
- existing_job_hint: If this seems related to an existing job, any identifying info (address, job number, prior reference)

Return JSON only:
{
  "classification": "new_work" | "quote_request" | "job_update" | "irrelevant",
  "client_name": string | null,
  "property_address": string | null,
  "urgency": "rush" | "standard",
  "summary": string,
  "existing_job_hint": string | null,
  "confidence": number (0-1)
}`;

export async function POST(req: NextRequest) {
  try {
    const { from, subject, body } = await req.json();

    if (!subject && !body) {
      return NextResponse.json({ error: "No email content" }, { status: 400 });
    }

    const emailContent = `From: ${from || "Unknown"}\nSubject: ${subject || "(no subject)"}\n\n${body || ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${CLASSIFY_PROMPT}\n\n--- EMAIL ---\n${emailContent}`,
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
        classification: "irrelevant",
        confidence: 0.3,
        summary: "Could not parse email",
        client_name: null,
        property_address: null,
        urgency: "standard",
        existing_job_hint: null,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email classify error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
