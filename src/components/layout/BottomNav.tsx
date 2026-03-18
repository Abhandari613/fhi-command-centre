"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  LayoutDashboard,
  Briefcase,
  FileText,
  Plus,
  DollarSign,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems: { name: string; href: string; icon: any; isFab?: boolean }[] =
    [
      { name: "Home", href: "/", icon: Home },
      { name: "Jobs", href: "/dashboard", icon: LayoutDashboard },
      { name: "Work Orders", href: "/ops/work-orders", icon: Briefcase },
      { name: "New Job", href: "/jobs/new", icon: Plus, isFab: true },
      { name: "Estimates", href: "/ops/quotes", icon: FileText },
      { name: "Properties", href: "/ops/properties", icon: Building2 },
      { name: "Finance", href: "/ops/finance", icon: DollarSign },
    ];

  return (
    <>
      <div className="h-24" />
      <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto w-full">
        {/* Top edge line — like truck chrome trim */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="bg-[#0c0c0e]/95 backdrop-blur-xl px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-end">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

            if (item.isFab) {
              return (
                <div key={item.name} className="relative -top-7">
                  <Link
                    href={item.href}
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-b from-primary to-[#e05e00]",
                      "shadow-[0_4px_20px_-2px_rgba(255,107,0,0.5),0_1px_0_0_rgba(255,255,255,0.1)_inset]",
                      "border border-primary/50",
                      "active:scale-95 active:shadow-[0_2px_8px_-2px_rgba(255,107,0,0.3)]",
                      "transition-all duration-200",
                    )}
                  >
                    <item.icon
                      className="text-white w-7 h-7"
                      strokeWidth={2.5}
                    />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-200 py-1 px-2 rounded-lg",
                  isActive
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-300 active:text-gray-200",
                )}
              >
                <div className="relative">
                  <item.icon
                    className="w-5 h-5"
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {isActive && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_rgba(255,107,0,0.6)]" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-wide",
                    isActive ? "font-bold" : "font-medium",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
