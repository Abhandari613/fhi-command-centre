"use client";

import { useEffect, useState } from "react";
import { getJobTimeline, TimelineEvent } from "@/app/actions/timeline-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Mail,
  Camera,
  DollarSign,
  FileText,
  ArrowRight,
  ClipboardCheck,
  MessageSquare,
  Send,
  Loader2,
  Clock,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<string, any> = {
  status_change: ArrowRight,
  status_completed: ClipboardCheck,
  invoice_created: FileText,
  invoice_sent: Send,
  email_linked: Mail,
  email_received: Mail,
  email_reply_sent: MessageSquare,
  photos_shared: Camera,
  photos_uploaded: Camera,
  scope_change_added: AlertTriangle,
  job_created_from_draft: Briefcase,
  note_added: MessageSquare,
  payment_received: DollarSign,
  expense_recorded: DollarSign,
  deposit_paid: DollarSign,
  supplies_confirmed: ClipboardCheck,
};

const EVENT_COLORS: Record<string, string> = {
  status_change: "bg-blue-500/20 text-blue-400",
  status_completed: "bg-emerald-500/20 text-emerald-400",
  invoice_created: "bg-purple-500/20 text-purple-400",
  invoice_sent: "bg-indigo-500/20 text-indigo-400",
  email_linked: "bg-sky-500/20 text-sky-400",
  email_received: "bg-sky-500/20 text-sky-400",
  email_reply_sent: "bg-cyan-500/20 text-cyan-400",
  photos_shared: "bg-orange-500/20 text-orange-400",
  photos_uploaded: "bg-amber-500/20 text-amber-400",
  scope_change_added: "bg-yellow-500/20 text-yellow-400",
  job_created_from_draft: "bg-primary/20 text-primary",
  note_added: "bg-gray-500/20 text-gray-400",
  payment_received: "bg-green-500/20 text-green-400",
  expense_recorded: "bg-red-500/20 text-red-400",
  deposit_paid: "bg-emerald-500/20 text-emerald-400",
  supplies_confirmed: "bg-teal-500/20 text-teal-400",
};

interface JobTimelineProps {
  jobId: string;
}

export function JobTimeline({ jobId }: JobTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobTimeline(jobId).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No events yet</p>
      </GlassCard>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" />

      <div className="space-y-4">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.type] || Clock;
          const colorClass =
            EVENT_COLORS[event.type] || "bg-white/10 text-gray-400";

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex items-start gap-3 pl-0"
            >
              {/* Icon dot */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                  colorClass,
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-white">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0 font-mono">
                    {new Date(event.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {event.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <span className="text-[10px] text-gray-600 mt-1 block">
                  {new Date(event.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  &middot; {event.actor}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
