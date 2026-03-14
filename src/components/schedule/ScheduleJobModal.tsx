"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, Loader2, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { scheduleJob } from "@/app/actions/schedule-actions";
import { getSubcontractors } from "@/app/actions/sub-actions";
import type { Subcontractor } from "@/app/actions/sub-actions";

type Props = {
  jobId: string;
  estimatedDuration?: number; // days
  onClose: () => void;
  onScheduled: () => void;
};

export function ScheduleJobModal({
  jobId,
  estimatedDuration,
  onClose,
  onScheduled,
}: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSubcontractors().then(setSubs);
  }, []);

  // Auto-calculate end date from start + duration
  useEffect(() => {
    if (startDate && estimatedDuration && !endDate) {
      const start = new Date(startDate);
      start.setDate(start.getDate() + estimatedDuration);
      setEndDate(start.toISOString().split("T")[0]);
    }
  }, [startDate, estimatedDuration, endDate]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }
    setLoading(true);
    setError("");

    const result = await scheduleJob(jobId, startDate, endDate, selectedSubs);

    if (!result.success) {
      setError(result.error || "Failed to schedule");
      setLoading(false);
      return;
    }

    setLoading(false);
    onScheduled();
  };

  const toggleSub = (subId: string) => {
    setSelectedSubs((prev) =>
      prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Schedule Job
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase opacity-50 block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase opacity-50 block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {estimatedDuration && (
          <p className="text-xs opacity-40">
            Estimated duration: {estimatedDuration} day
            {estimatedDuration !== 1 ? "s" : ""}
          </p>
        )}

        {/* Sub Selection */}
        <div>
          <label className="text-xs font-bold uppercase opacity-50 block mb-2">
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Assign Subcontractors
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {subs
              .filter((s) => s.status === "active")
              .map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => toggleSub(sub.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedSubs.includes(sub.id)
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span className="font-medium">{sub.name}</span>
                  {sub.trade && (
                    <span className="text-xs opacity-50 ml-2">{sub.trade}</span>
                  )}
                </button>
              ))}
            {subs.filter((s) => s.status === "active").length === 0 && (
              <p className="text-xs opacity-40 py-2">
                No active subcontractors found
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !startDate || !endDate}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Schedule & Sync"
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
