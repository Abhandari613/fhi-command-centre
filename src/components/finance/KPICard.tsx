"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  icon,
  trend,
  accent,
  className,
}: KPICardProps) {
  return (
    <GlassCard
      intensity="panel"
      className={cn(
        "p-4 flex flex-col gap-2 relative overflow-hidden",
        className,
      )}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(to right, ${accent}40, transparent)`,
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">
          {label}
        </span>
        <div className="text-gray-500">{icon}</div>
      </div>
      <span
        className={cn(
          "text-2xl font-black tabular-nums tracking-tight",
          trend === "up" && "text-emerald-400",
          trend === "down" && "text-red-400",
          !trend && "text-white",
        )}
      >
        {value}
      </span>
    </GlassCard>
  );
}
