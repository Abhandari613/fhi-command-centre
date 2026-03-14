import { NextResponse } from "next/server";
import { processPaymentReminders } from "@/lib/services/payment-reminders";

export async function POST() {
  try {
    const result = await processPaymentReminders();
    return NextResponse.json({
      message: `Sent ${result.sent} reminders, ${result.errors} errors`,
      ...result,
    });
  } catch (err: any) {
    console.error("Payment reminders cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
