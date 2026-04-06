"use client";

import { useState, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  Camera,
  Check,
  Loader2,
  ScanLine,
  AlertTriangle,
  FileSearch,
  Send,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchResult, ChequeMatchSummary } from "@/app/actions/cheque-match-actions";

type ScanStatus =
  | "idle"
  | "uploading"
  | "scanning"
  | "matching"
  | "results"
  | "error";

export function ChequeScanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [matchSummary, setMatchSummary] = useState<ChequeMatchSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleScan(e.target.files[0]);
    }
  };

  const handleScan = async (file: File) => {
    setStatus("uploading");
    setErrorMsg("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");
      const orgId = profile.organization_id;

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${orgId}/${user.id}/cheques/${Date.now()}.${fileExt}`;

      await supabase.storage.from("receipts").upload(fileName, file);

      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Step 1: OCR scan
      setStatus("scanning");
      const scanRes = await fetch("/api/cheques/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, orgId }),
      });

      if (!scanRes.ok) {
        const err = await scanRes.json();
        throw new Error(err.error || "Scan failed");
      }

      const scanData = await scanRes.json();
      setOcrResult(scanData.ocr);

      // Update cheque record with image URL
      if (scanData.chequeId) {
        await (supabase.from as any)("cheque_records")
          .update({ image_url: fileName })
          .eq("id", scanData.chequeId);
      }

      // Step 2: Match to invoices
      setStatus("matching");
      const { matchChequeToInvoices } = await import(
        "@/app/actions/cheque-match-actions"
      );
      const summary = await matchChequeToInvoices(scanData.chequeId, orgId);
      setMatchSummary(summary);
      setStatus("results");
    } catch (error: any) {
      console.error("Cheque scan error:", error);
      setErrorMsg(error.message || "Something went wrong");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setOcrResult(null);
    setMatchSummary(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-6">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      <AnimatePresence mode="wait">
        {/* IDLE — Camera ready */}
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-8"
          >
            <div className="relative w-64 h-64 mx-auto rounded-3xl border-2 border-white/10 flex items-center justify-center overflow-hidden bg-black/20">
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-10"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-4 border border-dashed border-white/20 rounded-2xl" />
              <ScanLine className="w-16 h-16 text-amber-400/50" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Scan Cheque Stub
              </h3>
              <p className="opacity-60 text-sm max-w-[280px] mx-auto font-medium">
                Take a photo of the payment stub. We&apos;ll match each line item
                to your invoices automatically.
              </p>
            </div>

            <AnimatedButton
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              className="mx-auto w-full max-w-xs shadow-[0_0_30px_rgba(251,191,36,0.3)]"
            >
              <Camera className="w-5 h-5 mr-2" />
              Scan Stub
            </AnimatedButton>
          </motion.div>
        )}

        {/* UPLOADING */}
        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-20"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-amber-400 animate-spin relative z-10" />
            </div>
            <span className="text-lg font-bold text-white tracking-wide">
              Uploading...
            </span>
          </motion.div>
        )}

        {/* SCANNING (OCR) */}
        {status === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-20"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
              <FileSearch className="w-16 h-16 text-purple-400 animate-pulse relative z-10" />
            </div>
            <span className="text-lg font-bold text-white tracking-wide">
              Reading cheque stub...
            </span>
            <span className="text-sm opacity-50">
              Extracting line items with AI
            </span>
          </motion.div>
        )}

        {/* MATCHING */}
        {status === "matching" && (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-20"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <ScanLine className="w-16 h-16 text-primary animate-pulse relative z-10" />
            </div>
            <span className="text-lg font-bold text-white tracking-wide">
              Matching to invoices...
            </span>
            <span className="text-sm opacity-50">
              {ocrResult?.lineItems?.length || 0} line items found
            </span>
          </motion.div>
        )}

        {/* RESULTS */}
        {status === "results" && matchSummary && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary header */}
            <GlassCard
              intensity="bright"
              className={`p-6 border-${matchSummary.discrepancies > 0 || matchSummary.notFound > 0 ? "amber-500/30 bg-amber-500/5" : "emerald-500/30 bg-emerald-500/5"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-xl text-white">
                    Cheque #{matchSummary.chequeNumber}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {ocrResult?.payer} &middot;{" "}
                    {ocrResult?.chequeDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    ${matchSummary.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-white/50">
                    {matchSummary.results.length} line items
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {matchSummary.matched}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-bold">
                    Matched
                  </p>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {matchSummary.discrepancies}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-bold">
                    Discrepancies
                  </p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {matchSummary.notFound}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-red-400/70 font-bold">
                    Not Found
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Line item details */}
            <div className="space-y-2">
              {matchSummary.results.map((result: MatchResult) => (
                <GlassCard key={result.lineItemId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.status === "matched" && (
                        <div className="w-8 h-8 bg-emerald-500 text-black rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </div>
                      )}
                      {result.status === "discrepancy" && (
                        <div className="w-8 h-8 bg-amber-500 text-black rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" strokeWidth={3} />
                        </div>
                      )}
                      {result.status === "not_found" && (
                        <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
                          <FileSearch className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">
                          Invoice #{result.reference}
                        </p>
                        {result.jobNumber && (
                          <p className="text-xs text-white/50">
                            {result.jobNumber} &middot; {result.propertyAddress || result.jobTitle}
                          </p>
                        )}
                        {result.status === "not_found" && (
                          <p className="text-xs text-red-400/70">
                            No matching invoice in system
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        ${result.paymentAmount.toFixed(2)}
                      </p>
                      {result.discrepancyNote && (
                        <p className="text-xs text-amber-400 max-w-[200px]">
                          {result.discrepancyNote}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <AnimatedButton
                onClick={reset}
                variant="secondary"
                className="flex-1"
              >
                Scan Another
              </AnimatedButton>
              {(matchSummary.discrepancies > 0 || matchSummary.notFound > 0) && (
                <AnimatedButton
                  onClick={async () => {
                    const { generatePaymentAudit } = await import(
                      "@/app/actions/cheque-match-actions"
                    );
                    const { data: profile } = await supabase
                      .from("user_profiles")
                      .select("organization_id")
                      .single();
                    if (!profile?.organization_id) return;

                    const audit = await generatePaymentAudit(
                      profile.organization_id,
                      {},
                    );
                    // Open mailto with audit
                    window.open(
                      `mailto:?subject=${encodeURIComponent(audit.subject)}&body=${encodeURIComponent(audit.summary)}`,
                    );
                  }}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Audit
                </AnimatedButton>
              )}
            </div>
          </motion.div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center px-8"
          >
            <GlassCard className="p-8 border-red-500/30 bg-red-500/5 space-y-4">
              <p className="text-red-400 font-bold text-lg">Scan Failed</p>
              <p className="text-sm opacity-60">{errorMsg || "Something went wrong. Please try again."}</p>
              <AnimatedButton onClick={reset} variant="secondary" className="w-full">
                Retry
              </AnimatedButton>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
