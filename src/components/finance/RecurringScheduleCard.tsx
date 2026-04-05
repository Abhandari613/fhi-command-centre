"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Calendar, Pause, Play, Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { updateRecurringSchedule } from "@/app/actions/recurring-schedule-actions";
import type { RecurringSchedule } from "@/app/actions/recurring-schedule-actions";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FREQ_BADGE: Record<string, { label: string; color: string }> = {
  weekly: {
    label: "Weekly",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  biweekly: {
    label: "Bi-Weekly",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  monthly: {
    label: "Monthly",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  quarterly: {
    label: "Quarterly",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
};

interface RecurringScheduleCardProps {
  schedule: RecurringSchedule;
  clientName?: string;
  onToggle?: () => void;
  onEdit?: (schedule: RecurringSchedule) => void;
}

export function RecurringScheduleCard({
  schedule,
  clientName,
  onToggle,
  onEdit,
}: RecurringScheduleCardProps) {
  const [isPending, startTransition] = useTransition();
  const freq = FREQ_BADGE[schedule.frequency] || FREQ_BADGE.monthly;

  const cycleTotal =
    schedule.line_items?.reduce(
      (sum, li) => sum + li.quantity * li.unit_price,
      0,
    ) ?? 0;

  const handleToggle = () => {
    startTransition(async () => {
      await updateRecurringSchedule(schedule.id, {
        is_active: !schedule.is_active,
      });
      onToggle?.();
    });
  };

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm text-white truncate">
            {schedule.title}
          </h3>
          {clientName && (
            <p className="text-xs text-white/50 mt-0.5">{clientName}</p>
          )}
        </div>
        <span
          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${freq.color}`}
        >
          {freq.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Next:{" "}
          {new Date(schedule.next_due).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
        <span>{schedule.line_items?.length ?? 0} items</span>
        <span className="text-emerald-400 font-semibold">
          {fmt.format(cycleTotal)}/cycle
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span
          className={`text-xs font-bold ${schedule.is_active ? "text-emerald-400" : "text-white/30"}`}
        >
          {schedule.is_active ? "Active" : "Paused"}
        </span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => onEdit(schedule)}
            >
              <Pencil className="w-3 h-3" /> Edit
            </AnimatedButton>
          )}
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : schedule.is_active ? (
              <>
                <Pause className="w-3 h-3" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Resume
              </>
            )}
          </AnimatedButton>
        </div>
      </div>
    </GlassCard>
  );
}
