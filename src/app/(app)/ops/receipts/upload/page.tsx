"use client";

import { ReceiptScanner } from "@/components/receipts/ReceiptScanner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

export default function ReceiptUploadPage() {
    return (
        <div className="relative min-h-screen pb-24 overflow-hidden">
            <div className="aurora-blur bg-primary/20 top-[-50px] right-[-50px]" />

            <div className="p-6 flex flex-col gap-6 relative z-10">
                <header className="flex items-center gap-4">
                    <Link href="/ops/receipts">
                        <AnimatedButton variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </AnimatedButton>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white">Upload Receipt</h1>
                        <p className="text-white/60 text-sm font-medium">Capture details via OCR</p>
                    </div>
                </header>

                <ReceiptScanner />
            </div>
        </div>
    );
}
