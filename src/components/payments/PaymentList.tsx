"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { format } from "date-fns";

type Payment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
};

export function PaymentList({ payments }: { payments: Payment[] }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="text-center opacity-50 italic py-4 text-sm">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
        >
          <div>
            <div className="font-bold flex items-center gap-2">
              {format(new Date(payment.date), "MMM d, yyyy")}
              <span className="text-[10px] uppercase bg-white/10 px-1.5 py-0.5 rounded opacity-70 border border-white/5">
                {payment.method.replace("_", " ")}
              </span>
            </div>
            {payment.notes && (
              <div className="text-xs opacity-50 mt-0.5">{payment.notes}</div>
            )}
          </div>
          <div className="font-mono font-bold text-emerald-400">
            ${payment.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
