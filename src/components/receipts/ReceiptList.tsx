"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

type Receipt = Database["public"]["Tables"]["receipts"]["Row"];

export function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReceipts = async () => {
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setReceipts(data);
      setLoading(false);
    };

    fetchReceipts();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {receipts.length === 0 ? (
        <motion.div
          variants={item}
          className="text-center opacity-50 py-12 flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-lg font-medium">No receipts found.</p>
          <Link
            href="/receipts/upload"
            className="text-primary hover:underline font-bold"
          >
            Snap your first receipt
          </Link>
        </motion.div>
      ) : (
        receipts.map((receipt) => (
          <motion.div key={receipt.id} variants={item}>
            <GlassCard className="p-4 flex items-center justify-between group active:scale-95 transition-transform hover:bg-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-center gap-4 relative z-10">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                    receipt.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : receipt.status === "processing"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                  )}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white group-hover:text-primary transition-colors">
                    {receipt.merchant}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {new Date(receipt.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="text-right relative z-10">
                <span className="block font-bold text-lg tracking-tight">
                  ${receipt.total.toFixed(2)}
                </span>
                <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase font-bold tracking-wider mt-1">
                  {receipt.status === "approved" && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />{" "}
                      <span className="text-emerald-500/80">Synced</span>
                    </>
                  )}
                  {receipt.status === "processing" && (
                    <>
                      <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />{" "}
                      <span className="text-blue-500/80">OCR</span>
                    </>
                  )}
                  {receipt.status === "attention" && (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-500" />{" "}
                      <span className="text-amber-500/80">Review</span>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
