"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  ArrowLeft,
  Loader2,
  Flame,
  Thermometer,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TURNOVER_STAGES = [
  { key: "notice", label: "Notice" },
  { key: "vacated", label: "Vacated" },
  { key: "inspection", label: "Inspect" },
  { key: "in_progress", label: "In Progress" },
  { key: "paint", label: "Paint" },
  { key: "clean", label: "Clean" },
  { key: "final_qc", label: "Final QC" },
  { key: "ready", label: "Ready" },
];

const URGENCY_CONFIG: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  fire: {
    icon: Flame,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "FIRE",
  },
  hot: {
    icon: Thermometer,
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    label: "HOT",
  },
  warm: {
    icon: Timer,
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    label: "WARM",
  },
  cool: {
    icon: CheckCircle2,
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    label: "COOL",
  },
};

type TurnoverUnit = {
  id: string;
  unit_number: string;
  turnover_stage: string;
  move_in_date: string | null;
  building_id: string;
  building_name: string;
  property_name: string;
  property_id: string;
  task_total: number;
  task_completed: number;
  urgency: string;
  days_until_move_in: number | null;
};

export default function TurnoverKanbanPage() {
  const [units, setUnits] = useState<TurnoverUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTurnovers = async () => {
      // Get all units with active turnovers
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      // Get units that have a turnover in progress (turnover_stage is not null and not 'ready')
      const { data: rawUnits } = await (supabase.from as any)("units")
        .select(
          `
          id, unit_number, turnover_stage, move_in_date,
          buildings!inner(id, name, properties!inner(id, name))
        `,
        )
        .not("turnover_stage", "is", null)
        .neq("turnover_stage", "none");

      if (!rawUnits) {
        setLoading(false);
        return;
      }

      // Calculate urgency and task progress for each unit
      const enriched: TurnoverUnit[] = [];

      for (const unit of rawUnits) {
        // Get task progress from work_order_tasks linked to this unit
        const { count: taskTotal } = await (supabase.from as any)(
          "work_order_tasks",
        )
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unit.id);

        const { count: taskCompleted } = await (supabase.from as any)(
          "work_order_tasks",
        )
          .select("id", { count: "exact", head: true })
          .eq("unit_id", unit.id)
          .eq("status", "Completed");

        // Calculate urgency based on days until move-in
        let daysUntil: number | null = null;
        let urgency = "cool";

        if (unit.move_in_date) {
          const moveIn = new Date(unit.move_in_date);
          const now = new Date();
          daysUntil = Math.ceil(
            (moveIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysUntil <= 3) urgency = "fire";
          else if (daysUntil <= 7) urgency = "hot";
          else if (daysUntil <= 14) urgency = "warm";
          else urgency = "cool";
        }

        enriched.push({
          id: unit.id,
          unit_number: unit.unit_number,
          turnover_stage: unit.turnover_stage || "notice",
          move_in_date: unit.move_in_date,
          building_id: unit.buildings?.id,
          building_name: unit.buildings?.name || "",
          property_name: unit.buildings?.properties?.name || "",
          property_id: unit.buildings?.properties?.id || "",
          task_total: taskTotal || 0,
          task_completed: taskCompleted || 0,
          urgency,
          days_until_move_in: daysUntil,
        });
      }

      setUnits(enriched);
      setLoading(false);
    };

    fetchTurnovers();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <Link
          href="/ops/properties"
          className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          PROPERTIES
        </Link>
        <h1 className="text-xl font-bold text-white">Active Turnovers</h1>
        <p className="text-sm text-gray-400 mt-1">
          {units.length} unit{units.length !== 1 ? "s" : ""} in turnover across
          all properties
        </p>
      </header>

      {/* Kanban columns — horizontal scroll */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-3 min-w-max">
          {TURNOVER_STAGES.map((stage) => {
            const stageUnits = units
              .filter((u) => u.turnover_stage === stage.key)
              .sort((a, b) => {
                // Sort by urgency (fire first)
                const urgencyOrder: Record<string, number> = {
                  fire: 0,
                  hot: 1,
                  warm: 2,
                  cool: 3,
                };
                return (
                  (urgencyOrder[a.urgency] || 3) -
                  (urgencyOrder[b.urgency] || 3)
                );
              });

            return (
              <div
                key={stage.key}
                className="w-[200px] flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {stage.label}
                  </h3>
                  {stageUnits.length > 0 && (
                    <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">
                      {stageUnits.length}
                    </span>
                  )}
                </div>

                <div className="space-y-2 min-h-[100px]">
                  {stageUnits.length === 0 ? (
                    <div className="h-20 border border-dashed border-white/5 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] text-gray-600">Empty</span>
                    </div>
                  ) : (
                    stageUnits.map((unit) => {
                      const urgencyConf =
                        URGENCY_CONFIG[unit.urgency] || URGENCY_CONFIG.cool;
                      const UrgencyIcon = urgencyConf.icon;
                      const progress =
                        unit.task_total > 0
                          ? Math.round(
                              (unit.task_completed / unit.task_total) * 100,
                            )
                          : 0;

                      return (
                        <Link
                          key={unit.id}
                          href={`/ops/properties/${unit.property_id}/units/${unit.id}`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <GlassCard className="p-3 hover:bg-white/[0.04] transition-colors cursor-pointer">
                              {/* Unit header */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-bold text-white">
                                  {unit.unit_number}
                                </span>
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border flex items-center gap-0.5",
                                    urgencyConf.color,
                                  )}
                                >
                                  <UrgencyIcon className="w-2.5 h-2.5" />
                                  {urgencyConf.label}
                                </span>
                              </div>

                              {/* Property info */}
                              <p className="text-[10px] text-gray-500 truncate">
                                {unit.property_name}
                              </p>

                              {/* Days until move-in */}
                              {unit.days_until_move_in !== null && (
                                <p
                                  className={cn(
                                    "text-[10px] font-bold mt-1",
                                    unit.days_until_move_in <= 3
                                      ? "text-red-400"
                                      : unit.days_until_move_in <= 7
                                        ? "text-orange-400"
                                        : "text-gray-500",
                                  )}
                                >
                                  {unit.days_until_move_in <= 0
                                    ? "OVERDUE"
                                    : `${unit.days_until_move_in}d to move-in`}
                                </p>
                              )}

                              {/* Task progress */}
                              {unit.task_total > 0 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                                    <span>
                                      {unit.task_completed}/{unit.task_total}
                                    </span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </GlassCard>
                          </motion.div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
