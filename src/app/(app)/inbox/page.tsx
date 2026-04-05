"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Mail,
  Paperclip,
  Loader2,
  RefreshCw,
  Briefcase,
  Star,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

type EmailThread = {
  id: string;
  gmail_thread_id: string;
  subject: string;
  snippet: string;
  last_message_date: string;
  participants: string[];
  classification: string | null;
  job_id: string | null;
  is_read: boolean;
  message_count: number;
  has_attachments: boolean;
};

const CLASSIFICATION_BADGES: Record<
  string,
  { label: string; color: string }
> = {
  new_work: { label: "New Work", color: "bg-blue-500/20 text-blue-400" },
  quote_request: {
    label: "Quote Request",
    color: "bg-yellow-500/20 text-yellow-400",
  },
  job_update: {
    label: "Job Update",
    color: "bg-emerald-500/20 text-emerald-400",
  },
  irrelevant: { label: "Other", color: "bg-gray-500/20 text-gray-400" },
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function extractName(email: string): string {
  const match = email.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return email.split("@")[0];
}

export default function InboxPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      if (!res.ok) throw new Error("Failed to load threads");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error("Failed to load inbox:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await fetch("/api/gmail/poll", { method: "POST" });
      await loadThreads();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const filtered =
    filter === "all"
      ? threads
      : filter === "unread"
        ? threads.filter((t) => !t.is_read)
        : threads.filter((t) => t.classification === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-white">Inbox</h1>
          {threads.filter((t) => !t.is_read).length > 0 && (
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {threads.filter((t) => !t.is_read).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          >
            <RefreshCw
              className={cn("w-4 h-4 text-gray-400", syncing && "animate-spin")}
            />
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "new_work", label: "New Work" },
          { key: "quote_request", label: "Quotes" },
          { key: "job_update", label: "Updates" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filter === f.key
                ? "bg-primary/20 text-primary border border-primary/30"
                : "glass text-gray-400 border border-white/5 hover:text-gray-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Mail className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {filter === "all" ? "No emails yet" : "No matching emails"}
          </p>
          <button
            onClick={syncNow}
            className="mt-3 text-primary text-sm font-medium hover:underline"
          >
            Sync now
          </button>
        </GlassCard>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {filtered.map((thread, i) => (
              <motion.div
                key={thread.gmail_thread_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/inbox/${thread.gmail_thread_id}`}>
                  <GlassCard
                    className={cn(
                      "p-4 hover:bg-white/[0.03] transition-colors cursor-pointer",
                      !thread.is_read && "border-l-2 border-l-primary",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Sender + date */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-sm truncate",
                              !thread.is_read
                                ? "font-bold text-white"
                                : "font-medium text-gray-300",
                            )}
                          >
                            {thread.participants
                              .slice(0, 2)
                              .map(extractName)
                              .join(", ")}
                          </span>
                          <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">
                            {formatDate(thread.last_message_date)}
                          </span>
                        </div>

                        {/* Subject */}
                        <p
                          className={cn(
                            "text-sm truncate mb-1",
                            !thread.is_read
                              ? "text-gray-200"
                              : "text-gray-400",
                          )}
                        >
                          {thread.subject || "(no subject)"}
                        </p>

                        {/* Snippet */}
                        <p className="text-xs text-gray-500 truncate">
                          {thread.snippet}
                        </p>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {thread.classification &&
                            thread.classification !== "irrelevant" &&
                            CLASSIFICATION_BADGES[thread.classification] && (
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                  CLASSIFICATION_BADGES[thread.classification]
                                    .color,
                                )}
                              >
                                {
                                  CLASSIFICATION_BADGES[thread.classification]
                                    .label
                                }
                              </span>
                            )}
                          {thread.job_id && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" />
                              Linked
                            </span>
                          )}
                          {thread.has_attachments && (
                            <Paperclip className="w-3 h-3 text-gray-500" />
                          )}
                          {thread.message_count > 1 && (
                            <span className="text-[10px] text-gray-500">
                              {thread.message_count} msgs
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
