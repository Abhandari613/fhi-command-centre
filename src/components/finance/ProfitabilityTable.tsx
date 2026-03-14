"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface JobProfit {
  job_id: string;
  job_number: string;
  property_address: string | null;
  status: string;
  revenue: number | null;
  total_payouts: number;
  gross_profit: number;
  margin_pct: number;
}

interface ProfitabilityTableProps {
  jobs: JobProfit[];
  limit?: number;
}

function marginColor(pct: number) {
  if (pct >= 30) return "text-emerald-400";
  if (pct >= 15) return "text-emerald-400/70";
  if (pct >= 5) return "text-amber-400";
  return "text-red-400";
}

export function ProfitabilityTable({ jobs, limit = 5 }: ProfitabilityTableProps) {
  const display = jobs.slice(0, limit);

  return (
    <div className="space-y-0.5">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-white/20">
        <span className="w-12">Job</span>
        <span className="flex-1">Address</span>
        <span className="w-16 text-right">Revenue</span>
        <span className="w-14 text-right">Margin</span>
      </div>

      {display.map((job, i) => (
        <motion.div
          key={job.job_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          <Link
            href={`/ops/jobs/${job.job_id}/finance`}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors group"
          >
            <span className="w-12 text-[10px] font-mono text-white/50 group-hover:text-primary transition-colors">
              {job.job_number || "—"}
            </span>
            <span className="flex-1 text-xs text-white/70 truncate">
              {job.property_address || "No address"}
            </span>
            <span className="w-16 text-right text-xs font-mono font-bold tabular-nums text-white/80">
              {job.revenue ? fmt.format(job.revenue) : "—"}
            </span>
            <span
              className={`w-14 text-right text-xs font-mono font-bold tabular-nums ${marginColor(
                job.margin_pct
              )}`}
            >
              {job.margin_pct > 0 ? `${job.margin_pct.toFixed(0)}%` : "—"}
            </span>
          </Link>
        </motion.div>
      ))}

      {display.length === 0 && (
        <p className="text-xs text-white/20 text-center py-4 font-mono">
          No completed jobs yet
        </p>
      )}
    </div>
  );
}
