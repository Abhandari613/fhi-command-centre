import { NextRequest, NextResponse } from "next/server";
import { autoMatchDeposits } from "@/app/actions/finance-auto-match-actions";

// GET handler for Vercel cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runAutoMatch();
}

// POST handler for manual triggers (e.g., after bank statement upload)
export async function POST() {
  return runAutoMatch();
}

async function runAutoMatch() {
  try {
    const result = await autoMatchDeposits();
    return NextResponse.json({
      success: true,
      matched: result.matched,
      flagged: result.flagged,
      skipped: result.skipped,
      details: result.details,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Auto-match error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
