"use client";

import { SubList } from "@/components/subs/SubList";
import Link from "next/link";

export default function SubsPage() {
    return (
        <div className="relative min-h-screen pb-24 overflow-hidden">
            <div className="aurora-blur bg-secondary/20 top-[-50px] left-[-50px]" />
            <div className="aurora-blur bg-primary/20 bottom-[-50px] right-[-50px]" />

            <div className="p-6 flex flex-col gap-6 relative z-10">
                <header className="mb-2">
                    <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                        Team
                    </h1>
                    <p className="text-primary font-medium opacity-90 tracking-wide uppercase text-xs mt-1">
                        Manage Subcontractors
                    </p>
                </header>

                <SubList />
            </div>
        </div>
    );
}
