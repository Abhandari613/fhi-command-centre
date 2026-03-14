import { NextResponse } from "next/server";
import { processRecurringSchedules } from "@/lib/services/recurring-invoices";

export async function POST() {
  try {
    const result = await processRecurringSchedules();
    return NextResponse.json({
      message: `Generated ${result.generated} jobs, ${result.errors} errors`,
      ...result,
    });
  } catch (err: any) {
    console.error("Recurring invoices cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
