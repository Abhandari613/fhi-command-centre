"use client";

import { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link2,
  Unlink,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  getScheduledJobs,
  getGCalStatus,
  disconnectGCal,
} from "@/app/actions/schedule-actions";

type ScheduledJob = {
  id: string;
  job_number: string | null;
  property_address: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  gcal_event_id: string | null;
};

export function CalendarView() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gcalConnected, setGcalConnected] = useState(false);

  useEffect(() => {
    Promise.all([getScheduledJobs(), getGCalStatus()]).then(
      ([jobData, gcalStatus]) => {
        setJobs(jobData as ScheduledJob[]);
        setGcalConnected(gcalStatus.connected);
        setLoading(false);
      }
    );
  }, []);

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const calendarDays = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(y, m, i));
    return days;
  }, [currentDate]);

  const getJobsForDate = (date: Date) => {
    return jobs.filter((j) => {
      if (!j.start_date) return false;
      const start = new Date(j.start_date);
      start.setHours(0, 0, 0, 0);
      const check = new Date(date);
      check.setHours(0, 0, 0, 0);

      if (j.end_date) {
        const end = new Date(j.end_date);
        end.setHours(23, 59, 59, 999);
        return check >= start && check <= end;
      }
      return check.getTime() === start.getTime();
    });
  };

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-500/80",
    in_progress: "bg-yellow-500/80",
    active: "bg-emerald-500/60",
    completed: "bg-cyan-500/60",
  };

  const handleDisconnect = async () => {
    await disconnectGCal();
    setGcalConnected(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin w-8 h-8 opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with GCal status */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold">
          {monthName} {year}
        </h2>
        <div className="flex items-center gap-2">
          {gcalConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full hover:bg-green-500/20 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              GCal Connected
            </button>
          ) : (
            <Link
              href="/api/auth/gcal"
              className="flex items-center gap-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full hover:bg-orange-500/20 transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Connect Google Calendar
            </Link>
          )}
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className="text-xs font-bold opacity-50 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date)
              return <div key={`empty-${index}`} className="aspect-square" />;

            const dayJobs = getJobsForDate(date);
            const isToday =
              new Date().toDateString() === date.toDateString();

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "aspect-square rounded-lg border border-white/5 flex flex-col items-center justify-start pt-1 relative overflow-hidden transition-colors hover:bg-white/5",
                  isToday && "bg-primary/20 border-primary/50"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium z-10",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex flex-col gap-0.5 mt-1 w-full px-0.5">
                  {dayJobs.slice(0, 3).map((j) => (
                    <Link
                      key={j.id}
                      href={`/ops/jobs/${j.id}`}
                      className={cn(
                        "h-1.5 rounded-full w-full",
                        statusColor[j.status] || "bg-gray-500/50"
                      )}
                      title={`${j.job_number || ""} ${j.property_address || ""}`}
                    />
                  ))}
                  {dayJobs.length > 3 && (
                    <span className="text-[8px] opacity-40 text-center">
                      +{dayJobs.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Upcoming Jobs */}
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-bold opacity-70 px-2 uppercase tracking-wider">
          Upcoming in {monthName}
        </h3>
        {jobs
          .filter((j) => {
            if (!j.start_date) return false;
            const d = new Date(j.start_date);
            return (
              d.getMonth() === currentDate.getMonth() &&
              d.getFullYear() === currentDate.getFullYear()
            );
          })
          .slice(0, 8)
          .map((j) => (
            <Link key={j.id} href={`/ops/jobs/${j.id}`}>
              <GlassCard className="p-3 mb-2 flex justify-between items-center hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      statusColor[j.status] || "bg-gray-500/50"
                    )}
                  />
                  <span className="font-medium text-sm truncate">
                    {j.job_number} — {j.property_address}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {j.gcal_event_id && (
                    <CalendarIcon className="w-3.5 h-3.5 text-green-400 opacity-60" />
                  )}
                  <span className="text-xs opacity-50">
                    {new Date(j.start_date!).getDate()}{" "}
                    {monthName.slice(0, 3)}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        {jobs.filter((j) => {
          if (!j.start_date) return false;
          const d = new Date(j.start_date);
          return (
            d.getMonth() === currentDate.getMonth() &&
            d.getFullYear() === currentDate.getFullYear()
          );
        }).length === 0 && (
          <p className="text-sm opacity-40 px-2">
            No scheduled jobs this month
          </p>
        )}
      </div>
    </div>
  );
}
