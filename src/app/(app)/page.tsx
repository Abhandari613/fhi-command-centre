"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { TickerStrip } from "@/components/finance/TickerStrip";
import { JobFunnel } from "@/components/finance/JobFunnel";
import { AgingBuckets } from "@/components/finance/AgingBuckets";
import { ProfitabilityTable } from "@/components/finance/ProfitabilityTable";
import {
  getAgingSummary,
  getAgedReceivables,
  type AgingSummary,
  type AgedReceivable,
} from "@/app/actions/receivables-actions";
import {
  getDashboardJobs,
  type DashboardJob,
} from "@/app/actions/dashboard-jobs-actions";
import { getCompletedJobsFinanceSummary } from "@/app/actions/finance-bridge-actions";
import {
  getProperties,
  getAllActiveTurnovers,
} from "@/app/actions/property-actions";
import type { PropertyTurnoverSummary, Turnover } from "@/types/properties";
import { countByUrgency, type UrgencyTier } from "@/lib/turnover-urgency";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Hammer,
  Camera,
  RotateCw,
  TrendingUp,
  Activity,
  BarChart3,
  ChevronRight,
  Mic,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ReceiptNudge } from "@/components/receipts/ReceiptNudge";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// --- Types ---
type JobProfit = {
  job_id: string;
  job_number: string;
  property_address: string | null;
  status: string;
  revenue: number | null;
  total_payouts: number;
  gross_profit: number;
  margin_pct: number;
};

