"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  getProperty,
  getBuildings,
  getUnits,
  createBuilding,
  createUnit,
  createTurnover,
  getTurnovers,
  advanceTurnoverStage,
  createJobFromTurnover,
  getPropertyWorkload,
  getSubcontractorWorkload,
} from "@/app/actions/property-actions";
import { MakeReadyBoard } from "@/components/properties/MakeReadyBoard";
import { AddBuildingModal } from "@/components/properties/AddBuildingModal";
import { AddUnitModal } from "@/components/properties/AddUnitModal";
import { StartTurnoverModal } from "@/components/properties/StartTurnoverModal";
import type { Property, Building, Unit, Turnover, SubcontractorWorkload } from "@/types/properties";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  DoorOpen,
  History,
  Loader2,
  MapPin,
  Plus,
  RotateCw,
} from "lucide-react";
import { countByCriticalPath } from "@/lib/turnover-critical-path";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const UNIT_STATUS_COLORS: Record<string, string> = {
  idle: "bg-white/[0.02] text-white/15 border-white/[0.04]",
  turnover: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ready: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  offline: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<
    (Property & { client_name: string | null }) | null
  >(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [unitsByBuilding, setUnitsByBuilding] = useState<
    Record<string, Unit[]>
  >({});
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [view, setView] = useState<"buildings" | "board">("board");
  const [workload, setWorkload] = useState<{
    totalUnits: number;
    activeTurnovers: number;
    threshold: number;
    isOverloaded: boolean;
  } | null>(null);
  const [subWorkloads, setSubWorkloads] = useState<SubcontractorWorkload[]>([]);

  // Modal state
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState<string | null>(null); // building_id
  const [showStartTurnover, setShowStartTurnover] = useState<Unit | null>(null);

  const loadData = useCallback(async () => {
    const [prop, bldgs, turns, wl, sw] = await Promise.all([
      getProperty(propertyId),
      getBuildings(propertyId),
      getTurnovers({ propertyId }),
      getPropertyWorkload(propertyId),
      getSubcontractorWorkload(),
    ]);
    setProperty(prop);
    setBuildings(bldgs);
    setTurnovers(turns);
    setWorkload(wl);
    setSubWorkloads(sw);

    // Load units for all buildings
    const unitsMap: Record<string, Unit[]> = {};
    await Promise.all(
      bldgs.map(async (b) => {
        const units = await getUnits(b.id);
        unitsMap[b.id] = units;
      }),
    );
    setUnitsByBuilding(unitsMap);

    // Auto-expand first building
    if (bldgs.length > 0 && !expandedBuilding) {
      setExpandedBuilding(bldgs[0].id);
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdvanceTurnover = async (turnoverId: string) => {
    await advanceTurnoverStage(turnoverId);
    await loadData();
  };

  const handleCreateJob = async (turnoverId: string) => {
    const result = await createJobFromTurnover(turnoverId);
    if (result.success && result.data) {
      return { jobId: result.data.jobId, jobNumber: result.data.jobNumber };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-white/40">Property not found</p>
        <Link
          href="/ops/properties"
          className="text-primary text-sm mt-2 inline-block"
        >
          Back to Properties
        </Link>
      </div>
    );
  }

  const totalUnits = Object.values(unitsByBuilding).reduce(
    (s, u) => s + u.length,
    0,
  );
  const turningUnits = Object.values(unitsByBuilding)
    .flat()
    .filter((u) => u.status === "turnover").length;

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
            href="/ops/properties"
            className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            PROPERTIES
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {property.name}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{property.address}</span>
              </div>
              {property.client_name && (
                <p className="text-[10px] text-white/20 font-mono mt-1">
                  Client: {property.client_name}
                </p>
              )}
            </div>
          </div>

          {/* Workload warning banner */}
          {workload?.isOverloaded && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">
                {workload.activeTurnovers} units turning — high workload
              </span>
            </div>
          )}

          {/* Stats strip */}
          {(() => {
            const criticalCounts = countByCriticalPath(turnovers);
            const atRiskCount = criticalCounts.at_risk + criticalCounts.behind + criticalCounts.blocked;
            return (
              <div className="grid grid-cols-4 gap-2">
                <GlassCard intensity="panel" className="p-2 text-center">
                  <span className="text-lg font-black tabular-nums font-mono text-amber-400">
                    {turningUnits}
                  </span>
                  <p className="text-[7px] uppercase tracking-[0.15em] text-white/25 font-bold">
                    Turning
                  </p>
                </GlassCard>
                <GlassCard intensity="panel" className="p-2 text-center">
                  <span className="text-lg font-black tabular-nums font-mono text-emerald-400">
                    {turnovers.filter((t) => t.stage === "ready").length}
                  </span>
                  <p className="text-[7px] uppercase tracking-[0.15em] text-white/25 font-bold">
                    Ready
                  </p>
                </GlassCard>
                <GlassCard intensity="panel" className="p-2 text-center">
                  <span className={`text-lg font-black tabular-nums font-mono ${atRiskCount > 0 ? "text-red-400" : "text-white/30"}`}>
                    {atRiskCount}
                  </span>
                  <p className="text-[7px] uppercase tracking-[0.15em] text-white/25 font-bold">
                    At Risk
                  </p>
                </GlassCard>
                <GlassCard intensity="panel" className="p-2 text-center">
                  <span className="text-lg font-black tabular-nums font-mono text-white/80">
                    {totalUnits}
                  </span>
                  <p className="text-[7px] uppercase tracking-[0.15em] text-white/25 font-bold">
                    Units
                  </p>
                </GlassCard>
              </div>
            );
          })()}
        </header>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("board")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
              view === "board"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60"
            }`}
          >
            Make-Ready Board
          </button>
          <button
            onClick={() => setView("buildings")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
              view === "buildings"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60"
            }`}
          >
            Buildings & Units
          </button>
        </div>

        {/* Content */}
        {view === "board" ? (
          <MakeReadyBoard
            turnovers={turnovers}
            onAdvance={handleAdvanceTurnover}
            onRefresh={loadData}
            onCreateJob={handleCreateJob}
            subWorkloads={subWorkloads}
          />
        ) : (
          <div className="space-y-3">
            {/* Add building button */}
            <AnimatedButton
              variant="secondary"
              size="sm"
              onClick={() => setShowAddBuilding(true)}
              className="w-full gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Building
            </AnimatedButton>

            {buildings.length === 0 ? (
              <GlassCard className="p-6 text-center">
                <Building2 className="w-10 h-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm text-white/30">No buildings added yet</p>
              </GlassCard>
            ) : (
              buildings.map((building) => {
                const isExpanded = expandedBuilding === building.id;
                const units = unitsByBuilding[building.id] ?? [];

                return (
                  <GlassCard
                    key={building.id}
                    intensity="panel"
                    className="overflow-hidden"
                  >
                    {/* Building header — clickable accordion */}
                    <button
                      onClick={() =>
                        setExpandedBuilding(isExpanded ? null : building.id)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">
                            {building.name}
                            {building.code && (
                              <span className="text-white/30 font-mono ml-2 text-xs">
                                ({building.code})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/30 font-mono">
                            {building.unit_count ?? units.length} units
                            {(building.units_in_turnover ?? 0) > 0 && (
                              <span className="text-amber-400 ml-2">
                                {building.units_in_turnover} turning
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </motion.div>
                    </button>

                    {/* Expanded units list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04] pt-3">
                            <button
                              onClick={() => setShowAddUnit(building.id)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-dashed border-white/10 text-[10px] text-white/30 hover:text-primary hover:border-primary/30 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add Unit
                            </button>

                            {units.length === 0 ? (
                              <p className="text-xs text-white/20 text-center py-2">
                                No units yet
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {units.map((unit) => {
                                  const isIdle = unit.status === "idle";
                                  const isTurning = unit.status === "turnover";
                                  return (
                                    <button
                                      key={unit.id}
                                      onClick={() => {
                                        if (isTurning || unit.status === "ready") {
                                          // Navigate to unit detail page
                                          window.location.href = `/ops/properties/${propertyId}/units/${unit.id}`;
                                        } else if (isIdle) {
                                          setShowStartTurnover(unit);
                                        }
                                      }}
                                      className={`relative p-2.5 rounded border text-center transition-all hover:scale-105 ${
                                        UNIT_STATUS_COLORS[unit.status] ?? UNIT_STATUS_COLORS.idle
                                      }`}
                                    >
                                      <DoorOpen className={`w-4 h-4 mx-auto mb-1 ${isIdle ? "opacity-20" : "opacity-60"}`} />
                                      <p className={`text-xs font-bold ${isIdle ? "opacity-30" : ""}`}>
                                        {unit.unit_number}
                                      </p>
                                      {!isIdle && (
                                        <p className="text-[8px] uppercase tracking-wider opacity-60">
                                          {unit.status}
                                        </p>
                                      )}
                                      {isTurning && (
                                        <div className="absolute top-1 right-1">
                                          <RotateCw
                                            className="w-3 h-3 text-amber-400 animate-spin"
                                            style={{ animationDuration: "3s" }}
                                          />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                );
              })
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showAddBuilding && (
        <AddBuildingModal
          propertyId={propertyId}
          onClose={() => setShowAddBuilding(false)}
          onCreated={() => {
            setShowAddBuilding(false);
            loadData();
          }}
        />
      )}

      {showAddUnit && (
        <AddUnitModal
          buildingId={showAddUnit}
          onClose={() => setShowAddUnit(null)}
          onCreated={() => {
            setShowAddUnit(null);
            loadData();
          }}
        />
      )}

      {showStartTurnover && (
        <StartTurnoverModal
          unit={showStartTurnover}
          onClose={() => setShowStartTurnover(null)}
          onCreated={() => {
            setShowStartTurnover(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
