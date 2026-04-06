"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  sendReminderDraft,
  dismissReminderDraft,
} from "@/app/actions/payment-reminder-draft-actions";

type ReminderDraft = {
  id: string;
  job_id: string;
  tier: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_html: string;
  amount: number | null;
  days_outstanding: number | null;
  status: string;
  created_at: string;
};

const TIER_COLORS: Record<string, string> = {
  friendly: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  followup: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  urgent: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  final: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ReminderDraftList({
  drafts: initialDrafts,
}: {
  drafts: ReminderDraft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBody, setEditedBody] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function handleSend(draftId: string, body?: string) {
    startTransition(async () => {
      const result = await sendReminderDraft(draftId, body);
      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        setEditingId(null);
      }
    });
  }

  async function handleDismiss(draftId: string) {
    startTransition(async () => {
      const result = await dismissReminderDraft(draftId);
      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      }
    });
  }

  function handleEdit(draft: ReminderDraft) {
    setEditingId(draft.id);
    // Strip HTML tags for editing as plain text
    setEditedBody(
      draft.body_html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">
          {drafts.length} reminder{drafts.length !== 1 ? "s" : ""} pending
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {drafts.map((draft) => (
          <motion.div
            key={draft.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -200, transition: { duration: 0.3 } }}
            className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${TIER_COLORS[draft.tier] || "bg-white/10 text-white/60"}`}
                  >
                    {draft.tier}
                  </span>
                  <span className="text-white font-medium">
                    {draft.recipient_name || draft.recipient_email}
                  </span>
                </div>
                {draft.amount && (
                  <span className="text-[#ff6b00] font-bold">
                    ${Number(draft.amount).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/40">
                <span>{draft.recipient_email}</span>
                {draft.days_outstanding && (
                  <>
                    <span>·</span>
                    <span>{draft.days_outstanding} days outstanding</span>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4">
              <p className="text-sm text-white/60 mb-1 font-medium">
                Subject: {draft.subject}
              </p>
              {editingId === draft.id ? (
                <textarea
                  className="w-full rounded-lg bg-white/5 border border-white/20 p-3 text-sm text-white/80 min-h-[120px] focus:border-[#ff6b00] focus:outline-none"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                />
              ) : (
                <div
                  className="text-sm text-white/50 max-h-20 overflow-hidden relative"
                  style={{
                    maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                  }}
                  dangerouslySetInnerHTML={{ __html: draft.body_html }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              {editingId === draft.id ? (
                <>
                  <button
                    onClick={() => handleSend(draft.id, editedBody)}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#ff6b00] text-white font-medium text-sm hover:bg-[#ff6b00]/80 transition disabled:opacity-50"
                  >
                    {isPending ? "Sending..." : "Send Edited"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSend(draft.id)}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#ff6b00] text-white font-medium text-sm hover:bg-[#ff6b00]/80 transition disabled:opacity-50"
                  >
                    {isPending ? "Sending..." : "Send"}
                  </button>
                  <button
                    onClick={() => handleEdit(draft)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition"
                  >
                    Edit & Send
                  </button>
                  <button
                    onClick={() => handleDismiss(draft.id)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm hover:bg-red-500/20 hover:text-red-400 transition disabled:opacity-50"
                  >
                    Skip
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
