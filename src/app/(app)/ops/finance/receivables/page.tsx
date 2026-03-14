"use client";

import { useEffect, useState, useTransition } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AgingBuckets } from "@/components/finance/AgingBuckets";
import {
  getAgedReceivables,
  getAgingSummary,
  type AgedReceivable,
  type AgingSummary,
} from "@/app/actions/receivables-actions";
import {
  ArrowLeft,
  Bell,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const BUCKET_COLOR: Record<string, string> = {
  current: "text-emerald-400",
  "31-60": "text-amber-400",
  "61-90": "text-orange-400",
  "90+": "text-red-400",
};

type SortField = "days_outstanding" | "final_invoice_amount" | "client_name";

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<AgedReceivable[]>([]);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("days_outstanding");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [r, s] = await Promise.all([getAgedReceivables(), getAgingSummary()]);
    setReceivables(r);
    setSummary(s);
    setLoading(false);
  };

  const sorted = [...receivables].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "days_outstanding")
      cmp = a.days_outstanding - b.days_outstanding;
    else if (sortBy === "final_invoice_amount")
      cmp = a.final_invoice_amount - b.final_invoice_amount;
    else cmp = (a.client_name || "").localeCompare(b.client_name || "");
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const handleSendReminder = async (jobId: string) => {
    setSending(jobId);
    try {
      await fetch("/api/finance/payment-reminders", { method: "POST" });
    } catch {}
    setSending(null);
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortBy === field ? (
      sortAsc ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-3">
        <Link
          href="/ops/finance"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Aged Receivables
          </h1>
          <p className="text-sm text-white/50">
            {receivables.length} outstanding invoice
            {receivables.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Summary Buckets */}
      {summary && (
        <GlassCard intensity="panel" className="p-4 ember-border-l">
          <AgingBuckets summary={summary} receivables={receivables} compact />
        </GlassCard>
      )}

      {/* Bulk Action */}
      {receivables.some((r) => r.days_outstanding > 7) && (
        <AnimatedButton
          onClick={() => handleSendReminder("all")}
          variant="secondary"
          className="w-full"
          disabled={sending === "all"}
        >
          {sending === "all" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Send All Due Reminders
            </>
          )}
        </AnimatedButton>
      )}

      {/* Receivables Table */}
      <GlassCard intensity="panel" className="overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-[10px] uppercase tracking-wider font-bold text-white/40">
          <button
            onClick={() => toggleSort("client_name")}
            className="col-span-4 flex items-center gap-1 text-left hover:text-white/60"
          >
            Client <SortIcon field="client_name" />
          </button>
          <span className="col-span-3 hidden lg:block">Address</span>
          <button
            onClick={() => toggleSort("days_outstanding")}
            className="col-span-2 flex items-center gap-1 text-center hover:text-white/60"
          >
            Days <SortIcon field="days_outstanding" />
          </button>
          <button
            onClick={() => toggleSort("final_invoice_amount")}
            className="col-span-2 flex items-center gap-1 text-right hover:text-white/60"
          >
            Amount <SortIcon field="final_invoice_amount" />
          </button>
          <span className="col-span-1"></span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {sorted.map((r) => (
            <div key={r.job_id}>
              <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors">
                <div className="col-span-4 min-w-0">
                  <Link
                    href={`/ops/jobs/${r.job_id}`}
                    className="text-sm font-medium text-white hover:text-primary truncate block"
                  >
                    {r.client_name || "Unknown"}
                  </Link>
                  <span className="text-[10px] font-mono text-white/30">
                    {r.job_number}
                  </span>
                </div>
                <div className="col-span-3 hidden lg:block text-xs text-white/40 truncate">
                  {r.property_address || "-"}
                </div>
                <div className="col-span-2 text-center">
                  <span
                    className={`text-sm font-bold tabular-nums ${BUCKET_COLOR[r.aging_bucket]}`}
                  >
                    {r.days_outstanding}d
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-mono font-bold text-white">
                    {fmt.format(r.final_invoice_amount)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleSendReminder(r.job_id)}
                    disabled={sending === r.job_id}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-primary"
                    title="Send reminder"
                  >
                    {sending === r.job_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {receivables.length === 0 && (
          <div className="p-8 text-center text-white/30 text-sm">
            No outstanding receivables. All caught up!
          </div>
        )}
      </GlassCard>
    </div>
  );
}
