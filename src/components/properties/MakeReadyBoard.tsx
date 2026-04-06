"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Turnover, TurnoverStage } from "@/types/properties";
import { TURNOVER_STAGES, TURNOVER_STAGE_CONFIG } from "@/types/properties";
import {
  Briefcase,
  ChevronRight,
  Clock,
  DoorOpen,
  ExternalLink,
  Flame,
  Loader2,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getTurnoverUrgency, sortByUrgency } from "@/lib/turnover-urgency";
import { getCriticalPath } from "@/lib/turnover-critical-path";
import type { SubcontractorWorkload } from "@/types/properties";

export function MakeReadyBoard({
  turnovers,
  onAdvance,
  onRefresh,
  onCreateJob,
  subWorkloads,
}: {
  turnovers: Turnover[];
  onAdvance: (turnoverId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onCreateJob?: (
    turnoverId: string,
  ) => Promise<{ jobId: string; jobNumber?: string } | null>;
  subWorkloads?: SubcontractorWorkload[];
}) {
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [creatingJob, setCreatingJob] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<TurnoverStage | "all">("all");

  const handleAdvance = async (turnoverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdvancing(turnoverId);
    await onAdvance(turnoverId);
    setAdvancing(null);
  };

  const handleCreateJob = async (turnoverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCreateJob) return;
    setCreatingJob(turnoverId);
    const result = await onCreateJob(turnoverId);
    setCreatingJob(null);
    if (result?.jobId) {
      await onRefresh();
    }
  };

  // Group turnovers by stage, sorted by move-in urgency within each
  const byStage = TURNOVER_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = sortByUrgency(turnovers.filter((t) => t.stage === stage));
      return acc;
    },
    {} as Record<TurnoverStage, Turnover[]>,
  );

  const filteredStages =
    activeStage === "all"
      ? TURNOVER_STAGES.filter((s) => byStage[s].length > 0)
      : [activeStage];

  if (turnovers.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <DoorOpen className="w-12 h-12 mx-auto opacity-20 mb-3" />
        <p className="text-sm font-semibold text-white/40">
          No active turnovers
        </p>
        <p className="text-xs text-white/20 mt-1">
          Start a turnover from the Buildings view when a unit vacates
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stage filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setActiveStage("all")}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors border ${
            activeStage === "all"
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-white/[0.03] text-white/40 border-white/[0.06]"
          }`}
        >
          All ({turnovers.length})
        </button>
        {TURNOVER_STAGES.map((stage) => {
          const count = byStage[stage].length;
          if (count === 0) return null;
          const config = TURNOVER_STAGE_CONFIG[stage];
          return (
            <button
              key={stage}
              onClick={() =>
                setActiveStage(stage === activeStage ? "all" : stage)
              }
              className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors border ${
                activeStage === stage
                  ? `${config.bgColor} ${config.color} border-current/30`
                  : "bg-white/[0.03] text-white/40 border-white/[0.06]"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Board columns */}
      <AnimatePresence mode="popLayout">
        {filteredStages.map((stage) => {
          const config = TURNOVER_STAGE_CONFIG[stage];
          const items = byStage[stage];
          if (items.length === 0) return null;

          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${config.bgColor.replace("/10", "")}`}
                />
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${config.color}`}
                >
                  {config.label}
                </span>
                <span className="text-[10px] text-white/20 font-mono">
                  ({items.length})
                </span>
              </div>

              {/* Turnover cards */}
              <div className="space-y-2">
                {items.map((turnover) => (
                  <TurnoverCard
                    key={turnover.id}
                    turnover={turnover}
                    stage={stage}
                    advancing={advancing === turnover.id}
                    onAdvance={(e) => handleAdvance(turnover.id, e)}
                    creatingJob={creatingJob === turnover.id}
                    onCreateJob={
                      onCreateJob
                        ? (e) => handleCreateJob(turnover.id, e)
                        : undefined
                    }
                    subWorkloads={subWorkloads}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function TurnoverCard({
  turnover,
  stage,
  advancing,
  onAdvance,
  creatingJob,
  onCreateJob,
  subWorkloads,
}: {
  turnover: Turnover;
  stage: TurnoverStage;
  advancing: boolean;
  onAdvance: (e: React.MouseEvent) => void;
  creatingJob?: boolean;
  onCreateJob?: (e: React.MouseEvent) => void;
  subWorkloads?: SubcontractorWorkload[];
}) {
  const config = TURNOVER_STAGE_CONFIG[stage];
  const urgency = getTurnoverUrgency(turnover);
  const criticalPath = getCriticalPath(turnover);

  // Find sub workload info if assigned
  const subWorkload = turnover.assigned_to && subWorkloads
    ? subWorkloads.find((w) => w.subcontractor_id === turnover.assigned_to)
    : null;

  // Left border color based on critical path
  const leftBorderClass =
    criticalPath.status === "behind"
      ? "border-l-2 border-l-orange-500/50"
      : criticalPath.status === "blocked"
        ? "border-l-2 border-l-red-500/50"
        : "";

  return (
    <GlassCard className={`p-3 ${leftBorderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Unit + Building + Pills */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${config.bgColor} ${config.color}`}
            >
              {turnover.unit_number}
            </span>
            <span className="text-[10px] text-white/40 truncate">
              {turnover.building_name}
              {turnover.building_code && ` (${turnover.building_code})`}
            </span>
            <div className="ml-auto shrink-0 flex items-center gap-1">
              {/* Critical path pill */}
              {criticalPath.status !== "on_track" && (
                <span
                  className={`text-[8px] font-bold font-mono px-1 py-0.5 rounded ${criticalPath.bgColor} ${criticalPath.color}`}
                >
                  {criticalPath.label}
                </span>
              )}
              {/* Move-in urgency pill */}
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${urgency.bgColor} ${urgency.color} ${urgency.borderColor} ${urgency.pulse ? "animate-pulse" : ""}`}
              >
                {urgency.tier === "fire" && <Flame className="w-2.5 h-2.5" />}
                {urgency.label}
              </span>
            </div>
          </div>

          {/* Property if showing all */}
          {turnover.property_name && (
            <p className="text-[10px] text-white/20 font-mono truncate mb-1">
              {turnover.property_name}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
            {turnover.days_vacant != null && turnover.days_vacant > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {turnover.days_vacant}d vacant
              </span>
            )}
            {turnover.move_in_date && (
              <span
                className={
                  urgency.tier === "fire" ? "text-red-400 font-bold" : ""
                }
              >
                Move-in{" "}
                {new Date(turnover.move_in_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {turnover.target_ready_date && (
              <span
                className={
                  new Date(turnover.target_ready_date) < new Date()
                    ? "text-red-400 font-bold"
                    : ""
                }
              >
                Due{" "}
                {new Date(turnover.target_ready_date).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  },
                )}
              </span>
            )}
            {turnover.assigned_name && (
              <span className={`flex items-center gap-1 ${
                subWorkload?.capacity_status === "overloaded"
                  ? "text-red-400"
                  : subWorkload?.capacity_status === "at_capacity"
                    ? "text-amber-400"
                    : ""
              }`}>
                <User className="w-3 h-3" />
                {turnover.assigned_name}
                {subWorkload && (
                  <span className="text-[8px] opacity-60">
                    ({subWorkload.active_task_count}/{subWorkload.max_concurrent_tasks})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Cost */}
          {(turnover.estimated_cost ?? 0) > 0 && (
            <p className="text-[10px] text-white/20 font-mono mt-1">
              Est ${turnover.estimated_cost?.toFixed(0)}
              {turnover.actual_cost != null && (
                <span className="text-white/40">
                  {" "}
                  / Actual ${turnover.actual_cost.toFixed(0)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* Advance button */}
          {stage !== "ready" && (
            <button
              onClick={onAdvance}
              disabled={advancing}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all"
              title="Advance to next stage"
            >
              {advancing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-5 h-5 opacity-50" />
              )}
            </button>
          )}

          {/* Create Job / View Job button */}
          {turnover.job_id ? (
            <a
              href={`/ops/jobs/${turnover.job_id}`}
              className="min-w-[40px] min-h-[28px] flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all"
              title="View linked job"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          ) : onCreateJob ? (
            <button
              onClick={onCreateJob}
              disabled={creatingJob}
              className="min-w-[40px] min-h-[28px] flex items-center justify-center bg-primary/10 hover:bg-primary/20 rounded-lg transition-all"
              title="Create job from turnover"
            >
              {creatingJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Briefcase className="w-3.5 h-3.5 text-primary/60" />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
