"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

type PunchListItem = {
  id: string;
  description: string;
  photo_url: string | null;
  status: string;
};

const statusConfig: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  open: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-400",
    label: "Open",
  },
  in_progress: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-400",
    label: "In Progress",
  },
  resolved: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-400",
    label: "Resolved",
  },
};

export function PunchListPanel({ items }: { items: PunchListItem[] }) {
  if (items.length === 0) return null;

  const openCount = items.filter((i) => i.status === "open").length;
  const resolvedCount = items.filter((i) => i.status === "resolved").length;

  return (
    <GlassCard className="p-4 border-red-500/20 bg-red-500/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Punch List ({openCount} open, {resolvedCount} resolved)
        </h3>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const config = statusConfig[item.status] || statusConfig.open;
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 bg-white/5 rounded-lg p-3"
            >
              <span className={`mt-0.5 ${config.color}`}>{config.icon}</span>
              <div className="flex-1">
                <p className="text-sm">{item.description}</p>
                <span className={`text-xs ${config.color}`}>
                  {config.label}
                </span>
              </div>
              {item.photo_url && (
                <img
                  src={item.photo_url}
                  alt="Punch list photo"
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
