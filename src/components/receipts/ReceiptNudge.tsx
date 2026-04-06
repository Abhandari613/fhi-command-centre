"use client";

import { useEffect, useState } from "react";
import { getReceiptNudge } from "@/app/actions/receipt-capture-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Camera, FileStack, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function ReceiptNudge() {
  const [nudge, setNudge] = useState<{
    show: boolean;
    type?: string;
    count?: number;
  }>({ show: false });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getReceiptNudge().then(setNudge);
  }, []);

  if (!nudge.show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <GlassCard className="p-4 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {nudge.type === "no_receipts" ? (
                <Camera className="w-5 h-5 text-primary" />
              ) : (
                <FileStack className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {nudge.type === "no_receipts" ? (
                <>
                  <p className="text-sm font-bold text-white">
                    Any receipts in your pocket?
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    You have active jobs but no receipts logged recently. Tap
                    the camera button to snap one.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-white">
                    {nudge.count} receipts to review
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Quick review — should take about 2 minutes.
                  </p>
                  <Link
                    href="/ops/receipts/review"
                    className="text-xs text-primary font-bold mt-2 inline-block"
                  >
                    Review now
                  </Link>
                </>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
