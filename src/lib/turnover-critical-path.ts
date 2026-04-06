import type { Turnover } from "@/types/properties";
import type { CriticalPathStatus, CriticalPathInfo } from "@/types/properties";
import { TURNOVER_STAGES } from "@/types/properties";
import { getTurnoverUrgency } from "./turnover-urgency";

const CRITICAL_PATH_CONFIG: Record<
  CriticalPathStatus,
  { label: string; color: string; bgColor: string }
> = {
  on_track: {
    label: "On Track",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
  },
  at_risk: {
    label: "At Risk",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/15",
  },
  behind: {
    label: "Behind",
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
  },
  blocked: {
    label: "Blocked",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
  },
};

/**
 * Compute critical path status for a turnover.
 *
 * Compares expected progress (time elapsed / time available) against
 * actual progress (weighted: 60% stage, 40% tasks).
 *
 * - on_track: ahead or on schedule
 * - at_risk: slightly behind (gap <= 0.15)
 * - behind: significantly behind (gap > 0.15)
 * - blocked: no target date and urgency is fire/hot, OR stalled
 */
export function getCriticalPath(turnover: Turnover): CriticalPathInfo {
  // Completed turnovers are always on track
  if (turnover.stage === "ready") {
    return {
      ...CRITICAL_PATH_CONFIG.on_track,
      status: "on_track",
      expectedProgress: 1,
      actualProgress: 1,
      gap: 0,
    };
  }

  // Calculate actual progress (weighted: stage 60%, tasks 40%)
  const stageIndex = TURNOVER_STAGES.indexOf(turnover.stage);
  const stageProgress = stageIndex / (TURNOVER_STAGES.length - 1); // 0 to 1

  const taskCount = turnover.task_count ?? 0;
  const tasksCompleted = turnover.tasks_completed ?? 0;
  const taskProgress = taskCount > 0 ? tasksCompleted / taskCount : stageProgress;

  const actualProgress = stageProgress * 0.6 + taskProgress * 0.4;

  // Determine target date (prefer target_ready_date, fall back to move_in_date)
  const targetDateStr = turnover.target_ready_date ?? turnover.move_in_date;

  if (!targetDateStr) {
    // No deadline — use urgency tier as a proxy
    const urgency = getTurnoverUrgency(turnover);
    if (urgency.tier === "fire") {
      return {
        ...CRITICAL_PATH_CONFIG.behind,
        status: "behind",
        expectedProgress: 1,
        actualProgress,
        gap: 1 - actualProgress,
      };
    }
    if (urgency.tier === "hot") {
      return {
        ...CRITICAL_PATH_CONFIG.at_risk,
        status: "at_risk",
        expectedProgress: 0.7,
        actualProgress,
        gap: 0.7 - actualProgress,
      };
    }
    // No date and not urgent — assume on track
    return {
      ...CRITICAL_PATH_CONFIG.on_track,
      status: "on_track",
      expectedProgress: actualProgress,
      actualProgress,
      gap: 0,
    };
  }

  // Calculate expected progress based on time elapsed
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startDate = new Date(turnover.created_at);
  startDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const totalDays = Math.max(
    (targetDate.getTime() - startDate.getTime()) / 86400000,
    1,
  );
  const elapsedDays = (now.getTime() - startDate.getTime()) / 86400000;
  const expectedProgress = Math.min(elapsedDays / totalDays, 1);

  const gap = expectedProgress - actualProgress;

  let status: CriticalPathStatus;
  if (gap <= 0) {
    status = "on_track";
  } else if (gap <= 0.15) {
    status = "at_risk";
  } else {
    status = "behind";
  }

  // Override to blocked if past deadline and not close to done
  if (expectedProgress >= 1 && actualProgress < 0.8) {
    status = "blocked";
  }

  const config = CRITICAL_PATH_CONFIG[status];

  return {
    ...config,
    status,
    expectedProgress,
    actualProgress,
    gap,
  };
}

/** Count turnovers by critical path status */
export function countByCriticalPath(
  turnovers: Turnover[],
): Record<CriticalPathStatus, number> {
  const counts: Record<CriticalPathStatus, number> = {
    on_track: 0,
    at_risk: 0,
    behind: 0,
    blocked: 0,
  };
  for (const t of turnovers) {
    if (t.stage === "ready") continue;
    counts[getCriticalPath(t).status]++;
  }
  return counts;
}
