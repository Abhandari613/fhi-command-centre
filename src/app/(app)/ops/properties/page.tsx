"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { getProperties } from "@/app/actions/property-actions";
import { AddPropertyModal } from "@/components/properties/AddPropertyModal";
import type { PropertyTurnoverSummary } from "@/types/properties";
import {
  Building2,
  Clock,
  Plus,
  MapPin,
  ChevronRight,
  Loader2,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyTurnoverSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadProperties = async () => {
    const data = await getProperties();
    setProperties(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
  };

  // Aggregate stats
  const totalTurnovers = properties.reduce((s, p) => s + p.active_turnovers, 0);
  const totalReady = properties.reduce((s, p) => s + p.completed_turnovers, 0);
  const totalUnits = properties.reduce((s, p) => s + p.total_units, 0);

  return (
    <div className="relative min-h-screen pb-24">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 py-2"
      >
        {/* Header */}
        <motion.header
          variants={item}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Properties
            </h1>
            <p className="text-[10px] font-mono text-white/30 tracking-wider">
              {properties.length} site{properties.length !== 1 ? "s" : ""}{" "}
              &middot; {totalUnits} units
            </p>
          </div>
          <AnimatedButton
            variant="primary"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Site
          </AnimatedButton>
        </motion.header>

        {/* KPI Strip */}
        <motion.section variants={item} className="grid grid-cols-3 gap-2">
          <GlassCard
            intensity="panel"
            className="p-3 flex flex-col items-center gap-1"
          >
            <span className="text-xl font-black tabular-nums font-mono text-primary">
              {properties.length}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
              Properties
            </span>
          </GlassCard>
          <GlassCard
            intensity="panel"
            className="p-3 flex flex-col items-center gap-1"
          >
            <span className="text-xl font-black tabular-nums font-mono text-amber-400">
              {totalTurnovers}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
              Turnovers
            </span>
          </GlassCard>
          <GlassCard
            intensity="panel"
            className="p-3 flex flex-col items-center gap-1"
          >
            <span className="text-xl font-black tabular-nums font-mono text-emerald-400">
              {totalReady}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-white/30 font-bold">
              Ready
            </span>
          </GlassCard>
        </motion.section>

        {/* Countdown CTA */}
        {totalTurnovers > 0 && (
          <motion.section variants={item}>
            <Link href="/ops/properties/countdown">
              <GlassCard
                intensity="panel"
                className="p-3 flex items-center gap-3 hover:border-primary/20 transition-colors active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <Clock className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">
                    Move-In Countdown
                  </p>
                  <p className="text-[10px] text-white/30 font-mono">
                    {totalTurnovers} active &middot; sorted by urgency
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
              </GlassCard>
            </Link>
          </motion.section>
        )}

        {/* Property Cards */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <Loader2 className="w-8 h-8 animate-spin opacity-40" />
          </div>
        ) : properties.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="text-lg font-semibold opacity-40">
              No properties yet
            </p>
            <p className="text-xs text-white/30 mt-1">
              Add a building complex to start tracking units
            </p>
          </GlassCard>
        ) : (
          <motion.div variants={item} className="space-y-3">
            <AnimatePresence>
              {properties.map((property) => {
                const turnoverPct =
                  property.total_units > 0
                    ? Math.round(
                        (property.units_in_turnover / property.total_units) *
                          100,
                      )
                    : 0;

                return (
                  <motion.div
                    key={property.property_id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Link href={`/ops/properties/${property.property_id}`}>
                      <GlassCard className="p-4 active:scale-[0.98] transition-transform">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm font-bold text-white truncate">
                                {property.property_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/30 mb-2">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {property.property_address}
                              </span>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-3 text-[10px] font-mono">
                              <span className="text-white/50">
                                <span className="font-bold text-white/70">
                                  {property.building_count}
                                </span>{" "}
                                bldg{property.building_count !== 1 ? "s" : ""}
                              </span>
                              <span className="text-white/50">
                                <span className="font-bold text-white/70">
                                  {property.total_units}
                                </span>{" "}
                                units
                              </span>
                              {property.active_turnovers > 0 && (
                                <span className="flex items-center gap-1 text-amber-400">
                                  <RotateCw className="w-3 h-3" />
                                  {property.active_turnovers} turning
                                </span>
                              )}
                              {property.completed_turnovers > 0 && (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {property.completed_turnovers} ready
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            {property.total_units > 0 && (
                              <div className="mt-2 h-1.5 rounded-full bg-white/[0.03] overflow-hidden flex">
                                {property.units_ready > 0 && (
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(property.units_ready / property.total_units) * 100}%`,
                                    }}
                                  />
                                )}
                                {property.units_in_turnover > 0 && (
                                  <div
                                    className="h-full bg-amber-500/60"
                                    style={{
                                      width: `${(property.units_in_turnover / property.total_units) * 100}%`,
                                    }}
                                  />
                                )}
                                {property.units_idle > 0 && (
                                  <div
                                    className="h-full bg-white/[0.06]"
                                    style={{
                                      width: `${(property.units_idle / property.total_units) * 100}%`,
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/20 shrink-0 mt-1" />
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {showAdd && (
        <AddPropertyModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            loadProperties();
          }}
        />
      )}
    </div>
  );
}
