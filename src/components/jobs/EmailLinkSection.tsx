"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getJobEmails,
  linkEmailToJob,
  unlinkEmailFromJob,
  searchJobsForLinking,
  suggestJobsForThread,
} from "@/app/actions/email-link-actions";
import { replyToThread } from "@/app/actions/reply-from-job-actions";
import {
  Mail,
  Link2,
  Unlink,
  Search,
  Loader2,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

interface EmailLinkSectionProps {
  jobId: string;
}

export function EmailLinkSection({ jobId }: EmailLinkSectionProps) {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [threadResults, setThreadResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const loadEmails = useCallback(async () => {
    const data = await getJobEmails(jobId);
    setEmails(data);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleUnlink = async (threadId: string) => {
    const result = await unlinkEmailFromJob(threadId, jobId);
    if (result.success) {
      toast.success("Email unlinked");
      await loadEmails();
    }
  };

  const handleSearchThreads = async (query: string) => {
    setLinkSearchQuery(query);
    if (query.length < 2) {
      setThreadResults([]);
      return;
    }
    setSearching(true);
    // Search email_threads by subject/participants
    const res = await fetch(
      `/api/inbox?search=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    setThreadResults(data.threads || []);
    setSearching(false);
  };

  const handleLinkThread = async (threadId: string) => {
    const result = await linkEmailToJob(threadId, jobId);
    if (result.success) {
      toast.success("Email linked to job");
      setShowLinkSearch(false);
      setLinkSearchQuery("");
      setThreadResults([]);
      await loadEmails();
    }
  };

  const handleReply = async (gmailThreadId: string) => {
    if (!replyBody.trim()) return;
    setSending(true);
    const result = await replyToThread(gmailThreadId, replyBody, jobId);
    if (result.success) {
      toast.success("Reply sent");
      setReplyingTo(null);
      setReplyBody("");
    } else {
      toast.error(result.error || "Failed to send");
    }
    setSending(false);
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold opacity-60 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email History ({emails.length})
        </h3>
        <button
          onClick={() => setShowLinkSearch(!showLinkSearch)}
          className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          Link Email
        </button>
      </div>

      {/* Link search */}
      <AnimatePresence>
        {showLinkSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search emails by subject..."
                value={linkSearchQuery}
                onChange={(e) => handleSearchThreads(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                autoFocus
              />
            </div>
            {searching && (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            )}
            {threadResults.map((thread: any) => (
              <button
                key={thread.id || thread.gmail_thread_id}
                onClick={() => handleLinkThread(thread.id)}
                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 mb-1 transition-colors"
              >
                <p className="text-sm text-white truncate">{thread.subject}</p>
                <p className="text-xs text-gray-500 truncate">
                  {(thread.participants || []).slice(0, 2).join(", ")}
                </p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email list */}
      {loading ? (
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      ) : emails.length === 0 ? (
        <p className="text-xs opacity-40 text-center py-3">
          No emails linked yet
        </p>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <div key={email.id} className="group">
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/inbox/${email.gmail_thread_id}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-white truncate hover:text-primary transition-colors">
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {email.participants.slice(0, 2).join(", ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">
                        {new Date(email.last_message_date).toLocaleDateString()}
                      </span>
                      {email.message_count > 1 && (
                        <span className="text-[10px] text-gray-500">
                          {email.message_count} msgs
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === email.gmail_thread_id
                            ? null
                            : email.gmail_thread_id,
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-primary"
                      title="Reply"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUnlink(email.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                      title="Unlink"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reply box (TRACK 7) */}
                <AnimatePresence>
                  {replyingTo === email.gmail_thread_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Type your reply..."
                          rows={3}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20 resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyBody("");
                            }}
                          >
                            Cancel
                          </AnimatedButton>
                          <AnimatedButton
                            size="sm"
                            onClick={() =>
                              handleReply(email.gmail_thread_id)
                            }
                            disabled={!replyBody.trim() || sending}
                            isLoading={sending}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send
                          </AnimatedButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
