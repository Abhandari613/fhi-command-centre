"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReceiptReviewQueue } from "@/components/receipts/ReceiptReviewQueue";

export default function ReceiptReviewPage() {
  return (
    <div className="space-y-4">
      <header>
        <Link
          href="/ops/receipts"
          className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          RECEIPTS
        </Link>
        <h1 className="text-xl font-bold text-white">Receipt Review</h1>
        <p className="text-sm text-gray-400 mt-1">
          Confirm auto-matches or assign receipts to jobs.
        </p>
      </header>

      <ReceiptReviewQueue />
    </div>
  );
}