export default function BloombergDashboard() {
  const [loading, setLoading] = useState(true);

  // Data buckets
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null);
  const [receivables, setReceivables] = useState<AgedReceivable[]>([]);
  const [profitJobs, setProfitJobs] = useState<JobProfit[]>([]);
  const [properties, setProperties] = useState<PropertyTurnoverSummary[]>([]);
  const [urgencyCounts, setUrgencyCounts] = useState<
    Record<UrgencyTier, number>
  >({
    fire: 0,
    hot: 0,
    warm: 0,
    cool: 0,
    no_date: 0,
  });

  // Derived metrics
  const [metrics, setMetrics] = useState({
    activeJobs: 0,
    pipelineValue: 0,
    totalRevenue: 0,
    avgMargin: 0,
    outstanding: 0,
    overdueCount: 0,
    paidThisMonth: 0,
    totalJobs: 0,
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          jobsData,
          agingData,
          receivablesData,
          profitData,
          propertiesData,
          turnoversData,
        ] = await Promise.all([
          getDashboardJobs(),
          getAgingSummary(),
          getAgedReceivables(),
          getCompletedJobsFinanceSummary(),
          getProperties(),
          getAllActiveTurnovers(),
        ]);

        setJobs(jobsData);
        setAgingSummary(agingData);
        setReceivables(receivablesData);
        setProperties(propertiesData);
        setProfitJobs(profitData as JobProfit[]);
        setUrgencyCounts(countByUrgency(turnoversData));

        // Status counts for funnel
        const counts: Record<string, number> = {};
        for (const j of jobsData) {
          counts[j.status] = (counts[j.status] || 0) + 1;
        }
        setStatusCounts(counts);

        // Pipeline value = sum of quoted_total for non-paid jobs
        const pipeline = jobsData
          .filter((j) => !["paid", "completed"].includes(j.status))
          .reduce((s, j) => s + (j.quoted_total || 0), 0);

        // Active = scheduled + in_progress
        const active = jobsData.filter((j) =>
          ["scheduled", "in_progress"].includes(j.status),
        ).length;

        // Revenue & margin from profit summary
        const totalRev = (profitData as JobProfit[]).reduce(
          (s, j) => s + (j.revenue || 0),
          0,
        );
        const margins = (profitData as JobProfit[]).filter(
          (j) => j.margin_pct > 0,
        );
        const avgMargin =
          margins.length > 0
            ? margins.reduce((s, j) => s + j.margin_pct, 0) / margins.length
            : 0;

        // Paid this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const paidThisMonth = (profitData as JobProfit[])
          .filter((j) => j.status === "paid")
          .reduce((s, j) => s + (j.revenue || 0), 0);

        // Overdue
        const overdueCount =
          agingData["31-60"].count +
          agingData["61-90"].count +
          agingData["90+"].count;

        setMetrics({
          activeJobs: active,
          pipelineValue: pipeline,
          totalRevenue: totalRev,
          avgMargin,
          outstanding: agingData.grand_total,
          overdueCount,
          paidThisMonth,
          totalJobs: jobsData.length,
        });
      } catch (e) {
        console.error("Dashboard fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // --- Attention items: stalled or overdue ---
  const attentionJobs = jobs
    .filter((j) => {
      if (["incoming", "draft"].includes(j.status)) {
        const age =
          (Date.now() - new Date(j.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        return age > 3;
      }
      return false;
    })
    .slice(0, 3);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
  };

  // Skeleton loader
  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div
      className={`bg-white/[0.03] rounded animate-pulse border border-white/[0.03] ${className}`}
    />
  );

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 py-2"
      >
        {/* ── HEADER ── */}
        <motion.header variants={item} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                My Jobs
              </h1>
              <p className="text-[10px] font-mono text-white/30 tracking-wider">
                {currentDate} &middot; {currentTime}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {metrics.overdueCount > 0 && !loading && (
                <Link href="/ops/finance/receivables">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-mono font-bold text-red-400">
                      {metrics.overdueCount} OVERDUE
                    </span>
                  </div>
                </Link>
              )}
              <div className="w-8 h-8 rounded bg-gradient-to-b from-primary to-[#e05e00] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,107,0,0.4)]">
                <span className="font-black text-white text-xs">F</span>
              </div>
            </div>
          </div>

          {/* Ticker Strip */}
          {loading ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <TickerStrip
              items={[
                {
                  label: "Active",
                  value: String(metrics.activeJobs),
                  color: "text-primary",
                },
                {
                  label: "Lined Up",
                  value: fmt.format(metrics.pipelineValue),
                  color: "text-cyan-400",
                },
                {
                  label: "Owed",
                  value: fmt.format(metrics.outstanding),
                  color:
                    metrics.overdueCount > 0
                      ? "text-red-400"
                      : "text-amber-400",
                  pulse: metrics.overdueCount > 0,
                },
                {
                  label: "Revenue",
                  value: fmt.format(metrics.totalRevenue),
                  color: "text-emerald-400",
                },
                {
                  label: "Margin",
                  value: `${metrics.avgMargin.toFixed(0)}%`,
                  color:
                    metrics.avgMargin >= 20
                      ? "text-emerald-400"
                      : "text-amber-400",
                },
              ]}
            />
          )}
        </motion.header>

        {/* ── KPI CARDS ── 4 dense metric cards */}
        <motion.section variants={item} className="grid grid-cols-4 gap-2">
          {loading ? (
            <>
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
            </>
          ) : (
            <>
              <GlassCard
                intensity="panel"
                className="p-3 flex flex-col gap-1 items-center text-center"
              >
                <span className="text-xl font-black tabular-nums font-mono text-primary">
                  {metrics.activeJobs}
                </span>
                <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
                  Active
                </span>
              </GlassCard>

              <GlassCard
                intensity="panel"
                className="p-3 flex flex-col gap-1 items-center text-center"
              >
                <span className="text-xl font-black tabular-nums font-mono text-emerald-400">
                  {fmt.format(metrics.paidThisMonth)}
                </span>
                <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
                  Collected
                </span>
              </GlassCard>

              <GlassCard
                intensity="panel"
                className="p-3 flex flex-col gap-1 items-center text-center"
              >
                <span
                  className={`text-xl font-black tabular-nums font-mono ${
                    metrics.overdueCount > 0 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {fmt.format(metrics.outstanding)}
                </span>
                <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
                  Owed
                </span>
              </GlassCard>

              <GlassCard
                intensity="panel"
                className="p-3 flex flex-col gap-1 items-center text-center"
              >
                <span
                  className={`text-xl font-black tabular-nums font-mono ${
                    metrics.avgMargin >= 20
                      ? "text-emerald-400"
                      : metrics.avgMargin >= 10
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {metrics.avgMargin.toFixed(0)}%
                </span>
                <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
                  Margin
                </span>
              </GlassCard>
            </>
          )}
        </motion.section>

        {/* Receipt Nudge (TRACK 0) */}
        {!loading && (
          <motion.section variants={item}>
            <ReceiptNudge />
          </motion.section>
        )}

        {/* ── TWO-COLUMN LAYOUT ── Ops left, Finance right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT — Operations Pulse */}
          <motion.section variants={item} className="space-y-4">
            {/* Job Pipeline Funnel */}
            <GlassCard intensity="panel" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span className="uppercase tracking-wider">Work Lined Up</span>
                  <span className="text-white/20 font-mono text-[10px]">
                    {metrics.totalJobs}
                  </span>
                </h2>
                <Link
                  href="/dashboard"
                  className="text-[10px] text-white/30 hover:text-primary transition-colors font-mono"
                >
                  ALL JOBS <ChevronRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <JobFunnel counts={statusCounts} />
              )}
            </GlassCard>

            {/* Active Jobs List */}
            <GlassCard intensity="panel" className="p-4 space-y-3">
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <Hammer className="w-3.5 h-3.5 text-primary" />
                <span className="uppercase tracking-wider">Working On Now</span>
              </h2>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-1">
                  {jobs
                    .filter((j) =>
                      ["scheduled", "in_progress"].includes(j.status),
                    )
                    .slice(0, 4)
                    .map((job, i) => (
                      <Link key={job.id} href={`/ops/jobs/${job.id}`}>
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.03] transition-colors group"
                        >
                          <div
                            className={`w-1.5 h-8 rounded-full shrink-0 ${
                              job.status === "in_progress"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/80 truncate group-hover:text-primary transition-colors">
                              {job.property_address || job.address || job.title}
                            </p>
                            <p className="text-[10px] text-white/30 font-mono">
                              {job.job_number} &middot;{" "}
                              {job.status === "in_progress"
                                ? "ON THE JOB"
                                : "BOOKED IN"}
                            </p>
                          </div>
                          {(job.quoted_total ?? 0) > 0 && (
                            <span className="text-[10px] font-mono font-bold text-white/40 tabular-nums">
                              {fmt.format(job.quoted_total ?? 0)}
                            </span>
                          )}
                        </motion.div>
                      </Link>
                    ))}
                  {jobs.filter((j) =>
                    ["scheduled", "in_progress"].includes(j.status),
                  ).length === 0 && (
                    <p className="text-xs text-white/20 text-center py-3 font-mono">
                      Nothing on the go right now
                    </p>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Attention Items */}
            <AnimatePresence>
              {attentionJobs.length > 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <GlassCard
                    intensity="bright"
                    className="p-4 ember-border-l space-y-2"
                  >
                    <h2 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-wider">
                        Don't Forget
                      </span>
                    </h2>
                    {attentionJobs.map((job) => {
                      const age = Math.floor(
                        (Date.now() - new Date(job.created_at).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );
                      return (
                        <Link key={job.id} href={`/ops/jobs/${job.id}`}>
                          <div className="flex items-center justify-between p-2 rounded hover:bg-white/[0.03] transition-colors">
                            <div>
                              <p className="text-xs text-white/70">
                                {job.title || job.property_address}
                              </p>
                              <p className="text-[10px] text-white/30 font-mono">
                                {job.status.toUpperCase()} &middot; {age}d old
                              </p>
                            </div>
                            <ArrowRight className="w-3 h-3 text-white/20" />
                          </div>
                        </Link>
                      );
                    })}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* RIGHT — Financial Health */}
          <motion.section variants={item} className="space-y-4">
            {/* Aged Receivables */}
            <GlassCard intensity="panel" className="p-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </div>
              ) : agingSummary ? (
                <AgingBuckets
                  summary={agingSummary}
                  receivables={receivables}
                  compact
                />
              ) : (
                <p className="text-xs text-white/20 text-center py-4 font-mono">
                  Nobody owes you money right now
                </p>
              )}
            </GlassCard>

            {/* Job Profitability */}
            <GlassCard intensity="panel" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="uppercase tracking-wider">
                    Am I Making Money?
                  </span>
                </h2>
                <Link
                  href="/ops/finance"
                  className="text-[10px] text-white/30 hover:text-primary transition-colors font-mono"
                >
                  MONEY <ChevronRight className="w-3 h-3 inline" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : (
                <ProfitabilityTable jobs={profitJobs} limit={5} />
              )}
            </GlassCard>

            {/* Cash Position Summary */}
            <GlassCard intensity="panel" className="p-4 space-y-3">
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="uppercase tracking-wider">Money In / Money Out</span>
              </h2>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
                      Total Earned
                    </span>
                    <span className="text-sm font-mono font-black tabular-nums text-emerald-400">
                      {fmt.format(metrics.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
                      Still Owed
                    </span>
                    <span className="text-sm font-mono font-black tabular-nums text-amber-400">
                      {fmt.format(metrics.outstanding)}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
                      In the Bank
                    </span>
                    <span className="text-sm font-mono font-black tabular-nums text-white">
                      {fmt.format(metrics.totalRevenue - metrics.outstanding)}
                    </span>
                  </div>
                  {/* Visual bar */}
                  <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden flex">
                    {metrics.totalRevenue > 0 && (
                      <>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              ((metrics.totalRevenue - metrics.outstanding) /
                                metrics.totalRevenue) *
                              100
                            }%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-emerald-500 rounded-l-full"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              (metrics.outstanding / metrics.totalRevenue) * 100
                            }%`,
                          }}
                          transition={{
                            duration: 0.8,
                            ease: "easeOut",
                            delay: 0.1,
                          }}
                          className="h-full bg-amber-500/50"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.section>
        </div>

        {/* ── TURNOVER PULSE ── */}
        {properties.length > 0 && !loading && (
          <motion.section variants={item}>
            <GlassCard intensity="panel" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="uppercase tracking-wider">Unit Turns</span>
                  <span className="text-white/20 font-mono text-[10px]">
                    {properties.reduce((s, p) => s + p.active_turnovers, 0)}{" "}
                    active
                  </span>
                </h2>
                <Link
                  href="/ops/properties/countdown"
                  className="text-[10px] text-white/30 hover:text-primary transition-colors font-mono"
                >
                  DEADLINES <ChevronRight className="w-3 h-3 inline" />
                </Link>
              </div>

              {/* Urgency summary strip */}
              {(urgencyCounts.fire > 0 || urgencyCounts.hot > 0) && (
                <Link href="/ops/properties/countdown">
                  <div className="flex items-center gap-2 p-2 rounded bg-white/[0.02] border border-white/[0.04] hover:border-primary/20 transition-colors">
                    {urgencyCounts.fire > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded animate-pulse">
                        {urgencyCounts.fire} FIRE
                      </span>
                    )}
                    {urgencyCounts.hot > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded">
                        {urgencyCounts.hot} HOT
                      </span>
                    )}
                    {urgencyCounts.warm > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                        {urgencyCounts.warm} WARM
                      </span>
                    )}
                    <span className="ml-auto text-[9px] text-white/20 font-mono">
                      by move-in date &rarr;
                    </span>
                  </div>
                </Link>
              )}

              <div className="space-y-1.5">
                {properties
                  .filter(
                    (p) => p.active_turnovers > 0 || p.units_in_turnover > 0,
                  )
                  .slice(0, 4)
                  .map((p) => (
                    <Link
                      key={p.property_id}
                      href={`/ops/properties/${p.property_id}`}
                    >
                      <div className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.03] transition-colors group">
                        <div className="w-1.5 h-8 rounded-full bg-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/80 truncate group-hover:text-primary transition-colors">
                            {p.property_name}
                          </p>
                          <p className="text-[10px] text-white/30 font-mono">
                            {p.units_in_turnover} turning &middot;{" "}
                            {p.units_ready} ready &middot; {p.total_units} total
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {p.total_units > 0
                              ? Math.round(
                                  ((p.units_ready +
                                    (p.total_units -
                                      p.units_in_turnover -
                                      (p.units_idle ?? 0) -
                                      p.units_ready)) /
                                    p.total_units) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                {properties.filter((p) => p.active_turnovers > 0).length ===
                  0 && (
                  <p className="text-xs text-white/20 text-center py-2 font-mono">
                    No units turning over right now
                  </p>
                )}
              </div>
            </GlassCard>
          </motion.section>
        )}

        {/* ── QUICK ACTIONS ── */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/ops/subs">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-primary/15 flex items-center justify-center text-primary border border-primary/15">
                  <Hammer className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  Crew
                </span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/receipts">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
                  <Camera
                    className="w-3.5 h-3.5 text-gray-400"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  Receipt
                </span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/schedule">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/15">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  Schedule
                </span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/properties">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/15">
                  <Building2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  Properties
                </span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/voice-quote">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-primary/15 flex items-center justify-center text-primary border border-primary/15">
                  <Mic className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  Voice Quote
                </span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/explorer">
              <AnimatedButton
                variant="secondary"
                className="w-full h-16 flex-col gap-1.5 rounded-sm relative overflow-hidden hover:border-primary/15"
              >
                <div className="w-7 h-7 rounded-sm bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/15">
                  <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[9px] tracking-wide uppercase">
                  How It Works
                </span>
              </AnimatedButton>
            </Link>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
