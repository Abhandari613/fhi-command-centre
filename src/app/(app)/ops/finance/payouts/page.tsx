"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  getSubPayoutSummary,
  getBiweeklyReport,
  type SubPayoutSummary,
  type PayoutPeriod,
} from "@/app/actions/payout-dashboard-actions";
import {
  ArrowLeft,
  Loader2,
  Users,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Hammer,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
};

export default function PayoutsPage() {
  const [summaries, setSummaries] = useState<SubPayoutSummary[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PayoutPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sums, period] = await Promise.all([
      getSubPayoutSummary(),
      getBiweeklyReport(),
    ]);
    setSummaries(sums);
    setCurrentPeriod(period);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.header variants={item} className="flex items-center gap-3">
          <Link
            href="/ops/finance"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Subcontractor Payouts
            </h1>
            <p className="text-sm text-white/50">
              {summaries.length} active subcontractor
              {summaries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </motion.header>

        {/* Current Period Card */}
        {currentPeriod && (
          <motion.div variants={item}>
            <GlassCard intensity="panel" className="p-5 ember-border-l">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">
                  Current Period
                </h3>
                <span className="text-xs text-white/30 font-mono ml-auto">
                  {currentPeriod.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30">
                    Total Due
                  </p>
                  <p className="text-2xl font-black tabular-nums text-primary">
                    {fmt.format(currentPeriod.grand_total_due)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30">
                    Total Paid
                  </p>
                  <p className="text-2xl font-black tabular-nums text-emerald-400">
                    {fmt.format(currentPeriod.grand_total_paid)}
                  </p>
                </div>
              </div>

              {currentPeriod.subs.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-2">
                  No payouts recorded this period.
                </p>
              ) : (
                <div className="space-y-2">
                  {currentPeriod.subs.map((sub) => (
                    <div key={sub.subcontractor_id}>
                      <button
                        onClick={() =>
                          setExpandedSub(
                            expandedSub === sub.subcontractor_id
                              ? null
                              : sub.subcontractor_id,
                          )
                        }
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                            {sub.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">
                              {sub.name}
                            </p>
                            <p className="text-[10px] text-white/30 font-mono">
                              {sub.jobs.length} job
                              {sub.jobs.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {fmt.format(sub.total_paid)}
                          </span>
                          {expandedSub === sub.subcontractor_id ? (
                            <ChevronUp className="w-4 h-4 text-white/30" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedSub === sub.subcontractor_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-11 mt-1 space-y-1">
                              {sub.jobs.map((job, i) => (
                                <Link
                                  key={`${job.job_id}-${i}`}
                                  href={`/ops/jobs/${job.job_id}/finance`}
                                >
                                  <div className="flex items-center justify-between p-2 rounded hover:bg-white/[0.03] transition-colors">
                                    <div>
                                      <span className="text-xs font-mono text-white/40">
                                        {job.job_number}
                                      </span>
                                      <span className="text-xs text-white/60 ml-2">
                                        {job.address}
                                      </span>
                                    </div>
                                    <span className="text-xs font-mono text-white">
                                      {fmt.format(job.amount)}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* All Subcontractors Summary */}
        <motion.section variants={item} className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            All Subcontractors
          </h3>

          {summaries.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-white/40">
                No subcontractors found. Add subs in the Team page.
              </p>
              <Link href="/ops/subs">
                <AnimatedButton size="sm" className="mt-4">
                  Go to Team
                </AnimatedButton>
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {summaries.map((sub) => (
                <motion.div
                  key={sub.subcontractor_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard intensity="panel" className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                          <span className="text-sm font-bold text-white">
                            {sub.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {sub.name}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-white/30 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Hammer className="w-3 h-3" />
                              {sub.jobs_worked} job
                              {sub.jobs_worked !== 1 ? "s" : ""}
                            </span>
                            {sub.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {sub.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-emerald-400">
                          {fmt.format(sub.total_paid)}
                        </p>
                        <p className="text-[10px] text-white/30">total paid</p>
                      </div>
                    </div>

                    {sub.last_payout_date && (
                      <p className="text-[10px] text-white/20 mt-2 ml-13">
                        Last payout:{" "}
                        {new Date(sub.last_payout_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    )}
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}
