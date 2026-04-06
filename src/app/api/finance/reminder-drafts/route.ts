import { NextRequest, NextResponse } from "next/server";
import { generatePaymentReminderDrafts } from "@/app/actions/payment-reminder-draft-actions";

// GET handler for Vercel cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminderDrafts();
}

// POST handler for manual triggers
export async function POST() {
  return runReminderDrafts();
}

async function runReminderDrafts() {
  try {
    const result = await generatePaymentReminderDrafts();
    return NextResponse.json({
      success: true,
      draftsCreated: result.draftsCreated,
      errors: result.errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Reminder drafts error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
