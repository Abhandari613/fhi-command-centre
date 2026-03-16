"use client";

import { ReceiptList } from "@/components/receipts/ReceiptList";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

export default function ReceiptsPage() {
  return (
    <div className="relative min-h-screen pb-24">
      <div className="flex flex-col gap-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Receipts
            </h1>
            <p className="text-[10px] font-mono text-white/30 tracking-wider">
              Expense Management
            </p>
          </div>
          <Link href="/ops/receipts/upload">
            <AnimatedButton variant="primary" size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Upload
            </AnimatedButton>
          </Link>
        </header>

        <ReceiptList />
      </div>
    </div>
  );
}
