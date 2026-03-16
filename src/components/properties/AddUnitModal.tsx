"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { createUnit } from "@/app/actions/property-actions";
import { X, DoorOpen, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function AddUnitModal({
  buildingId,
  onClose,
  onCreated,
}: {
  buildingId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [status, setStatus] = useState<string>("occupied");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchFrom, setBatchFrom] = useState("");
  const [batchTo, setBatchTo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (batchMode) {
      const from = parseInt(batchFrom);
      const to = parseInt(batchTo);
      if (isNaN(from) || isNaN(to) || from > to) {
        setError("Invalid range");
        setSaving(false);
        return;
      }
      for (let i = from; i <= to; i++) {
        await createUnit({
          building_id: buildingId,
          unit_number: String(i),
          floor: floor ? parseInt(floor) : null,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseFloat(bathrooms) : null,
          status: status as any,
        });
      }
      onCreated();
    } else {
      const result = await createUnit({
        building_id: buildingId,
        unit_number: unitNumber,
        floor: floor ? parseInt(floor) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        status: status as any,
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
              <DoorOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Add Unit</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Batch toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setBatchMode(false)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                !batchMode
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-white/[0.03] text-white/40 border-white/[0.06]"
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setBatchMode(true)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                batchMode
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-white/[0.03] text-white/40 border-white/[0.06]"
              }`}
            >
              Batch Range
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {batchMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                    From Unit #
                  </label>
                  <input
                    type="number"
                    value={batchFrom}
                    onChange={(e) => setBatchFrom(e.target.value)}
                    placeholder="101"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                    To Unit #
                  </label>
                  <input
                    type="number"
                    value={batchTo}
                    onChange={(e) => setBatchTo(e.target.value)}
                    placeholder="120"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Unit Number
                </label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. 204, 3B"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Floor
                </label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="2"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Beds
                </label>
                <input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="2"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Baths
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="1"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
              >
                <option value="occupied">Occupied</option>
                <option value="vacant">Vacant</option>
                <option value="ready">Ready</option>
                <option value="offline">Offline</option>
              </select>
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
                disabled={
                  saving ||
                  (!batchMode && !unitNumber) ||
                  (batchMode && (!batchFrom || !batchTo))
                }
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : batchMode ? (
                  "Add Range"
                ) : (
                  "Add Unit"
                )}
              </AnimatedButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
