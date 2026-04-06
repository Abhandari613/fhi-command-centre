import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLASSIFY_PROMPT = `You are an AI assistant for Frank's Home Improvement, a painting and home repair subcontractor.

Frank gets work through a 3-tier chain:
- Property management companies (e.g., MetCap Living, Amica) own the buildings
- A coordinator company (All Professional Trades / APT) manages work for those properties
- Neil Henderson (dispatcher) at APT sends Frank work requests via email
- Coady Gallant (billing) at APT handles invoicing

Classify this incoming email into one of these categories:

1. "new_work" — A request to do work (painting, repairs, turnover, etc.). This is the most common type from Neil.
2. "quote_request" — Frank needs to go look at a unit first and give a price before starting. Look for words like "quote", "estimate", "see this unit", "need a price".
3. "job_update" — An update about an existing job (photos, schedule change, question about ongoing work)
4. "payment_ready" — A cheque or payment is ready for Frank to pick up. Look for words like "cheque", "check", "pick up", "payment ready", "ready for you". Coady Gallant typically sends these.
5. "irrelevant" — Not related to work (spam, newsletter, personal, promotions, automated notifications)

Also extract:
- client_name: The person who sent the work request (usually Neil Henderson, not the property manager)
- property_owner: The property management company if mentioned (e.g., MetCap, Amica, PMC)
- property_address: Any street address or building name + unit number mentioned
- unit_number: The specific unit/apartment number if mentioned (e.g., "#506", "Unit 803", "#1111")
- urgency: "rush" if urgent language is used (rush, asap, urgent, immediately, right away, need completed by [date]), otherwise "standard"
- deadline: Any specific completion date mentioned (e.g., "Need completed by September 26")
- summary: A plain-English 1-2 sentence summary of what Frank needs to do (write it like you're telling a friend what the job is)
- needs_site_visit: true if Frank needs to go look at the unit before pricing (quote requests, "see this unit", etc.)
- existing_job_hint: If this seems related to an existing job, any identifying info (address, job number, prior reference)
- has_scope_pdf: true if the email mentions or attaches a scope document, work order PDF, or checklist
- payment_amount: If a dollar amount is mentioned in a payment/cheque email, extract it (e.g., "$1,250.00"). null if not mentioned.

Return JSON only:
{
  "classification": "new_work" | "quote_request" | "job_update" | "payment_ready" | "irrelevant",
  "payment_amount": string | null,
  "client_name": string | null,
  "property_owner": string | null,
  "property_address": string | null,
  "unit_number": string | null,
  "urgency": "rush" | "standard",
  "deadline": string | null,
  "summary": string,
  "needs_site_visit": boolean,
  "existing_job_hint": string | null,
  "has_scope_pdf": boolean,
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
