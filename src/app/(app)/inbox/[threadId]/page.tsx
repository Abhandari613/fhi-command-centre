"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Link2,
  PlusCircle,
  Search,
  Send,
} from "lucide-react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  linkEmailToJob,
  searchJobsForLinking,
  suggestJobsForThread,
} from "@/app/actions/email-link-actions";
import { addScopeFromEmail } from "@/app/actions/scope-change-actions";
import { replyToThread } from "@/app/actions/reply-from-job-actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Attachment = {
  attachmentId: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
};

type ThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
  labelIds: string[];
  attachments: Attachment[];
};

type Thread = {
  id: string;
  subject: string;
  snippet: string;
  lastMessageDate: string;
  messages: ThreadMessage[];
  participants: string[];
};

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function extractName(email: string): string {
  const match = email.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return email.split("@")[0];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isSent(labelIds: string[]) {
  return labelIds.includes("SENT");
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.mimeType.startsWith("image/");
  const url = `/api/gmail/attachment?messageId=${attachment.messageId}&attachmentId=${attachment.attachmentId}&mimeType=${encodeURIComponent(attachment.mimeType)}&filename=${encodeURIComponent(attachment.filename)}`;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative rounded-lg overflow-hidden border border-white/10 hover:border-primary/30 transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={attachment.filename}
            className="w-full max-h-64 object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-[10px] text-gray-300 truncate">
              {attachment.filename}
            </p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      download={attachment.filename}
      className="flex items-center gap-3 p-3 rounded-lg glass border border-white/5 hover:border-primary/20 transition-colors"
    >
      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 truncate">{attachment.filename}</p>
        <p className="text-[10px] text-gray-500">{formatSize(attachment.size)}</p>
      </div>
      <Download className="w-4 h-4 text-gray-500" />
    </a>
  );
}

