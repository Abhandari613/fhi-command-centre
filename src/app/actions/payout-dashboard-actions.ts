"use server";

import { createClient } from "@/utils/supabase/server";

async function getDb() {
  return (await createClient()) as any;
}

export type SubPayoutSummary = {
  subcontractor_id: string;
  name: string;
  email: string | null;
  total_earned: number;
  total_paid: number;
  outstanding: number;
  jobs_worked: number;
  last_payout_date: string | null;
};

export type PayoutPeriod = {
  start: string;
  end: string;
  label: string;
  subs: {
    subcontractor_id: string;
    name: string;
    jobs: {
      job_id: string;
      job_number: string;
      address: string;
      amount: number;
      paid: boolean;
    }[];
    total_due: number;
    total_paid: number;
  }[];
  grand_total_due: number;
  grand_total_paid: number;
};

function getCurrentBiweeklyPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (day <= 15) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15),
    };
  } else {
    return {
      start: new Date(year, month, 16),
      end: new Date(year, month + 1, 0), // Last day of month
    };
  }
}

export async function getSubPayoutSummary(): Promise<SubPayoutSummary[]> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  // Get all active subs
  const { data: subs } = await supabase
    .from("subcontractors")
    .select("id, name, email")
    .eq("organization_id", profile.organization_id)
    .is("archived_at", null)
    .order("name");

  if (!subs?.length) return [];

  // Get all payouts
  const { data: payouts } = await supabase
    .from("job_payouts")
    .select("subcontractor_id, amount, paid_at, job_id")
    .eq("organization_id", profile.organization_id);

  // Get assignments (jobs worked) per sub
  const subIds = subs.map((s: any) => s.id);
  const { data: assignments } = await supabase
    .from("job_assignments")
    .select("subcontractor_id, job_id")
    .in("subcontractor_id", subIds);

  // Build summary
  return subs.map((sub: any) => {
    const subPayouts = (payouts || []).filter(
      (p: any) => p.subcontractor_id === sub.id,
    );
    const subAssignments = (assignments || []).filter(
      (a: any) => a.subcontractor_id === sub.id,
    );

    const totalPaid = subPayouts.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );
    const lastPayout = subPayouts.sort(
      (a: any, b: any) =>
        new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
    )[0];

    // Total earned = total paid for now (we don't have pending amounts tracked separately)
    return {
      subcontractor_id: sub.id,
      name: sub.name,
      email: sub.email,
      total_earned: totalPaid,
      total_paid: totalPaid,
      outstanding: 0, // Payouts are recorded at time of payment
      jobs_worked: new Set(subAssignments.map((a: any) => a.job_id)).size,
      last_payout_date: lastPayout?.paid_at || null,
    };
  });
}

export async function getBiweeklyReport(
  periodStart?: string,
  periodEnd?: string,
): Promise<PayoutPeriod> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultPeriod = getCurrentBiweeklyPeriod();
  const start = periodStart
    ? new Date(periodStart)
    : defaultPeriod.start;
  const end = periodEnd ? new Date(periodEnd) : defaultPeriod.end;

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  if (!user) {
    return {
      start: startStr,
      end: endStr,
      label: formatPeriodLabel(start, end),
      subs: [],
      grand_total_due: 0,
      grand_total_paid: 0,
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return {
      start: startStr,
      end: endStr,
      label: formatPeriodLabel(start, end),
      subs: [],
      grand_total_due: 0,
      grand_total_paid: 0,
    };
  }

  // Get payouts in this period
  const { data: payouts } = await supabase
    .from("job_payouts")
    .select(
      "id, subcontractor_id, amount, job_id, paid_at, description, jobs(job_number, property_address, address)",
    )
    .eq("organization_id", profile.organization_id)
    .gte("paid_at", startStr)
    .lte("paid_at", endStr + "T23:59:59.999Z");

  // Get subs
  const { data: subs } = await supabase
    .from("subcontractors")
    .select("id, name")
    .eq("organization_id", profile.organization_id)
    .is("archived_at", null);

  const subMap = new Map<string, string>((subs || []).map((s: any) => [s.id, s.name]));

  // Group payouts by sub
  const groupedPayouts = new Map<string, any[]>();
  for (const p of payouts || []) {
    const existing = groupedPayouts.get(p.subcontractor_id) || [];
    existing.push(p);
    groupedPayouts.set(p.subcontractor_id, existing);
  }

  const subEntries = Array.from(groupedPayouts.entries()).map(
    ([subId, subPayouts]) => {
      const jobs = subPayouts.map((p: any) => ({
        job_id: p.job_id,
        job_number: p.jobs?.job_number || "N/A",
        address: p.jobs?.property_address || p.jobs?.address || "N/A",
        amount: Number(p.amount),
        paid: true,
      }));

      const totalPaid = jobs.reduce((s: number, j: any) => s + j.amount, 0);

      return {
        subcontractor_id: subId,
        name: subMap.get(subId) || "Unknown",
        jobs,
        total_due: totalPaid,
        total_paid: totalPaid,
      };
    },
  );

  const grandTotalPaid = subEntries.reduce((s, e) => s + e.total_paid, 0);

  return {
    start: startStr,
    end: endStr,
    label: formatPeriodLabel(start, end),
    subs: subEntries,
    grand_total_due: grandTotalPaid,
    grand_total_paid: grandTotalPaid,
  };
}

function formatPeriodLabel(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}
