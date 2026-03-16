"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

type Transaction = {
  id: string;
  work_order_id?: string | null;
  category_id?: string | null;
  amount?: number | null;
  description?: string | null;
  date?: string | null;
  type?: string | null;
  status?: string | null;
  receipt_url?: string | null;
  work_orders?: { property_address_or_unit: string } | null;
  categories?: { name: string } | null;
  [key: string]: any;
};

type WorkOrder = any;
type Category = any;
type TransactionUpdate = any;
type Receipt = Database["public"]["Tables"]["receipts"]["Row"];

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // ... state

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select("*, work_orders(property_address_or_unit), categories(name)")
        .order("date", { ascending: false });

      // Fetch metadata for dropdowns
      const { data: woData } = await (
        supabase.from("work_orders" as any) as any
      )
        .select("*")
        .in("status", ["Scheduled", "In Progress", "Draft"]);
      const { data: catsData } = await (
        supabase.from("categories" as any) as any
      )
        .select("*")
        .order("name");
      const { data: receiptsData } = await supabase
        .from("receipts")
        .select("*")
        .order("date", { ascending: false })
        .limit(50); // Fetch recent 50

      if (txData) setTransactions(txData as unknown as Transaction[]);
      if (woData) setWorkOrders(woData as unknown as WorkOrder[]);
      if (catsData) setCategories(catsData);
      if (receiptsData) setReceipts(receiptsData);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleUpdate = async (id: string, updates: TransactionUpdate) => {
    // ... (existing update logic)
    // Optimistic UI Update
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? ({ ...t, ...updates } as unknown as Transaction) : t,
      ),
    );

    const { error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Failed to update transaction:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex items-center gap-4">
        <Link
          href="/ops/finance"
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Transactions
          </h1>
          <p className="opacity-70 text-sm">Review & Assign</p>
        </div>
      </header>

      <div className="space-y-3">
        {transactions.length === 0 && (
          <div className="text-center opacity-50 py-10">
            No transactions found.
          </div>
        )}

        {transactions.map((tx) => (
          <GlassCard key={tx.id} className="p-4 flex flex-col gap-3 group">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleUpdate(tx.id, {
                      review_status:
                        tx.review_status === "reviewed"
                          ? "unreviewed"
                          : "reviewed",
                    })
                  }
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all",
                    tx.review_status === "reviewed"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/5 text-white/40 hover:bg-white/10",
                  )}
                >
                  {tx.review_status === "reviewed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    "?"
                  )}
                </button>
                <div>
                  <h3 className="font-bold leading-tight line-clamp-1">
                    {tx.description || tx.merchant}
                  </h3>
                  <span className="text-xs opacity-60">
                    {tx.date ? new Date(tx.date).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "font-mono font-bold whitespace-nowrap",
                  (tx.amount ?? 0) > 0 ? "text-emerald-400" : "text-white",
                )}
              >
                {(tx.amount ?? 0) > 0 ? "+" : ""}
                {(tx.amount ?? 0).toFixed(2)}
              </span>
            </div>

            {/* Assignment Interface */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {/* Work Order Selector */}
                <select
                  className={cn(
                    "flex-1 appearance-none bg-opacity-20 border border-opacity-30 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none transition-colors",
                    (tx as any).work_order_id
                      ? "bg-blue-500 border-blue-500 text-blue-300"
                      : "bg-white/5 border-white/10 text-white/60 text-center border-dashed",
                  )}
                  value={(tx as any).work_order_id || ""}
                  onChange={(e) =>
                    handleUpdate(tx.id, {
                      work_order_id: e.target.value || null,
                    } as any)
                  }
                >
                  <option value="">+ Assign Work Order</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.property_address_or_unit}
                    </option>
                  ))}
                </select>

                {/* Category Selector */}
                <select
                  className={cn(
                    "flex-1 appearance-none bg-opacity-20 border border-opacity-30 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none transition-colors",
                    tx.category_id
                      ? "bg-amber-500 border-amber-500 text-amber-300"
                      : "bg-white/5 border-white/10 text-white/60 text-center border-dashed",
                  )}
                  value={tx.category_id || ""}
                  onChange={(e) =>
                    handleUpdate(tx.id, { category_id: e.target.value || null })
                  }
                >
                  <option value="">+ Categorize</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt Selector */}
              <div className="relative">
                <FileText
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none",
                    tx.receipt_id ? "text-purple-300" : "opacity-30",
                  )}
                />
                <select
                  className={cn(
                    "w-full appearance-none bg-opacity-20 border border-opacity-30 rounded-lg pl-8 pr-3 py-2 text-xs font-bold focus:outline-none transition-colors",
                    tx.receipt_id
                      ? "bg-purple-500 border-purple-500 text-purple-300"
                      : "bg-white/5 border-white/10 text-white/60 border-dashed",
                  )}
                  value={tx.receipt_id || ""}
                  onChange={(e) =>
                    handleUpdate(tx.id, { receipt_id: e.target.value || null })
                  }
                >
                  <option value="">Attach Receipt...</option>
                  {receipts.map((r) => (
                    <option key={r.id} value={r.id}>
                      ${r.total} - {r.merchant} (
                      {new Date(r.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
