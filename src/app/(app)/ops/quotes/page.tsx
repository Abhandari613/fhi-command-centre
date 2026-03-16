"use client";

import { QuoteList } from "@/components/quotes/QuoteList";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

export default function QuotesPage() {
  return (
    <div className="relative min-h-screen pb-24">
      <div className="flex flex-col gap-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Estimates
            </h1>
            <p className="text-[10px] font-mono text-white/30 tracking-wider">
              Legacy Estimates
            </p>
          </div>
          <Link href="/ops/quotes/create">
            <AnimatedButton variant="primary" size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              New
            </AnimatedButton>
          </Link>
        </header>

        <QuoteList />
      </div>
    </div>
  );
}
