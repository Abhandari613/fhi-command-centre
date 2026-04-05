"use client";

import { useEffect, useState, useTransition } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  runReconciliation,
  approveMatch,
  rejectMatch,
  getUnmatchedItems,
  type ProposedMatch,
  type UnmatchedReceipt,
  type UnmatchedTransaction,
} from "@/app/actions/reconciliation-actions";
import {
  ArrowLeft,
  Loader2,
  Zap,
  Check,
  X,
  Receipt,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 0.85
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : score >= 0.6
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${color}`}
    >
      {(score * 100).toFixed(0)}%
    </span>
  );
}

export default function ReconciliationPage() {
  const [matches, setMatches] = useState<ProposedMatch[]>([]);
  const [unmatchedReceipts, setUnmatchedReceipts] = useState<
    UnmatchedReceipt[]
  >([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<
    UnmatchedTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getUnmatchedItems();
    setUnmatchedReceipts(data.receipts);
    setUnmatchedTransactions(data.transactions);
    setLoading(false);
  };

  const handleRunReconciliation = async () => {
    setRunning(true);
    const results = await runReconciliation();
    setMatches(results);
    await loadData();
    setRunning(false);
  };

  const handleApprove = async (receiptId: string, transactionId: string) => {
    setProcessingId(`${receiptId}:${transactionId}`);
    await approveMatch(receiptId, transactionId);
    setMatches((prev) =>
      prev.filter(
        (m) =>
          !(m.receiptId === receiptId && m.transactionId === transactionId),
      ),
    );
    await loadData();
    setProcessingId(null);
  };

  const handleReject = async (receiptId: string, transactionId: string) => {
    setProcessingId(`${receiptId}:${transactionId}`);
    await rejectMatch(receiptId, transactionId);
    setMatches((prev) =>
      prev.filter(
        (m) =>
          !(m.receiptId === receiptId && m.transactionId === transactionId),
      ),
    );
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.header
          variants={item}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/ops/finance"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Reconciliation
              </h1>
              <p className="text-sm text-white/50">
                {unmatchedReceipts.length} receipts &middot;{" "}
                {unmatchedTransactions.length} transactions unmatched
              </p>
            </div>
          </div>
        </motion.header>

        {/* Run Auto-Match */}
        <motion.div variants={item}>
          <AnimatedButton
            onClick={handleRunReconciliation}
            disabled={running}
            className="w-full"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run Auto-Match
              </>
            )}
          </AnimatedButton>
        </motion.div>

        {/* Proposed Matches */}
        {matches.length > 0 && (
          <motion.section variants={item} className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-4 bg-primary rounded-full" />
              Proposed Matches
              <span className="text-white/30 text-xs">({matches.length})</span>
            </h3>

            <AnimatePresence>
              {matches.map((match) => {
                const key = `${match.receiptId}:${match.transactionId}`;
                const isProcessing = processingId === key;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                  >
                    <GlassCard intensity="panel" className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* Receipt */}
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium text-white block truncate">
                                {match.receipt.merchant}
                              </span>
                              <span className="text-[10px] text-white/30 font-mono">
                                {new Date(
                                  match.receipt.date,
                                ).toLocaleDateString()}{" "}
                                &middot;{" "}
                                {fmt.format(match.receipt.total_amount)}
                              </span>
                            </div>
                          </div>

                          {/* Transaction */}
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium text-white block truncate">
                                {match.transaction.description}
                              </span>
                              <span className="text-[10px] text-white/30 font-mono">
                                {new Date(
                                  match.transaction.date,
                                ).toLocaleDateString()}{" "}
                                &middot;{" "}
                                {fmt.format(match.transaction.amount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <ConfidenceBadge score={match.confidence} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleApprove(
                              match.receiptId,
                              match.transactionId,
                            )
                          }
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleReject(
                              match.receiptId,
                              match.transactionId,
                            )
                          }
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>

                      <p className="text-[10px] text-white/20 italic">
                        {match.reason}
                      </p>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.section>
        )}

        {/* Unmatched Receipts */}
        <motion.section variants={item} className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            Unmatched Receipts
            <span className="text-white/30 text-xs">
              ({unmatchedReceipts.length})
            </span>
          </h3>

          {unmatchedReceipts.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-xs text-white/30">
                All receipts are matched.
              </p>
            </GlassCard>
          ) : (
            <GlassCard intensity="panel" className="overflow-hidden">
              <div className="divide-y divide-white/5">
                {unmatchedReceipts.slice(0, 20).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {r.merchant || "Unknown"}
                        </p>
                        <p className="text-[10px] text-white/30 font-mono">
                          {r.date
                            ? new Date(r.date).toLocaleDateString()
                            : "No date"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-white shrink-0">
                      {fmt.format(r.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </motion.section>

        {/* Unmatched Transactions */}
        <motion.section variants={item} className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
            Unmatched Transactions
            <span className="text-white/30 text-xs">
              ({unmatchedTransactions.length})
            </span>
          </h3>

          {unmatchedTransactions.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-xs text-white/30">
                All transactions are matched.
              </p>
            </GlassCard>
          ) : (
            <GlassCard intensity="panel" className="overflow-hidden">
              <div className="divide-y divide-white/5">
                {unmatchedTransactions.slice(0, 20).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {t.description || "Unknown"}
                        </p>
                        <p className="text-[10px] text-white/30 font-mono">
                          {t.date
                            ? new Date(t.date).toLocaleDateString()
                            : "No date"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-white shrink-0">
                      {fmt.format(Math.abs(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}
