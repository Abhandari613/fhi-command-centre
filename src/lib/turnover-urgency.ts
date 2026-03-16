import type { Turnover } from "@/types/properties";

export type UrgencyTier = "fire" | "hot" | "warm" | "cool" | "no_date";

export type UrgencyInfo = {
  tier: UrgencyTier;
  daysUntilMoveIn: number | null;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse: boolean;
};

const URGENCY_CONFIG: Record<
  UrgencyTier,
  Omit<UrgencyInfo, "daysUntilMoveIn" | "label">
> = {
  fire: {
    tier: "fire",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/30",
    pulse: true,
  },
  hot: {
    tier: "hot",
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
    pulse: false,
  },
  warm: {
    tier: "warm",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    pulse: false,
  },
  cool: {
    tier: "cool",
    color: "text-white/30",
    bgColor: "bg-white/[0.03]",
    borderColor: "border-white/[0.06]",
    pulse: false,
  },
  no_date: {
    tier: "no_date",
    color: "text-white/20",
    bgColor: "bg-white/[0.02]",
    borderColor: "border-white/[0.04]",
    pulse: false,
  },
};

export function getTurnoverUrgency(turnover: Turnover): UrgencyInfo {
  if (turnover.stage === "ready") {
    return { ...URGENCY_CONFIG.cool, daysUntilMoveIn: null, label: "Done" };
  }

  if (!turnover.move_in_date) {
    return {
      ...URGENCY_CONFIG.no_date,
      daysUntilMoveIn: null,
      label: "No date",
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const moveIn = new Date(turnover.move_in_date);
  moveIn.setHours(0, 0, 0, 0);
  const days = Math.ceil((moveIn.getTime() - now.getTime()) / 86400000);

  if (days <= 3) {
    const label =
      days < 0 ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`;
    return { ...URGENCY_CONFIG.fire, daysUntilMoveIn: days, label };
  }
  if (days <= 7) {
    return { ...URGENCY_CONFIG.hot, daysUntilMoveIn: days, label: `${days}d` };
  }
  if (days <= 14) {
    return { ...URGENCY_CONFIG.warm, daysUntilMoveIn: days, label: `${days}d` };
  }
  return { ...URGENCY_CONFIG.cool, daysUntilMoveIn: days, label: `${days}d` };
}

/** Sort turnovers: FIRE first, then HOT, WARM, COOL, NO_DATE last */
export function sortByUrgency(turnovers: Turnover[]): Turnover[] {
  const tierOrder: Record<UrgencyTier, number> = {
    fire: 0,
    hot: 1,
    warm: 2,
    cool: 3,
    no_date: 4,
  };

  return [...turnovers].sort((a, b) => {
    const ua = getTurnoverUrgency(a);
    const ub = getTurnoverUrgency(b);
    // Sort by tier first
    const tierDiff = tierOrder[ua.tier] - tierOrder[ub.tier];
    if (tierDiff !== 0) return tierDiff;
    // Within same tier, soonest move-in first (nulls last)
    if (ua.daysUntilMoveIn == null && ub.daysUntilMoveIn == null) return 0;
    if (ua.daysUntilMoveIn == null) return 1;
    if (ub.daysUntilMoveIn == null) return -1;
    return ua.daysUntilMoveIn - ub.daysUntilMoveIn;
  });
}

/** Count turnovers by urgency tier */
export function countByUrgency(
  turnovers: Turnover[],
): Record<UrgencyTier, number> {
  const counts: Record<UrgencyTier, number> = {
    fire: 0,
    hot: 0,
    warm: 0,
    cool: 0,
    no_date: 0,
  };
  for (const t of turnovers) {
    if (t.stage === "ready") continue;
    counts[getTurnoverUrgency(t).tier]++;
  }
  return counts;
}
