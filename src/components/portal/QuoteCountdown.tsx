"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, XCircle } from "lucide-react";

interface QuoteCountdownProps {
  expiryDate: string;
}

export function QuoteCountdown({ expiryDate }: QuoteCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(expiryDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(expiryDate));
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (timeLeft.expired) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
        <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 font-bold text-sm">Quote Expired</p>
        <p className="text-red-300/60 text-xs mt-1">
          Please contact Frank for a new quote.
        </p>
        <a
          href="mailto:frank@frankshomeimprovement.com"
          className="inline-block mt-3 text-xs font-bold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-4 py-2 rounded-lg transition-colors"
        >
          Contact Frank
        </a>
      </div>
    );
  }

  const isUrgent = timeLeft.totalHours < 24;
  const isWarning = timeLeft.totalHours < 48;

  const colorClass = isUrgent
    ? "text-red-400"
    : isWarning
      ? "text-orange-400"
      : "text-amber-400";

  const bgClass = isUrgent
    ? "bg-red-500/10 border-red-500/30"
    : isWarning
      ? "bg-orange-500/10 border-orange-500/30"
      : "bg-amber-500/10 border-amber-500/30";

  return (
    <div className={`${bgClass} border rounded-xl p-4 text-center`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {isUrgent ? (
          <AlertTriangle className={`w-5 h-5 ${colorClass} ${isUrgent ? "animate-pulse" : ""}`} />
        ) : (
          <Clock className={`w-5 h-5 ${colorClass}`} />
        )}
        <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>
          Quote Expires In
        </span>
      </div>

      <div className={`flex items-center justify-center gap-3 ${isUrgent ? "animate-pulse" : ""}`}>
        <div className="text-center">
          <span className={`text-2xl font-black tabular-nums ${colorClass}`}>
            {timeLeft.days}
          </span>
          <span className="block text-[10px] uppercase text-white/40">
            days
          </span>
        </div>
        <span className={`text-xl font-bold ${colorClass} opacity-50`}>:</span>
        <div className="text-center">
          <span className={`text-2xl font-black tabular-nums ${colorClass}`}>
            {timeLeft.hours}
          </span>
          <span className="block text-[10px] uppercase text-white/40">
            hours
          </span>
        </div>
      </div>

      <p className="text-xs text-white/30 mt-2">
        Expires{" "}
        {new Date(expiryDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

function getTimeLeft(expiryDate: string) {
  const now = Date.now();
  const expiry = new Date(expiryDate).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, totalHours: 0, expired: true };
  }

  const totalHours = diff / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);

  return { days, hours, totalHours, expired: false };
}
