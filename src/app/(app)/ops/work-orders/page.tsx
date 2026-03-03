"use client";

import { WorkOrderList } from "@/components/work-orders/WorkOrderList";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function WorkOrdersPage() {
    return (
        <div className="min-h-screen pb-24">
            <div className="p-6">
                <header className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Work Orders</h1>
                        <p className="text-sm opacity-70">Manage active projects and units</p>
                    </div>
                    <Link href="/ops/quotes/create" className="bg-primary hover:bg-primary/90 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 transition-all">
                        <Plus className="w-6 h-6" />
                    </Link>
                </header>

                <WorkOrderList />
            </div>
        </div>
    );
}
