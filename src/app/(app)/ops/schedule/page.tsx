"use client";

import { CalendarView } from "@/components/schedule/CalendarView";

export default function SchedulePage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Schedule
          </h1>
          <p className="text-sm opacity-70">Project timeline</p>
        </header>

        <CalendarView />
      </div>
    </div>
  );
}
