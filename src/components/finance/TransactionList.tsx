"use client";

import { useState, useEffect, useRef } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Check,
  X,
  ArrowRight,
  AlertTriangle,
  Building,
  CreditCard,
  Wand2,
  ArrowLeftRight,
} from "lucide-react";
import {
  matchTransactionToWorkOrder,
  updateTransactionCategory,
  createCategorizationRule,
} from "@/app/actions/finance";

interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  description: string;
  category_id: string | null;
  status: string;
  category?: { name: string };
  suggested_work_order?: { id: string; property_address_or_unit: string };
}

interface Category {
  id: string;
  name: string;
}

export function TransactionList({
  initialTransactions,
  categories,
}: {
  initialTransactions: Transaction[];
  categories: Category[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [rulePrompt, setRulePrompt] = useState<{
    txnId: string;
    description: string;
    categoryId: string;
    categoryName: string;
  } | null>(null);

  // Update local state when props change (refresh)
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (transactions.length === 0 || rulePrompt) return; // Disable nav when prompt is open

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, transactions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transactions, rulePrompt]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleCategorize = async (txnId: string, categoryId: string) => {
    const txn = transactions.find((t) => t.id === txnId);
    if (!txn) return;

    try {
      // 1. Update Category
      await updateTransactionCategory(txnId, categoryId);

      // 2. Optimistic Update
      const nextTxns = transactions.filter((t) => t.id !== txnId);
      setTransactions(nextTxns);
      if (selectedIndex >= nextTxns.length) {
        setSelectedIndex(Math.max(0, nextTxns.length - 1));
      }

      // 3. Trigger Rule Prompt
      const category = categories.find((c) => c.id === categoryId);
      setRulePrompt({
        txnId,
        description: txn.description,
        categoryId,
        categoryName: category?.name || "Selected Category",
      });
    } catch (err) {
      console.error("Failed to categorize", err);
    }
  };

  const confirmRuleCreation = async () => {
    if (!rulePrompt) return;
    try {
      await createCategorizationRule(
        rulePrompt.description,
        rulePrompt.categoryId,
      );
      // In a real app, we'd show a toast here
      console.log("Rule created!");
    } catch (err) {
      console.error("Failed to create rule", err);
    } finally {
      setRulePrompt(null);
    }
  };

  const handleMatchWorkOrder = async (txnId: string, workOrderId: string) => {
    // Optimistic UI Update
    const txnIndex = transactions.findIndex((t) => t.id === txnId);
    if (txnIndex > -1) {
      const nextTxns = [...transactions];
      nextTxns.splice(txnIndex, 1);
      setTransactions(nextTxns);
      if (selectedIndex >= nextTxns.length)
        setSelectedIndex(Math.max(0, nextTxns.length - 1));

      try {
        await matchTransactionToWorkOrder(txnId, workOrderId);
      } catch (err) {
        console.error("Failed to match work order", err);
      }
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 rounded-3xl bg-white/5">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
        <p className="text-white/40">No ambiguous transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative" ref={listRef}>
      {/* Rule Creation Overlay/Modal */}
      {rulePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-400 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Teach the System?
              </h3>
            </div>

            <p className="text-zinc-400">
              You just categorized{" "}
              <strong className="text-white">"{rulePrompt.description}"</strong>{" "}
              as{" "}
              <strong className="text-emerald-400">
                {rulePrompt.categoryName}
              </strong>
              .
            </p>
            <p className="text-zinc-400 text-sm">
              Should we automatically apply this rule to future transactions?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setRulePrompt(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
              >
                No, just this once
              </button>
              <button
                onClick={confirmRuleCreation}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors shadow-lg shadow-emerald-500/20"
              >
                Yes, create rule
              </button>
            </div>
          </div>
        </div>
      )}

      {transactions.map((txn, idx) => {
        const isSelected = idx === selectedIndex;
        const isExpense = txn.amount < 0;

        return (
          <div
            key={txn.id}
            className={cn(
              "group relative flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200",
              isSelected
                ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50 shadow-lg z-10 scale-[1.01]"
                : "bg-white/5 border-white/5 hover:bg-white/10",
            )}
            onClick={() => setSelectedIndex(idx)}
          >
            <div className="flex items-center gap-4">
              {/* Status Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isExpense
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-emerald-500/10 text-emerald-400",
                )}
              >
                {isExpense ? (
                  <CreditCard className="w-5 h-5" />
                ) : (
                  <Building className="w-5 h-5" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-white/40 bg-black/20 px-2 py-0.5 rounded">
                    {txn.transaction_date}
                  </span>
                  <span
                    className={cn(
                      "font-bold font-mono text-sm",
                      isExpense ? "text-rose-400" : "text-emerald-400",
                    )}
                  >
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
                <p className="text-white font-medium truncate">
                  {txn.description}
                </p>
              </div>

              {/* Actions (Category Selector) */}
              <div className="flex items-center gap-2">
                <select
                  className="h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-black/60 transition-colors max-w-[150px]"
                  value={txn.category_id || ""}
                  onChange={(e) => {
                    if (e.target.value)
                      handleCategorize(txn.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="" disabled>
                    Category...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* WORK ORDER MATCH SUGGESTION */}
            {txn.suggested_work_order && (
              <div className="mt-2 pl-[56px] flex items-center gap-3 animate-in slide-in-from-top-1 fade-in">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-indigo-200">
                  Match to Work Order:{" "}
                  <span className="font-bold text-white">
                    {txn.suggested_work_order.property_address_or_unit}
                  </span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMatchWorkOrder(txn.id, txn.suggested_work_order!.id);
                  }}
                  className="px-3 py-1 rounded-md bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
                >
                  Confirm Match
                </button>
              </div>
            )}

            {/* Focus Indicator */}
            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-4 text-indigo-400 animate-in slide-in-from-right-2 fade-in">
                <ArrowRight className="w-6 h-6" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
