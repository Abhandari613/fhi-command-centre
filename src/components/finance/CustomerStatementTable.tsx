"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";
import type { CustomerStatement } from "@/app/actions/customer-statement-actions";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_COLOR: Record<string, string> = {
  completed: "text-cyan-400",
  invoiced: "text-orange-400",
  paid: "text-emerald-400",
};

interface CustomerStatementTableProps {
  statement: CustomerStatement;
}

export function CustomerStatementTable({
  statement,
}: CustomerStatementTableProps) {
  return (
    <div className="space-y-6 print:text-black">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-white print:text-black">
            {statement.client_name}
          </h2>
          {statement.client_email && (
            <p className="text-sm text-white/50 print:text-gray-600">
              {statement.client_email}
            </p>
          )}
          {statement.client_phone && (
            <p className="text-sm text-white/50 print:text-gray-600">
              {statement.client_phone}
            </p>
          )}
          {statement.client_address && (
            <p className="text-sm text-white/50 print:text-gray-600">
              {statement.client_address}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
            Statement Date
          </p>
          <p className="text-sm font-mono text-white/80">
            {statement.statement_date}
          </p>
          {statement.payment_terms && (
            <span className="mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {statement.payment_terms.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-lg border border-white/5 overflow-hidden print:border-gray-300">
        <table className="w-full text-sm">
          <thead className="bg-white/5 print:bg-gray-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-white/50 print:text-gray-600">
                Job #
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-white/50 print:text-gray-600">
                Address
              </th>
              <th className="px-4 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-white/50 print:text-gray-600">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-white/50 print:text-gray-600">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-gray-200">
            {statement.line_items.map((li) => (
              <tr key={li.job_id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/ops/jobs/${li.job_id}`}
                    className="font-mono text-primary hover:underline print:text-black print:no-underline"
                  >
                    {li.job_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-white/70 truncate max-w-[200px] print:text-black">
                  {li.property_address || "N/A"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-xs font-bold uppercase ${STATUS_COLOR[li.status] || "text-white/40"} print:text-black`}
                  >
                    {li.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-white print:text-black">
                  {li.invoice_amount != null
                    ? fmt.format(li.invoice_amount)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard
          intensity="panel"
          className="p-3 text-center print:border print:border-gray-300 print:bg-white"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold print:text-gray-600">
            Invoiced
          </p>
          <p className="text-lg font-black tabular-nums text-white print:text-black">
            {fmt.format(statement.total_invoiced)}
          </p>
        </GlassCard>
        <GlassCard
          intensity="panel"
          className="p-3 text-center print:border print:border-gray-300 print:bg-white"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold print:text-gray-600">
            Paid
          </p>
          <p className="text-lg font-black tabular-nums text-emerald-400 print:text-black">
            {fmt.format(statement.total_paid)}
          </p>
        </GlassCard>
        <GlassCard
          intensity="panel"
          className="p-3 text-center print:border print:border-gray-300 print:bg-white"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold print:text-gray-600">
            Outstanding
          </p>
          <p className="text-lg font-black tabular-nums text-primary print:text-black">
            {fmt.format(statement.total_outstanding)}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
