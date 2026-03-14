"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getDashboardJobs,
  advanceJobStatus,
  DashboardJob,
} from "@/app/actions/dashboard-jobs-actions";
import {
  Inbox,
  FileText,
  Hammer,
  Receipt,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  incoming: {
    label: "Incoming",
    icon: <Inbox className="w-5 h-5" />,
    color: "text-blue-400",
  },
  quoted: {
    label: "Quoted",
    icon: <FileText className="w-5 h-5" />,
    color: "text-yellow-400",
  },
  in_progress: {
    label: "In Progress",
    icon: <Hammer className="w-5 h-5" />,
    color: "text-orange-400",
  },
  invoiced: {
    label: "Invoiced",
    icon: <Receipt className="w-5 h-5" />,
    color: "text-purple-400",
  },
  paid: {
    label: "Paid",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "text-green-400",
  },
};

const STATUS_ORDER = ["incoming", "quoted", "in_progress", "invoiced", "paid"];

function sortJobs(jobs: DashboardJob[]): DashboardJob[] {
  return [...jobs].sort((a, b) => {
    // RUSH jobs float to top
    if (a.urgency === "rush" && b.urgency !== "rush") return -1;
    if (b.urgency === "rush" && a.urgency !== "rush") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    const data = await getDashboardJobs();
    setJobs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleAdvance = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdvancing(jobId);
    await advanceJobStatus(jobId);
    await loadJobs();
    setAdvancing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = sortJobs(jobs.filter((j) => j.status === status));
      return acc;
    },
    {} as Record<string, DashboardJob[]>
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Jobs</h1>
          <p className="text-sm opacity-70">
            {jobs.length} active job{jobs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/ingest"
          className="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/25 transition-all active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </header>

      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const statusJobs = grouped[status];
        if (!statusJobs?.length) return null;

        return (
          <div key={status}>
            <div className={`flex items-center gap-2 mb-3 ${config.color}`}>
              {config.icon}
              <span className="text-sm font-bold uppercase tracking-wider">
                {config.label}
              </span>
              <span className="text-xs opacity-50">({statusJobs.length})</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {statusJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Link href={`/ops/jobs/${job.id}/scope`}>
                      <GlassCard className="p-4 active:scale-[0.98] transition-transform">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono font-bold opacity-70">
                                {job.job_number}
                              </span>
                              {job.urgency === "rush" && (
                                <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                  Rush
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">
                              {job.property_address || job.address || job.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs opacity-50">
                              {job.due_date && (
                                <span>
                                  Due{" "}
                                  {new Date(job.due_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                              {job.quoted_total > 0 && (
                                <span className="text-green-400 font-semibold">
                                  ${job.quoted_total.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Advance status button */}
                          {status !== "paid" && (
                            <button
                              onClick={(e) => handleAdvance(job.id, e)}
                              disabled={advancing === job.id}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                              title="Move to next status"
                            >
                              {advancing === job.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ChevronRight className="w-5 h-5 opacity-50" />
                              )}
                            </button>
                          )}
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {jobs.length === 0 && (
        <GlassCard className="p-8 text-center">
          <Inbox className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="text-lg font-semibold opacity-40">No jobs yet</p>
          <Link
            href="/ingest"
            className="inline-block mt-4 bg-blue-600 text-white font-bold rounded-xl px-6 py-3 min-h-[48px]"
          >
            Create your first job
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