function MessageBubble({
  message,
  isLastInGroup,
}: {
  message: ThreadMessage;
  isLastInGroup: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const sent = isSent(message.labelIds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", sent ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] space-y-2",
          sent ? "items-end" : "items-start",
        )}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="text-xs font-medium text-gray-300">
            {extractName(message.from)}
          </span>
          <span className="text-[10px] text-gray-600">
            {formatFullDate(message.date)}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-600" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              {/* Body */}
              <GlassCard
                className={cn(
                  "p-3",
                  sent
                    ? "bg-primary/5 border-primary/10"
                    : "bg-white/[0.02]",
                )}
              >
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {message.body}
                </p>
              </GlassCard>

              {/* Attachments */}
              {message.attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-[10px] font-medium">
                      {message.attachments.length} attachment
                      {message.attachments.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {message.attachments.map((att) => (
                      <AttachmentPreview
                        key={att.attachmentId}
                        attachment={att}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkedJobId, setLinkedJobId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    async function loadThread() {
      try {
        const res = await fetch(`/api/gmail/threads/${threadId}`);
        if (!res.ok) throw new Error("Failed to load thread");
        const data = await res.json();
        setThread(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadThread();
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <GlassCard className="p-8 text-center">
          <p className="text-gray-400">
            {error || "Thread not found"}
          </p>
        </GlassCard>
      </div>
    );
  }

  const totalAttachments = thread.messages.reduce(
    (sum, m) => sum + m.attachments.length,
    0,
  );
  const imageCount = thread.messages.reduce(
    (sum, m) =>
      sum + m.attachments.filter((a) => a.mimeType.startsWith("image/")).length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white leading-snug">
            {thread.subject || "(no subject)"}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              {thread.messages.length} message
              {thread.messages.length > 1 ? "s" : ""}
            </span>
            {totalAttachments > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {totalAttachments}
              </span>
            )}
            {imageCount > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {imageCount} photo{imageCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-1.5">
        {thread.participants.map((p) => (
          <span
            key={p}
            className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full"
          >
            {extractName(p)}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {thread.messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastInGroup={
              i === thread.messages.length - 1 ||
              isSent(msg.labelIds) !==
                isSent(thread.messages[i + 1]?.labelIds || [])
            }
          />
        ))}
      </div>

      {/* Action bar — Link to Job, Reply, Add Scope */}
      <GlassCard intensity="panel" className="p-4 space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Actions
        </h3>

        <div className="flex gap-2 flex-wrap">
          {/* Link to Job */}
          <AnimatedButton
            variant="secondary"
            size="sm"
            onClick={async () => {
              setShowLinkPanel(!showLinkPanel);
              if (!showLinkPanel) {
                // Load suggestions
                const res = await fetch(`/api/inbox`);
                const data = await res.json();
                const emailThread = (data.threads || []).find(
                  (t: any) => t.gmail_thread_id === threadId,
                );
                if (emailThread?.id) {
                  const sug = await suggestJobsForThread(emailThread.id);
                  setSuggestions(sug);
                }
              }
            }}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link to Job
          </AnimatedButton>

          {/* Reply */}
          <AnimatedButton
            variant="secondary"
            size="sm"
            onClick={() => setShowReply(!showReply)}
          >
            <Send className="w-3.5 h-3.5" />
            Reply
          </AnimatedButton>
        </div>

        {/* Link panel */}
        <AnimatePresence>
          {showLinkPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                      Suggested Jobs
                    </span>
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={async () => {
                          const res = await fetch(`/api/inbox`);
                          const data = await res.json();
                          const emailThread = (data.threads || []).find(
                            (t: any) => t.gmail_thread_id === threadId,
                          );
                          if (emailThread?.id) {
                            const result = await linkEmailToJob(
                              emailThread.id,
                              s.id,
                            );
                            if (result.success) {
                              toast.success("Linked to job!");
                              setLinkedJobId(s.id);
                              setShowLinkPanel(false);
                            }
                          }
                        }}
                        className="w-full text-left bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mt-1 transition-colors"
                      >
                        <span className="text-xs font-mono text-primary">
                          {s.job_number}
                        </span>
                        <span className="text-sm text-white ml-2">
                          {s.title}
                        </span>
                        <span className="text-[10px] text-gray-500 ml-2">
                          {s.confidence}% match
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={jobSearch}
                    onChange={async (e) => {
                      setJobSearch(e.target.value);
                      if (e.target.value.length >= 2) {
                        setSearching(true);
                        const results = await searchJobsForLinking(
                          e.target.value,
                        );
                        setJobResults(results);
                        setSearching(false);
                      } else {
                        setJobResults([]);
                      }
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                  />
                </div>
                {searching && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {jobResults.map((job) => (
                  <button
                    key={job.id}
                    onClick={async () => {
                      const res = await fetch(`/api/inbox`);
                      const data = await res.json();
                      const emailThread = (data.threads || []).find(
                        (t: any) => t.gmail_thread_id === threadId,
                      );
                      if (emailThread?.id) {
                        const result = await linkEmailToJob(
                          emailThread.id,
                          job.id,
                        );
                        if (result.success) {
                          toast.success(`Linked to ${job.job_number}`);
                          setLinkedJobId(job.id);
                          setShowLinkPanel(false);
                        }
                      }
                    }}
                    className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                  >
                    <span className="text-xs font-mono text-primary">
                      {job.job_number}
                    </span>
                    <span className="text-sm text-white ml-2">
                      {job.property_address || job.title}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply box */}
        <AnimatePresence>
          {showReply && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20 resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReply(false);
                      setReplyBody("");
                    }}
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    size="sm"
                    disabled={!replyBody.trim() || sending}
                    isLoading={sending}
                    onClick={async () => {
                      setSending(true);
                      const result = await replyToThread(
                        threadId,
                        replyBody,
                        linkedJobId || undefined,
                      );
                      if (result.success) {
                        toast.success("Reply sent!");
                        setReplyBody("");
                        setShowReply(false);
                      } else {
                        toast.error(result.error || "Failed to send");
                      }
                      setSending(false);
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Linked job indicator */}
        {linkedJobId && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-2 rounded-lg">
            <Briefcase className="w-3.5 h-3.5" />
            Linked to job — <a href={`/ops/jobs/${linkedJobId}`} className="underline">View Job</a>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
