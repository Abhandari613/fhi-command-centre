import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("aged_receivables")
      .select("*")
      .order("days_outstanding", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build summary buckets
    const summary = {
      current: { count: 0, total: 0, jobs: [] as any[] },
      "31-60": { count: 0, total: 0, jobs: [] as any[] },
      "61-90": { count: 0, total: 0, jobs: [] as any[] },
      "90+": { count: 0, total: 0, jobs: [] as any[] },
      grand_total: 0,
    };

    for (const row of data || []) {
      const bucket = (row as any).aging_bucket as keyof typeof summary;
      if (bucket in summary && bucket !== "grand_total") {
        const b = summary[bucket] as {
          count: number;
          total: number;
          jobs: any[];
        };
        b.count += 1;
        b.total += Number((row as any).final_invoice_amount);
        b.jobs.push(row);
      }
      summary.grand_total += Number((row as any).final_invoice_amount);
    }

    return NextResponse.json({ summary, receivables: data });
  } catch (err: any) {
    console.error("Aged receivables error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
