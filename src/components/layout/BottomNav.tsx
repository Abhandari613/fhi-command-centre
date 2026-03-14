"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Briefcase, FileText, Calendar, Plus, DollarSign, User, TrendingUp, Building, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    const navItems: { name: string; href: string; icon: any; isFab?: boolean }[] = [
        { name: "Jobs", href: "/dashboard", icon: LayoutDashboard },
        { name: "Work Orders", href: "/ops/work-orders", icon: Briefcase },
        { name: "New Job", href: "/ingest", icon: Plus, isFab: true },
        { name: "Estimates", href: "/ops/quotes", icon: FileText },
        { name: "Finance", href: "/ops/finance", icon: DollarSign },
    ];

    return (
        <>
            <div className="h-24" /> {/* Spacer */}
            <nav className="fixed bottom-0 left-0 right-0 glass border-t-0 rounded-t-2xl px-6 py-4 flex justify-between items-end z-50 max-w-lg mx-auto w-full backdrop-blur-xl bg-background-dark/80">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.isFab) {
                        return (
                            <div key={item.name} className="relative -top-8 group">
                                <Link
                                    href={item.href}
                                    className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-background-dark transform transition-transform active:scale-95"
                                >
                                    <item.icon className="text-white w-8 h-8" />
                                </Link>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive ? "text-primary" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <item.icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
