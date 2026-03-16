"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getAllActiveTurnovers,
  assignTurnoverSub,
} from "@/app/actions/property-actions";
import { getSubcontractors } from "@/app/actions/sub-actions";
import type { Turnover } from "@/types/properties";
import { TURNOVER_STAGE_CONFIG } from "@/types/properties";
import {
  getTurnoverUrgency,
  sortByUrgency,
  countByUrgency,
  type UrgencyTier,
} from "@/lib/turnover-urgency";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  MapPin,
  User,
  UserPlus,
  AlertTriangle,
  Printer,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TIER_LABELS: Record<UrgencyTier, string> = {
  fire: "FIRE — 3 days or less",
  hot: "HOT — 4–7 days",
  warm: "WARM — 8–14 days",
  cool: "15+ days",
  no_date: "No move-in date set",
};

const TIER_HEADER_COLORS: Record<UrgencyTier, string> = {
  fire: "text-red-400",
  hot: "text-orange-400",
  warm: "text-yellow-400",
  cool: "text-white/40",
  no_date: "text-white/20",
};

type Sub = { id: string; name: string };

export default function CountdownPage() {
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [data, subData] = await Promise.all([
      getAllActiveTurnovers(),
      getSubcontractors(),
    ]);
    setTurnovers(data.filter((t) => t.stage !== "ready"));
    setSubs((subData ?? []).map((s: any) => ({ id: s.id, name: s.name })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (turnoverId: string, subId: string | null) => {
    await assignTurnoverSub(turnoverId, subId);
    await loadData();
  };

  const sorted = sortByUrgency(turnovers);
  const counts = countByUrgency(turnovers);

  // Group sorted turnovers by urgency tier
  const grouped: Record<UrgencyTier, Turnover[]> = {
    fire: [],
    hot: [],
    warm: [],
    cool: [],
    no_date: [],
  };
  for (const t of sorted) {
    grouped[getTurnoverUrgency(t).tier].push(t);
  }

  // Today's Plan: group FIRE + HOT by assigned sub
  const urgentTurnovers = [...grouped.fire, ...grouped.hot];
  const byAssignee: Record<string, Turnover[]> = {};
  const unassigned: Turnover[] = [];
  for (const t of urgentTurnovers) {
    if (t.assigned_name) {
      if (!byAssignee[t.assigned_name]) byAssignee[t.assigned_name] = [];
      byAssignee[t.assigned_name].push(t);
    } else {
      unassigned.push(t);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 py-2"
      >
        {/* Header */}
        <motion.header variants={item} className="space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/ops/properties"
              className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              PROPERTIES
            </Link>
            {urgentTurnovers.length > 0 && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-[10px] text-white/30 hover:text-primary font-mono transition-colors print:hidden"
              >
                <Printer className="w-3 h-3" />
                PRINT DISPATCH
              </button>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Move-In Countdown
          </h1>
          <p className="text-[10px] font-mono text-white/30 tracking-wider">
            {turnovers.length} active turnover
            {turnovers.length !== 1 ? "s" : ""} across all properties
          </p>
        </motion.header>

        {/* Urgency KPI strip */}
        <motion.section variants={item} className="grid grid-cols-4 gap-2">
          <GlassCard intensity="panel" className="p-2 text-center">
            <span
              className={`text-lg font-black tabular-nums font-mono ${counts.fire > 0 ? "text-red-400 animate-pulse" : "text-white/20"}`}
            >
              {counts.fire}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-red-400/60 font-bold">
              Fire
            </p>
          </GlassCard>
          <GlassCard intensity="panel" className="p-2 text-center">
            <span
              className={`text-lg font-black tabular-nums font-mono ${counts.hot > 0 ? "text-orange-400" : "text-white/20"}`}
            >
              {counts.hot}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-orange-400/60 font-bold">
              Hot
            </p>
          </GlassCard>
          <GlassCard intensity="panel" className="p-2 text-center">
            <span
              className={`text-lg font-black tabular-nums font-mono ${counts.warm > 0 ? "text-yellow-400" : "text-white/20"}`}
            >
              {counts.warm}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-yellow-400/60 font-bold">
              Warm
            </p>
          </GlassCard>
          <GlassCard intensity="panel" className="p-2 text-center">
            <span
              className={`text-lg font-black tabular-nums font-mono ${counts.no_date > 0 ? "text-white/50" : "text-white/20"}`}
            >
              {counts.no_date}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-white/25 font-bold">
              No Date
            </p>
          </GlassCard>
        </motion.section>

        {/* TODAY'S PLAN — dispatch view */}
        {urgentTurnovers.length > 0 && (
          <motion.section variants={item}>
            <GlassCard
              intensity="bright"
              className="p-4 ember-border-l space-y-3 print-dispatch"
            >
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span className="uppercase tracking-wider">
                  Today&apos;s Plan
                </span>
                <span className="text-white/20 font-mono text-[10px]">
                  {urgentTurnovers.length} units within 7 days
                </span>
              </h2>

              {/* Print header — only visible in print */}
              <div className="hidden print:block print:mb-4">
                <p className="text-sm font-bold">
                  Frank&apos;s Home Improvement — Daily Dispatch
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Unassigned — action needed */}
              {unassigned.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                      Unassigned ({unassigned.length})
                    </span>
                  </div>
                  {unassigned.map((t) => (
                    <DispatchRow
                      key={t.id}
                      turnover={t}
                      subs={subs}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              )}

              {/* By assignee */}
              {Object.entries(byAssignee).map(([name, items]) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                      {name} ({items.length})
                    </span>
                  </div>
                  {items.map((t) => (
                    <DispatchRow
                      key={t.id}
                      turnover={t}
                      subs={subs}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              ))}
            </GlassCard>
          </motion.section>
        )}

        {/* FULL COUNTDOWN LIST — grouped by urgency tier */}
        {(["fire", "hot", "warm", "cool", "no_date"] as UrgencyTier[]).map(
          (tier) => {
            const items = grouped[tier];
            if (items.length === 0) return null;

            return (
              <motion.section
                key={tier}
                variants={item}
                className="space-y-2 print:hidden"
              >
                <div className="flex items-center gap-2">
                  {tier === "fire" && (
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <h3
                    className={`text-[10px] font-bold uppercase tracking-wider ${TIER_HEADER_COLORS[tier]}`}
                  >
                    {TIER_LABELS[tier]}
                  </h3>
                  <span className="text-[10px] text-white/20 font-mono">
                    ({items.length})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {items.map((t) => (
                    <CountdownRow
                      key={t.id}
                      turnover={t}
                      subs={subs}
                      onAssign={handleAssign}
                    />
                  ))}
                </div>
              </motion.section>
            );
          },
        )}

        {turnovers.length === 0 && (
          <GlassCard className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="text-sm font-semibold text-white/40">
              No active turnovers
            </p>
            <p className="text-xs text-white/20 mt-1">
              Start a turnover from any property to see it here
            </p>
          </GlassCard>
        )}
      </motion.div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print-dispatch {
            background: white !important;
            border: 1px solid #ddd !important;
            color: black !important;
            box-shadow: none !important;
          }
          .print-dispatch * {
            color: black !important;
          }
          .print-dispatch .urgency-pill {
            border: 1px solid #999 !important;
          }
          nav,
          header a,
          [class*="BottomNav"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function SubPicker({
  turnoverId,
  currentSubId,
  subs,
  onAssign,
}: {
  turnoverId: string;
  currentSubId?: string | null;
  subs: Sub[];
  onAssign: (turnoverId: string, subId: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = async (subId: string | null) => {
    setSaving(true);
    await onAssign(turnoverId, subId);
    setSaving(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title="Assign subcontractor"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : (
          <UserPlus className="w-3.5 h-3.5 text-white/30 hover:text-primary" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
              {currentSubId && (
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-mono">
                    Unassign
                  </span>
                </button>
              )}
              {subs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-white/10 transition-colors"
                >
                  {currentSubId === s.id ? (
                    <Check className="w-3 h-3 text-primary" />
                  ) : (
                    <User className="w-3 h-3 text-white/20" />
                  )}
                  <span className="text-[10px] text-white/70 font-mono truncate">
                    {s.name}
                  </span>
                </button>
              ))}
              {subs.length === 0 && (
                <p className="px-2 py-1.5 text-[10px] text-white/30 font-mono">
                  No subs found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DispatchRow({
  turnover,
  subs,
  onAssign,
}: {
  turnover: Turnover;
  subs: Sub[];
  onAssign: (turnoverId: string, subId: string | null) => Promise<void>;
}) {
  const urgency = getTurnoverUrgency(turnover);
  const stageConfig = TURNOVER_STAGE_CONFIG[turnover.stage];

  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.03] transition-colors group">
      {/* Urgency pill */}
      <span
        className={`urgency-pill shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${urgency.bgColor} ${urgency.color} ${urgency.borderColor} ${urgency.pulse ? "animate-pulse" : ""}`}
      >
        {urgency.tier === "fire" && <Flame className="w-2.5 h-2.5" />}
        {urgency.label}
      </span>

      {/* Unit info — clickable link */}
      <Link
        href={`/ops/properties/${findPropertyId(turnover)}`}
        className="flex-1 min-w-0"
      >
        <p className="text-xs font-bold text-white/80 truncate group-hover:text-primary transition-colors">
          Unit {turnover.unit_number} &middot; {turnover.building_name}
        </p>
        <p className="text-[10px] text-white/30 font-mono truncate">
          {turnover.property_name}
        </p>
      </Link>

      {/* Stage badge */}
      <span
        className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${stageConfig.bgColor} ${stageConfig.color}`}
      >
        {stageConfig.label}
      </span>

      {/* Sub picker */}
      <SubPicker
        turnoverId={turnover.id}
        currentSubId={turnover.assigned_to}
        subs={subs}
        onAssign={onAssign}
      />
    </div>
  );
}

function CountdownRow({
  turnover,
  subs,
  onAssign,
}: {
  turnover: Turnover;
  subs: Sub[];
  onAssign: (turnoverId: string, subId: string | null) => Promise<void>;
}) {
  const urgency = getTurnoverUrgency(turnover);
  const stageConfig = TURNOVER_STAGE_CONFIG[turnover.stage];

  return (
    <GlassCard className="p-3 active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-3">
        {/* Urgency pill */}
        <span
          className={`urgency-pill shrink-0 w-12 text-center inline-flex items-center justify-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-1 rounded border ${urgency.bgColor} ${urgency.color} ${urgency.borderColor} ${urgency.pulse ? "animate-pulse" : ""}`}
        >
          {urgency.tier === "fire" && <Flame className="w-2.5 h-2.5" />}
          {urgency.label}
        </span>

        {/* Info */}
        <Link
          href={`/ops/properties/${findPropertyId(turnover)}`}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/80 truncate">
              Unit {turnover.unit_number}
            </span>
            <span className="text-[10px] text-white/30 truncate">
              {turnover.building_name} &middot; {turnover.property_name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono mt-0.5">
            <span
              className={`px-1 py-0.5 rounded ${stageConfig.bgColor} ${stageConfig.color} text-[9px] font-bold uppercase`}
            >
              {stageConfig.label}
            </span>
            {turnover.move_in_date && (
              <span>
                Move-in{" "}
                {new Date(turnover.move_in_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {turnover.assigned_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {turnover.assigned_name}
              </span>
            )}
            {turnover.days_vacant != null && turnover.days_vacant > 0 && (
              <span>{turnover.days_vacant}d vacant</span>
            )}
          </div>
        </Link>

        {/* Sub picker */}
        <SubPicker
          turnoverId={turnover.id}
          currentSubId={turnover.assigned_to}
          subs={subs}
          onAssign={onAssign}
        />

        <Link href={`/ops/properties/${findPropertyId(turnover)}`}>
          <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
        </Link>
      </div>
    </GlassCard>
  );
}

function findPropertyId(turnover: Turnover): string {
  return turnover.property_id ?? "";
}
