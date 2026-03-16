"use client";

import { motion } from "framer-motion";

const STATUS_CONFIG: {
  key: string;
  label: string;
  short: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "incoming",
    label: "Incoming",
    short: "IN",
    color: "text-gray-400",
    bg: "bg-gray-500",
  },
  {
    key: "draft",
    label: "Draft",
    short: "DR",
    color: "text-white/50",
    bg: "bg-white/40",
  },
  {
    key: "quoted",
    label: "Quoted",
    short: "QT",
    color: "text-blue-400",
    bg: "bg-blue-500",
  },
  {
    key: "sent",
    label: "Sent",
    short: "SN",
    color: "text-cyan-400",
    bg: "bg-cyan-500",
  },
  {
    key: "approved",
    label: "Approved",
    short: "AP",
    color: "text-emerald-400",
    bg: "bg-emerald-500",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    short: "SC",
    color: "text-blue-400",
    bg: "bg-blue-500",
  },
  {
    key: "in_progress",
    label: "In Progress",
    short: "IP",
    color: "text-amber-400",
    bg: "bg-amber-500",
  },
  {
    key: "completed",
    label: "Completed",
    short: "CM",
    color: "text-cyan-400",
    bg: "bg-cyan-500",
  },
  {
    key: "invoiced",
    label: "Invoiced",
    short: "IV",
    color: "text-orange-400",
    bg: "bg-orange-500",
  },
  {
    key: "paid",
    label: "Paid",
    short: "PD",
    color: "text-emerald-400",
    bg: "bg-emerald-500",
  },
];

interface JobFunnelProps {
  counts: Record<string, number>;
}

export function JobFunnel({ counts }: JobFunnelProps) {
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div className="space-y-1">
      {STATUS_CONFIG.map((s, i) => {
        const count = counts[s.key] || 0;
        const pct = (count / maxCount) * 100;

        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 group"
          >
            <span
              className={`w-16 text-[9px] font-mono font-bold ${s.color} opacity-60 shrink-0 truncate`}
            >
              {s.label}
            </span>
            <div className="flex-1 h-4 bg-white/[0.02] rounded-sm overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
                className={`h-full ${s.bg} opacity-70 rounded-sm`}
              />
            </div>
            <span
              className={`w-5 text-right text-xs font-mono font-bold tabular-nums ${
                count > 0 ? s.color : "text-white/10"
              }`}
            >
              {count}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
