"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Bell } from "lucide-react";
import Link from "next/link";
import type {
  AgingSummary,
  AgedReceivable,
} from "@/app/actions/receivables-actions";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const BUCKET_CONFIG = {
  current: {
    label: "Current",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    barColor: "bg-emerald-500",
  },
  "31-60": {
    label: "31-60 Days",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    barColor: "bg-amber-500",
  },
  "61-90": {
    label: "61-90 Days",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    barColor: "bg-orange-500",
  },
  "90+": {
    label: "90+ Days",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    barColor: "bg-red-500",
  },
} as const;

interface AgingBucketsProps {
  summary: AgingSummary;
  receivables?: AgedReceivable[];
  compact?: boolean;
}

export function AgingBuckets({
  summary,
  receivables = [],
  compact = false,
}: AgingBucketsProps) {
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const maxTotal = Math.max(
    summary.current.total,
    summary["31-60"].total,
    summary["61-90"].total,
    summary["90+"].total,
    1,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          Aged Receivables
        </h3>
        {!compact && (
          <Link
            href="/ops/finance/receivables"
            className="text-xs text-gray-500 hover:text-primary transition-colors"
          >
            View All <ExternalLink className="w-3 h-3 inline ml-1" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(Object.keys(BUCKET_CONFIG) as (keyof typeof BUCKET_CONFIG)[]).map(
          (bucket) => {
            const config = BUCKET_CONFIG[bucket];
            const data = summary[bucket];
            const widthPct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
            const isExpanded = expandedBucket === bucket;

            return (
              <div key={bucket}>
                <button
                  onClick={() => setExpandedBucket(isExpanded ? null : bucket)}
                  className={`w-full text-left rounded-lg border p-3 transition-all hover:scale-[1.02] ${config.bg} ${config.border}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${config.color}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {data.count}
                    </span>
                  </div>
                  <p
                    className={`text-lg font-black tabular-nums ${config.color}`}
                  >
                    {fmt.format(data.total)}
                  </p>
                  <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.barColor} transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>

                {/* Expanded job list */}
                <AnimatePresence>
                  {isExpanded && receivables.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden col-span-2 lg:col-span-4"
                    >
                      <div className="mt-2 space-y-1">
                        {receivables
                          .filter((r) => r.aging_bucket === bucket)
                          .map((r) => (
                            <Link
                              key={r.job_id}
                              href={`/ops/jobs/${r.job_id}`}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-xs text-white/60">
                                  {r.job_number}
                                </span>
                                <span className="mx-2 text-white/20">|</span>
                                <span className="text-white/80 truncate">
                                  {r.client_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-white/40">
                                  {r.days_outstanding}d
                                </span>
                                <span
                                  className={`font-mono font-bold text-sm ${config.color}`}
                                >
                                  {fmt.format(r.final_invoice_amount)}
                                </span>
                              </div>
                            </Link>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          },
        )}
      </div>

      {summary.grand_total > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">
            Total Outstanding
          </span>
          <span className="text-lg font-black tabular-nums text-primary">
            {fmt.format(summary.grand_total)}
          </span>
        </div>
      )}
    </div>
  );
}
