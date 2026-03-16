import { createClient } from "@/utils/supabase/server";
import {
  getJobProfitSummary,
  getJobPayouts,
} from "@/app/actions/finance-bridge-actions";
import { getSubcontractors } from "@/app/actions/sub-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, Users } from "lucide-react";
import { RecordPayoutForm } from "@/components/finance/RecordPayoutForm";

export default async function JobFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;
  const supabase = await createClient();

  const { data: job } = await (supabase as any)
    .from("jobs")
    .select("id, job_number, property_address, status, final_invoice_amount")
    .eq("id", jobId)
    .single();

  if (!job) {
    return <div className="p-8 text-center opacity-50">Job not found</div>;
  }

  const [profitSummary, payouts, subs] = await Promise.all([
    getJobProfitSummary(jobId),
    getJobPayouts(jobId),
    getSubcontractors(),
  ]);

  const revenue = Number(
    profitSummary?.revenue || (job as any).final_invoice_amount || 0,
  );
  const totalPayouts = Number(profitSummary?.total_payouts || 0);
  const grossProfit = revenue - totalPayouts;
  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const marginColor =
    marginPct > 20
      ? "text-emerald-400"
      : marginPct > 10
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/ops/jobs/${jobId}`}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Job Finance
          </h1>
          <p className="text-sm opacity-50">
            {job.job_number} — {job.property_address}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-400 opacity-60" />
          <p className="text-[10px] uppercase opacity-50 font-bold">Revenue</p>
          <p className="text-xl font-bold text-emerald-400">
            ${revenue.toLocaleString()}
          </p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-orange-400 opacity-60" />
          <p className="text-[10px] uppercase opacity-50 font-bold">
            Sub Payouts
          </p>
          <p className="text-xl font-bold text-orange-400">
            ${totalPayouts.toLocaleString()}
          </p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-cyan-400 opacity-60" />
          <p className="text-[10px] uppercase opacity-50 font-bold">
            Gross Profit
          </p>
          <p className="text-xl font-bold text-cyan-400">
            ${grossProfit.toLocaleString()}
          </p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <p className="text-[10px] uppercase opacity-50 font-bold mb-1">
            Margin
          </p>
          <p className={`text-3xl font-black ${marginColor}`}>
            {marginPct.toFixed(1)}%
          </p>
        </GlassCard>
      </div>

      {/* Record Payout */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-bold uppercase opacity-50 mb-3">
          Record Sub Payout
        </h2>
        <RecordPayoutForm
          jobId={jobId}
          subs={subs.filter((s) => s.status === "active")}
        />
      </GlassCard>

      {/* Payout History */}
      <div>
        <h2 className="text-sm font-bold uppercase opacity-50 mb-3 px-1">
          Payout History
        </h2>
        {payouts.length === 0 ? (
          <p className="text-sm opacity-40 px-1">No payouts recorded yet</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p: any) => (
              <GlassCard
                key={p.id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-sm">
                    {p.subcontractor?.name || "Unknown Sub"}
                  </p>
                  <p className="text-xs opacity-50">{p.description}</p>
                  {p.paid_at && (
                    <p className="text-xs opacity-40 mt-0.5">
                      {new Date(p.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="font-bold text-orange-400">
                  -${Number(p.amount).toLocaleString()}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
