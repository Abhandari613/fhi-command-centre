"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { createTurnover } from "@/app/actions/property-actions";
import type { Unit } from "@/types/properties";
import { X, RotateCw, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export function StartTurnoverModal({
  unit,
  onClose,
  onCreated,
}: {
  unit: Unit;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [moveOutDate, setMoveOutDate] = useState("");
  const [targetReadyDate, setTargetReadyDate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [targetAutoCalc, setTargetAutoCalc] = useState(true);
  const [notes, setNotes] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-calculate target ready = move-in minus 2 days
  const handleMoveInChange = (val: string) => {
    setMoveInDate(val);
    if (val && targetAutoCalc) {
      const d = new Date(val);
      d.setDate(d.getDate() - 2);
      setTargetReadyDate(d.toISOString().split("T")[0]);
    }
  };

  const handleTargetReadyChange = (val: string) => {
    setTargetReadyDate(val);
    setTargetAutoCalc(false); // user overrode auto-calc
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const result = await createTurnover({
      unit_id: unit.id,
      move_out_date: moveOutDate || null,
      target_ready_date: targetReadyDate || null,
      move_in_date: moveInDate || null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      notes: notes || null,
      stage:
        moveOutDate && new Date(moveOutDate) <= new Date()
          ? "vacated"
          : "notice",
    });

    if (result.success) {
      onCreated();
    } else {
      setError(
        typeof result.error === "string"
          ? result.error
          : (result.error?.message ?? "Failed"),
      );
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <GlassCard intensity="solid" className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                Start Turnover — Unit {unit.unit_number}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Move-In Date — PRIMARY field, drives urgency */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/[0.04]">
              <label className="block text-[10px] uppercase tracking-wider text-primary font-bold mb-1.5">
                New Tenant Move-In Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => handleMoveInChange(e.target.value)}
                  className="w-full bg-white/[0.05] border border-primary/20 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              {!moveInDate && (
                <p className="text-[9px] text-primary/50 mt-1 font-mono">
                  Recommended — drives priority & scheduling
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Move-Out Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Target Ready
                  {targetAutoCalc && moveInDate && (
                    <span className="text-primary/40 ml-1 normal-case">
                      (auto)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="date"
                    value={targetReadyDate}
                    onChange={(e) => handleTargetReadyChange(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                Est. Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="$0"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scope of work, special conditions..."
                rows={2}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <AnimatedButton
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                variant="primary"
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Start Turnover"
                )}
              </AnimatedButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
