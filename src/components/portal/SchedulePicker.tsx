"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  getAvailableSlots,
  clientSelectDate,
  type AvailableSlot,
} from "@/app/actions/portal-schedule-actions";

interface SchedulePickerProps {
  jobId: string;
  preferredDate?: string | null;
}

export function SchedulePicker({ jobId, preferredDate }: SchedulePickerProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(!!preferredDate);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadSlots();
  }, [weekOffset]);

  const loadSlots = async () => {
    setLoading(true);
    const data = await getAvailableSlots(jobId, weekOffset);
    setSlots(data);
    setLoading(false);
  };

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    startTransition(async () => {
      const result = await clientSelectDate(jobId, selectedDate);
      if (result.success) {
        setSubmitted(true);
        setShowConfirm(false);
      }
    });
  };

  // Already submitted state
  if (submitted) {
    const displayDate = preferredDate || selectedDate;
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center space-y-3">
        <Clock className="w-8 h-8 text-blue-400 mx-auto" />
        <h3 className="text-lg font-bold text-blue-200">
          Waiting for Frank to Confirm
        </h3>
        {displayDate && (
          <p className="text-sm text-blue-300/60">
            Your preferred date:{" "}
            <span className="font-bold text-blue-300">
              {new Date(displayDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        )}
        <p className="text-xs text-white/30">
          Frank will review your request and confirm the schedule. You&apos;ll be
          notified once it&apos;s set.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-blue-300">
          <Calendar className="w-5 h-5" />
          <h3 className="text-lg font-bold">Pick Your Preferred Date</h3>
        </div>
        <p className="text-sm text-white/50">
          Select a date that works best for you. Frank will confirm.
        </p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/40 font-mono uppercase">
          {weekOffset === 0 ? "Next 2 weeks" : `Weeks ${weekOffset * 1 + 1}–${weekOffset * 1 + 2}`}
        </span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 3}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Date Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin opacity-40" />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-white/30">
            No available slots for this period. Try another week.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-2"
        >
          {slots.map((slot) => (
            <motion.button
              key={slot.date}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(slot.date)}
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedDate === slot.date
                  ? "bg-blue-500/20 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10"
              }`}
            >
              <span className="text-xs font-bold text-white/40 uppercase block">
                {slot.dayName}
              </span>
              <span className="text-lg font-black text-white block mt-0.5">
                {slot.displayDate}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <Calendar className="w-10 h-10 text-blue-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Confirm Date</h3>
              <p className="text-lg font-black text-blue-300">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-white/40">
                Frank will review and confirm this date.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#ff6b00] to-[#e05e00] text-white font-bold shadow-[0_4px_12px_-2px_rgba(255,107,0,0.4)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Request Date"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
