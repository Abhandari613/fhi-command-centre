"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getUnit,
  getTurnoverHistory,
  getTurnoverTimeline,
  getTurnoverTasks,
} from "@/app/actions/property-actions";
import type {
  Unit,
  Turnover,
  TurnoverEvent,
  TurnoverTask,
} from "@/types/properties";
import { TURNOVER_STAGE_CONFIG } from "@/types/properties";
import { getCriticalPath } from "@/lib/turnover-critical-path";
import { getTurnoverUrgency } from "@/lib/turnover-urgency";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Flame,
  Loader2,
  RotateCw,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function UnitDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<
    | (Unit & {
        building_code?: string;
        property_id?: string;
        property_address?: string;
      })
    | null
  >(null);
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTurnover, setExpandedTurnover] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<
    Record<string, TurnoverEvent[]>
  >({});
  const [taskData, setTaskData] = useState<Record<string, TurnoverTask[]>>({});
  const [loadingTimeline, setLoadingTimeline] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [u, history] = await Promise.all([
      getUnit(unitId),
      getTurnoverHistory(unitId),
    ]);
    setUnit(u);
    setTurnovers(history);
    setLoading(false);

    // Auto-expand the active turnover
    const active = history.find((t) => t.is_active && t.stage !== "ready");
    if (active) setExpandedTurnover(active.id);
  }, [unitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTurnoverDetail = async (turnoverId: string) => {
    if (timelineData[turnoverId]) return;
    setLoadingTimeline(turnoverId);
    const [timeline, tasks] = await Promise.all([
      getTurnoverTimeline(turnoverId),
      getTurnoverTasks(turnoverId),
    ]);
    setTimelineData((prev) => ({ ...prev, [turnoverId]: timeline }));
    setTaskData((prev) => ({ ...prev, [turnoverId]: tasks }));
    setLoadingTimeline(null);
  };

  const toggleTurnover = (turnoverId: string) => {
    const isExpanding = expandedTurnover !== turnoverId;
    setExpandedTurnover(isExpanding ? turnoverId : null);
    if (isExpanding) loadTurnoverDetail(turnoverId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-12">
        <p className="text-white/40">Unit not found</p>
        <Link
          href={`/ops/properties/${propertyId}`}
          className="text-primary text-sm mt-2 inline-block"
        >
          Back to Property
        </Link>
      </div>
    );
  }

  const activeTurnover = turnovers.find(
    (t) => t.is_active && t.stage !== "ready",
  );
  const pastTurnovers = turnovers.filter(
    (t) => !t.is_active || t.stage === "ready",
  );

  return (
    <div className="relative min-h-screen pb-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-4 py-2"
      >
        {/* Header */}
        <header className="space-y-2">
          <Link
            href={`/ops/properties/${propertyId}`}
            className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            {unit.property_name ?? "PROPERTY"}
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Unit {unit.unit_number}
            </h1>
            <p className="text-[10px] text-white/30 font-mono mt-0.5">
              {unit.building_name}
              {unit.property_name && ` — ${unit.property_name}`}
            </p>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                unit.status === "turnover"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : unit.status === "ready"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-white/[0.03] text-white/30 border-white/[0.06]"
              }`}
            >
              {unit.status === "turnover" && (
                <RotateCw
                  className="w-3 h-3 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
              )}
              {unit.status}
            </span>
            <span className="text-[10px] text-white/20 font-mono">
              {turnovers.length} turnover{turnovers.length !== 1 ? "s" : ""}{" "}
              total
            </span>
          </div>
        </header>

        {/* Active Turnover */}
        {activeTurnover && (
          <ActiveTurnoverSection
            turnover={activeTurnover}
            expanded={expandedTurnover === activeTurnover.id}
            onToggle={() => toggleTurnover(activeTurnover.id)}
            timeline={timelineData[activeTurnover.id]}
            tasks={taskData[activeTurnover.id]}
            loadingTimeline={loadingTimeline === activeTurnover.id}
          />
        )}

        {/* Turnover History */}
        {pastTurnovers.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Turnover History
            </h2>
            {pastTurnovers.map((turnover) => (
              <HistoryCard
                key={turnover.id}
                turnover={turnover}
                expanded={expandedTurnover === turnover.id}
                onToggle={() => toggleTurnover(turnover.id)}
                timeline={timelineData[turnover.id]}
                tasks={taskData[turnover.id]}
                loadingTimeline={loadingTimeline === turnover.id}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {turnovers.length === 0 && (
          <GlassCard className="p-8 text-center">
            <Clock className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="text-sm text-white/30">No turnover history</p>
            <p className="text-xs text-white/20 mt-1">
              This unit has never been turned over
            </p>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}

// ── Active Turnover Section ──

function ActiveTurnoverSection({
  turnover,
  expanded,
  onToggle,
  timeline,
  tasks,
  loadingTimeline,
}: {
  turnover: Turnover;
  expanded: boolean;
  onToggle: () => void;
  timeline?: TurnoverEvent[];
  tasks?: TurnoverTask[];
  loadingTimeline: boolean;
}) {
  const urgency = getTurnoverUrgency(turnover);
  const criticalPath = getCriticalPath(turnover);
  const stageConfig = TURNOVER_STAGE_CONFIG[turnover.stage];

  return (
    <GlassCard intensity="bright" className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Active Turnover
            </span>
            <span
              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${urgency.bgColor} ${urgency.color} ${urgency.borderColor} ${urgency.pulse ? "animate-pulse" : ""}`}
            >
              {urgency.tier === "fire" && <Flame className="w-2.5 h-2.5 inline mr-0.5" />}
              {urgency.label}
            </span>
            <span
              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${criticalPath.bgColor} ${criticalPath.color}`}
            >
              {criticalPath.label}
            </span>
          </div>

          {/* Stage + progress */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stageConfig.bgColor} ${stageConfig.color}`}
            >
              {stageConfig.label}
            </span>
            {turnover.assigned_name && (
              <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
                <User className="w-3 h-3" />
                {turnover.assigned_name}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-2">
            <div
              className={`h-full rounded-full transition-all ${
                criticalPath.status === "on_track"
                  ? "bg-emerald-500"
                  : criticalPath.status === "at_risk"
                    ? "bg-yellow-500"
                    : criticalPath.status === "behind"
                      ? "bg-orange-500"
                      : "bg-red-500"
              }`}
              style={{ width: `${Math.round(criticalPath.actualProgress * 100)}%` }}
            />
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
            {turnover.move_in_date && (
              <span className={urgency.tier === "fire" ? "text-red-400 font-bold" : ""}>
                <Calendar className="w-3 h-3 inline mr-0.5" />
                Move-in{" "}
                {new Date(turnover.move_in_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {turnover.target_ready_date && (
              <span>
                Due{" "}
                {new Date(turnover.target_ready_date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
            )}
            {(turnover.estimated_cost ?? 0) > 0 && (
              <span>
                <DollarSign className="w-3 h-3 inline" />
                {turnover.estimated_cost?.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1"
        >
          <ChevronRight className="w-4 h-4 text-white/20" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
              {/* Tasks */}
              {tasks && tasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                    Tasks ({tasks.filter((t) => t.status === "completed").length}
                    /{tasks.length})
                  </p>
                  <div className="space-y-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 text-xs py-1 ${
                          task.status === "completed"
                            ? "text-white/20 line-through"
                            : task.status === "skipped"
                              ? "text-white/15 line-through"
                              : "text-white/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.status === "completed"
                              ? "bg-emerald-500"
                              : task.status === "in_progress"
                                ? "bg-amber-500"
                                : task.status === "skipped"
                                  ? "bg-gray-500"
                                  : "bg-white/20"
                          }`}
                        />
                        <span className="flex-1 truncate">
                          {task.description}
                        </span>
                        {task.trade && (
                          <span className="text-[9px] text-white/20 font-mono">
                            {task.trade}
                          </span>
                        )}
                        {task.assigned_name && (
                          <span className="text-[9px] text-white/20 font-mono">
                            {task.assigned_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {loadingTimeline && (
                <div className="flex items-center gap-2 text-white/20 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading timeline...
                </div>
              )}
              {timeline && timeline.length > 0 && (
                <TimelineView events={timeline} />
              )}

              {/* Job link */}
              {turnover.job_id && (
                <Link
                  href={`/ops/jobs/${turnover.job_id}`}
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View linked job
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ── History Card ──

function HistoryCard({
  turnover,
  expanded,
  onToggle,
  timeline,
  tasks,
  loadingTimeline,
}: {
  turnover: Turnover;
  expanded: boolean;
  onToggle: () => void;
  timeline?: TurnoverEvent[];
  tasks?: TurnoverTask[];
  loadingTimeline: boolean;
}) {
  const startDate = new Date(turnover.created_at);
  const endDate = turnover.completed_at
    ? new Date(turnover.completed_at)
    : null;

  return (
    <GlassCard intensity="panel" className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-white/60">
              {startDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {endDate && (
                <>
                  {" "}
                  —{" "}
                  {endDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </span>
            {turnover.duration_days != null && (
              <span className="text-[9px] text-white/20 font-mono">
                {turnover.duration_days}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
            {turnover.task_count != null && turnover.task_count > 0 && (
              <span>
                {turnover.tasks_completed}/{turnover.task_count} tasks
              </span>
            )}
            {(turnover.actual_cost ?? turnover.estimated_cost ?? 0) > 0 && (
              <span>
                ${(
                  turnover.actual_cost ??
                  turnover.estimated_cost ??
                  0
                ).toFixed(0)}
              </span>
            )}
            {turnover.assigned_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {turnover.assigned_name}
              </span>
            )}
            {turnover.job_id && (
              <Link
                href={`/ops/jobs/${turnover.job_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <ExternalLink className="w-3 h-3 inline" /> Job
              </Link>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-white/20" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-white/[0.04] pt-2 space-y-3">
              {/* Notes */}
              {turnover.notes && (
                <p className="text-xs text-white/40 italic">{turnover.notes}</p>
              )}

              {/* Tasks */}
              {tasks && tasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
                    Tasks
                  </p>
                  <div className="space-y-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-xs text-white/30"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.status === "completed"
                              ? "bg-emerald-500"
                              : task.status === "skipped"
                                ? "bg-gray-500"
                                : "bg-white/20"
                          }`}
                        />
                        <span className="flex-1 truncate">
                          {task.description}
                        </span>
                        {task.actual_cost != null && task.actual_cost > 0 && (
                          <span className="text-[9px] font-mono">
                            ${task.actual_cost.toFixed(0)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {loadingTimeline && (
                <div className="flex items-center gap-2 text-white/20 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </div>
              )}
              {timeline && timeline.length > 0 && (
                <TimelineView events={timeline} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ── Timeline View ──

const EVENT_LABELS: Record<string, string> = {
  created: "Turnover started",
  stage_changed: "Stage advanced",
  task_added: "Task added",
  task_completed: "Task completed",
  task_skipped: "Task skipped",
  assigned: "Assigned",
  unassigned: "Unassigned",
  cost_updated: "Cost updated",
  note_added: "Note added",
  job_linked: "Job created",
  photo_added: "Photo added",
  completed: "Turnover completed",
};

function TimelineView({ events }: { events: TurnoverEvent[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
        Timeline
      </p>
      <div className="relative pl-4 border-l border-white/[0.06] space-y-2">
        {events.map((event) => (
          <div key={event.id} className="relative">
            <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-white/10 border border-white/20" />
            <div className="text-[10px]">
              <span className="text-white/50 font-medium">
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </span>
              {event.new_value &&
                event.event_type === "stage_changed" &&
                (event.new_value as Record<string, string>).stage && (
                  <span className="text-white/30 ml-1">
                    →{" "}
                    {TURNOVER_STAGE_CONFIG[
                      (event.new_value as Record<string, string>)
                        .stage as keyof typeof TURNOVER_STAGE_CONFIG
                    ]?.label ??
                      (event.new_value as Record<string, string>).stage}
                  </span>
                )}
              {event.new_value &&
                event.event_type === "task_completed" &&
                (event.new_value as Record<string, string>)
                  .task_description && (
                  <span className="text-white/30 ml-1">
                    —{" "}
                    {
                      (event.new_value as Record<string, string>)
                        .task_description
                    }
                  </span>
                )}
              <span className="text-white/15 font-mono ml-2">
                {new Date(event.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                {new Date(event.created_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
