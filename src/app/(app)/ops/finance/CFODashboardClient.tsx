"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { KPICard } from "@/components/finance/KPICard";
import { AgingBuckets } from "@/components/finance/AgingBuckets";
import { TransactionList } from "@/components/finance/TransactionList";
import { UploadZone } from "@/components/finance/UploadZone";
import { AutoCategorizeButton } from "@/components/finance/AutoCategorizeButton";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  RotateCcw,
  BookOpen,
  FileText,
  Upload,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type {
  AgingSummary,
  AgedReceivable,
} from "@/app/actions/receivables-actions";

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

interface CFODashboardClientProps {
  transactions: any[];
  categories: any[];
  jobProfits: any[];
  agingSummary: AgingSummary;
  receivables: AgedReceivable[];
  totalRevenue: number;
  avgMargin: number;
  pendingCount: number;
  outstandingTotal: number;
}

export function CFODashboardClient({
  transactions,
  categories,
  jobProfits,
  agingSummary,
  receivables,
  totalRevenue,
  avgMargin,
  pendingCount,
  outstandingTotal,
}: CFODashboardClientProps) {
  return (
    <div className="w-full pb-20">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              CFO Dashboard
            </h1>
            <p className="text-white/50 text-sm">
              Cash flow, receivables, and profitability at a glance.
            </p>
          </div>
        </motion.div>

        {/* KPI Row */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2"
        >
          <KPICard
            label="Total Revenue"
            value={fmt.format(totalRevenue)}
            icon={<DollarSign className="w-4 h-4" />}
            trend="up"
            accent="#10b981"
          />
          <KPICard
            label="Outstanding"
            value={fmt.format(outstandingTotal)}
            icon={<AlertTriangle className="w-4 h-4" />}
            trend={outstandingTotal > 0 ? "down" : "neutral"}
            accent="#ff6b00"
          />
          <KPICard
            label="Profit Margin"
            value={`${avgMargin.toFixed(1)}%`}
            icon={<TrendingUp className="w-4 h-4" />}
            trend={avgMargin > 20 ? "up" : avgMargin > 10 ? "neutral" : "down"}
            accent="#8b5cf6"
          />
          <KPICard
            label="Pending Review"
            value={String(pendingCount)}
            icon={<ClipboardList className="w-4 h-4" />}
            accent="#6b7280"
          />
        </motion.div>

        {/* Aged Receivables */}
        <motion.div variants={item}>
          <GlassCard intensity="panel" className="p-4 ember-border-l">
            <AgingBuckets summary={agingSummary} receivables={receivables} />
          </GlassCard>
        </motion.div>

        {/* Job Profitability */}
        {jobProfits.length > 0 && (
          <motion.div variants={item}>
            <GlassCard intensity="panel" className="p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
                Job Profitability
              </h3>
              <div className="space-y-1">
                {jobProfits.slice(0, 8).map((jp: any) => {
                  const margin = Number(jp.margin_pct) || 0;
                  const marginColor =
                    margin > 20
                      ? "text-emerald-400"
                      : margin > 10
                        ? "text-yellow-400"
                        : "text-red-400";

                  return (
                    <Link
                      key={jp.job_id}
                      href={`/ops/jobs/${jp.job_id}/finance`}
                    >
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-mono text-white/50 shrink-0">
                            {jp.job_number}
                          </span>
                          <span className="text-sm text-white/70 truncate">
                            {jp.property_address || jp.title || "Job"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs text-white/40 hidden lg:block">
                            {fmt.format(Number(jp.revenue || 0))}
                          </span>
                          <span
                            className={`text-sm font-bold tabular-nums ${marginColor}`}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Transaction Clearing House */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              Clearing House
            </h3>
            <div className="flex items-center gap-2">
              <AutoCategorizeButton />
              <span className="text-[10px] text-white/40 px-2 py-1 bg-white/5 rounded-full">
                {transactions.length} items
              </span>
            </div>
          </div>
          <GlassCard intensity="panel" className="p-1 min-h-[300px]">
            <TransactionList
              initialTransactions={transactions}
              categories={categories}
            />
          </GlassCard>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            Finance Tools
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Link href="/ops/finance/recurring">
              <GlassCard className="p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group h-full">
                <RotateCcw className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-sm font-bold text-white">
                  Recurring Schedules
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Auto-invoicing
                </p>
              </GlassCard>
            </Link>
            <Link href="/ops/finance/catalog">
              <GlassCard className="p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group h-full">
                <BookOpen className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm font-bold text-white">Services Catalog</p>
                <p className="text-[10px] text-white/40 mt-0.5">Rate library</p>
              </GlassCard>
            </Link>
            <Link href="/ops/finance/statements">
              <GlassCard className="p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group h-full">
                <FileText className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-sm font-bold text-white">Statements</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Client accounts
                </p>
              </GlassCard>
            </Link>
            <GlassCard className="p-4 h-full">
              <Upload className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm font-bold text-white">Upload Data</p>
              <p className="text-[10px] text-white/40 mt-0.5">
                Bank statements
              </p>
              <div className="mt-2">
                <UploadZone />
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
