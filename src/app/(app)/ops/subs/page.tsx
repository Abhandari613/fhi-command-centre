"use client";

import { SubList } from "@/components/subs/SubList";
import Link from "next/link";

export default function SubsPage() {
  return (
    <div className="relative min-h-screen pb-24">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Team
          </h1>
          <p className="text-[10px] font-mono text-white/30 tracking-wider">
            Manage Subcontractors
          </p>
        </header>

        <SubList />
      </div>
    </div>
  );
}
