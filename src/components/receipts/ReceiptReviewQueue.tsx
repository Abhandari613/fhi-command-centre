"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  getReceiptReviewQueue,
  confirmReceiptMatch,
  confirmAllAutoMatched,
} from "@/app/actions/receipt-capture-actions";
import { searchJobsForLinking } from "@/app/actions/email-link-actions";
import { reassignReceipt } from "@/app/actions/receipt-capture-actions";
import {
  Check,
  X,
  ChevronRight,
  Loader2,
  Camera,
  Zap,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

export function ReceiptReviewQueue() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState("");
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const loadReceipts = useCallback(async () => {
    const data = await getReceiptReviewQueue();
    setReceipts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleConfirm = async (receiptId: string, jobId: string) => {
    const result = await confirmReceiptMatch(receiptId, jobId);
    if (result.success) {
      toast.success("Receipt confirmed");
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    }
  };

  const handleConfirmAll = async () => {
    const result = await confirmAllAutoMatched();
    if (result.success) {
      toast.success(`${result.count} receipts confirmed`);
      await loadReceipts();
    }
  };

  const handleJobSearch = async (query: string) => {
    setJobSearch(query);
    if (query.length < 2) {
      setJobResults([]);
      return;
    }
    setSearching(true);
    const results = await searchJobsForLinking(query);
    setJobResults(results);
    setSearching(false);
  };

  const handleReassign = async (receiptId: string, jobId: string) => {
    const result = await reassignReceipt(receiptId, jobId);
    if (result.success) {
      toast.success("Receipt reassigned");
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      setExpandedId(null);
    }
  };

  const autoMatched = receipts.filter((r) => r.status === "auto_matched");
  const needsReview = receipts.filter(
    (r) => r.status === "needs_review" || r.status === "pending_review",
  );
  const processing = receipts.filter((r) => r.status === "processing");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">All clear!</h3>
        <p className="text-sm text-gray-400">No receipts need review.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch confirm for auto-matched */}
      {autoMatched.length > 0 && (
        <GlassCard intensity="bright" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">
                {autoMatched.length} Auto-Matched
              </span>
            </div>
            <AnimatedButton size="sm" onClick={handleConfirmAll}>
              Confirm All
            </AnimatedButton>
          </div>
          <p className="text-xs text-gray-400">
            These receipts were automatically matched to jobs with high
            confidence.
          </p>
        </GlassCard>
      )}

      {/* Processing */}
      {processing.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Processing ({processing.length})
          </h3>
          {processing.map((r) => (
            <GlassCard key={r.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Scanning...</p>
                <p className="text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleTimeString()}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Auto-matched receipts */}
      {autoMatched.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Auto-Matched ({autoMatched.length})
          </h3>
          {autoMatched.map((r) => (
            <GlassCard
              key={r.id}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt="Receipt"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {r.merchant}
                  </p>
                  <p className="text-xs text-gray-400">
                    ${r.total?.toFixed(2)} &middot;{" "}
                    {new Date(r.date).toLocaleDateString()}
                  </p>
                  {r.confidence_score && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {r.confidence_score}% match
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(r.id)}
                  className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    handleConfirm(r.id, r.auto_match_job_id || r.job_id)
                  }
                  className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Needs review */}
      {needsReview.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Needs Review ({needsReview.length})
          </h3>
          {needsReview.map((r) => (
            <div key={r.id}>
              <GlassCard
                className="p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() =>
                  setExpandedId(expandedId === r.id ? null : r.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt="Receipt"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {r.merchant || "Unknown Vendor"}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${r.total?.toFixed(2) || "0.00"} &middot;{" "}
                        {r.date
                          ? new Date(r.date).toLocaleDateString()
                          : "No date"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === r.id ? "rotate-90" : ""}`}
                  />
                </div>
              </GlassCard>

              {/* Expanded detail */}
              <AnimatePresence>
                {expandedId === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-b-lg -mt-1 space-y-3">
                      {/* OCR'd line items */}
                      {r.line_items && r.line_items.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                            Items
                          </h4>
                          {r.line_items.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs py-1"
                            >
                              <span className="text-gray-300">
                                {item.description}
                              </span>
                              <span className="text-gray-400">
                                ${item.amount?.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Job assignment */}
                      <div>
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">
                          Assign to Job
                        </h4>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                          <input
                            type="text"
                            placeholder="Search jobs..."
                            value={jobSearch}
                            onChange={(e) => handleJobSearch(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                          />
                        </div>
                        {searching && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin mt-2" />
                        )}
                        {jobResults.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {jobResults.map((job) => (
                              <button
                                key={job.id}
                                onClick={() => handleReassign(r.id, job.id)}
                                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                              >
                                <span className="text-xs font-mono text-primary">
                                  {job.job_number}
                                </span>
                                <span className="text-sm text-white ml-2">
                                  {job.property_address || job.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
