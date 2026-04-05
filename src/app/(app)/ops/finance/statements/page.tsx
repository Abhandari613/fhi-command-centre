"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { CustomerStatementTable } from "@/components/finance/CustomerStatementTable";
import {
  getCustomerFinancialSummaries,
  getCustomerStatement,
  type CustomerFinancialSummary,
  type CustomerStatement,
} from "@/app/actions/customer-statement-actions";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  ChevronLeft,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function StatementsPage() {
  const [summaries, setSummaries] = useState<CustomerFinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatement, setSelectedStatement] =
    useState<CustomerStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getCustomerFinancialSummaries();
    setSummaries(data);
    setLoading(false);
  };

  const viewStatement = async (clientId: string) => {
    setLoadingStatement(true);
    const stmt = await getCustomerStatement(clientId);
    setSelectedStatement(stmt);
    setLoadingStatement(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  // Statement detail view
  if (selectedStatement) {
    return (
      <div className="space-y-6 pb-20">
        <header className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStatement(null)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Statement</h1>
              <p className="text-sm text-white/50">
                {selectedStatement.client_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const csvRows = [
                  ["Job #", "Address", "Status", "Invoiced", "Paid"],
                  ...(selectedStatement.line_items || []).map((li) => [
                    li.job_number,
                    li.property_address || "",
                    li.status,
                    String(li.invoice_amount || 0),
                    li.paid_at ? "Yes" : "No",
                  ]),
                ];
                const csv = csvRows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Statement-${selectedStatement.client_name.replace(/\s+/g, "-")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4" /> Export
            </AnimatedButton>
            <AnimatedButton
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" /> Print
            </AnimatedButton>
          </div>
        </header>

        <GlassCard
          intensity="panel"
          className="p-6 print:shadow-none print:border print:border-gray-300 print:bg-white"
        >
          <CustomerStatementTable statement={selectedStatement} />
        </GlassCard>
      </div>
    );
  }

  // Summary list view
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
            Customer Statements
          </h1>
          <p className="text-sm text-white/50">
            {summaries.length} client{summaries.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {summaries.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="text-sm text-white/40">
            No customer financial data yet.
          </p>
        </GlassCard>
      ) : (
        <GlassCard intensity="panel" className="overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-[10px] uppercase tracking-wider font-bold text-white/40">
            <span className="col-span-3">Client</span>
            <span className="col-span-2 text-center">Jobs</span>
            <span className="col-span-2 text-right hidden lg:block">Paid</span>
            <span className="col-span-2 text-right">Outstanding</span>
            <span className="col-span-3 text-right">Lifetime</span>
          </div>

          <div className="divide-y divide-white/5">
            {summaries.map((s) => (
              <button
                key={s.client_id}
                onClick={() => viewStatement(s.client_id)}
                disabled={loadingStatement}
                className="w-full grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="col-span-3 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {s.client_name}
                  </p>
                  {s.payment_terms && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {s.payment_terms.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm font-mono text-white/60">
                    {s.total_jobs}
                  </span>
                  <span className="text-[10px] text-white/30 block">
                    {s.paid_jobs} paid
                  </span>
                </div>
                <div className="col-span-2 text-right hidden lg:block">
                  <span className="text-sm font-mono text-emerald-400">
                    {fmt.format(s.total_paid)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`text-sm font-mono font-bold ${s.total_outstanding > 0 ? "text-primary" : "text-white/30"}`}
                  >
                    {fmt.format(s.total_outstanding)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-mono font-bold text-white">
                    {fmt.format(s.lifetime_revenue)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
