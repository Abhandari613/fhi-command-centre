"use client";


import { ReceiptList } from "@/components/receipts/ReceiptList";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

export default function ReceiptsPage() {
    return (
        <div className="relative min-h-screen pb-24 overflow-hidden">
            <div className="aurora-blur bg-amber-500/10 top-[-50px] left-[-50px]" />
            <div className="aurora-blur bg-primary/10 bottom-[-50px] right-[-50px]" />

            <div className="p-6 flex flex-col gap-8 relative z-10">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                            Receipts
                        </h1>
                        <p className="text-primary font-medium opacity-90 tracking-wide uppercase text-xs mt-1">
                            Expense Management
                        </p>
                    </div>
                    <Link href="/ops/receipts/upload">
                        <AnimatedButton size="icon" className="rounded-full shadow-[0_0_20px_rgba(0,229,255,0.4)]">
                            <Plus className="w-6 h-6" />
                        </AnimatedButton>
                    </Link>
                </header>

                <ReceiptList />
            </div>
        </div>
    );
}
