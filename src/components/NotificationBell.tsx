"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bell,
  X,
  Mail,
  AlertTriangle,
  Camera,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from "@/app/actions/notification-actions";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  email_detected: {
    icon: <Mail className="w-4 h-4" />,
    color: "text-blue-400",
  },
  new_job: {
    icon: <Mail className="w-4 h-4" />,
    color: "text-green-400",
  },
  quote_stale: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-yellow-400",
  },
  sub_photo: {
    icon: <Camera className="w-4 h-4" />,
    color: "text-purple-400",
  },
  completion_ready: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-cyan-400",
  },
  margin_warning: {
    icon: <DollarSign className="w-4 h-4" />,
    color: "text-red-400",
  },
  schedule_suggestion: {
    icon: <Calendar className="w-4 h-4" />,
    color: "text-orange-400",
  },
  review_request: {
    icon: <Mail className="w-4 h-4" />,
    color: "text-green-400",
  },
  payment_reminder_sent: {
    icon: <DollarSign className="w-4 h-4" />,
    color: "text-amber-400",
  },
  recurring_job_created: {
    icon: <Calendar className="w-4 h-4" />,
    color: "text-purple-400",
  },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await getUnreadNotifications();
    setNotifications(data);
  }, []);

  useEffect(() => {
    load();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications([]);
  };

  const count = notifications.length;

  function getLink(n: Notification): string | null {
    if (n.metadata?.job_id) return `/ops/jobs/${n.metadata.job_id}`;
    if (n.metadata?.quote_id) return `/ops/quotes/${n.metadata.quote_id}`;
    return null;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-[#e85d26] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-[#e85d26]/40"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="text-sm font-bold">Notifications</span>
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#e85d26] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {count === 0 ? (
              <div className="p-6 text-center text-sm opacity-40">
                All caught up
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_job;
                  const link = getLink(n);

                  const inner = (
                    <>
                      <div className={`mt-0.5 ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs opacity-50 mt-0.5 truncate">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] opacity-30 mt-1">
                          {formatTimeAgo(n.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkRead(n.id);
                        }}
                        className="opacity-30 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  );

                  const className =
                    "flex items-start gap-3 p-3 hover:bg-white/5 transition-colors cursor-pointer";

                  return link ? (
                    <Link
                      key={n.id}
                      href={link}
                      className={className}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      key={n.id}
                      className={className}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
