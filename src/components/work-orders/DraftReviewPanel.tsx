"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  convertDraftToJob,
  DraftReviewData,
} from "@/app/actions/draft-review-actions";
import { Loader2, Check, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DraftReviewPanelProps {
  draft: DraftReviewData;
  onConvert?: () => void;
}

export function DraftReviewPanel({ draft, onConvert }: DraftReviewPanelProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [fields, setFields] = useState({
    client_name: draft.client_name || "",
    property_address: draft.property_address_or_unit || "",
    description: draft.description || "",
    trade_type: draft.trade_type || "General",
  });

  const handleConvert = async () => {
    setConverting(true);
    const result = await convertDraftToJob(draft.id, {
      client_name: fields.client_name,
      property_address: fields.property_address,
      description: fields.description,
      trade_type: fields.trade_type,
    });

    if (result.success && result.jobId) {
      toast.success(`Job ${result.jobNumber} created!`);
      onConvert?.();
      router.push(`/ops/jobs/${result.jobId}`);
    } else {
      toast.error(result.error || "Failed to create job");
    }
    setConverting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
              {draft.source || "Email"} Draft
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {fields.trade_type} — {fields.property_address || "Unknown"}
            </h3>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">
                Client Name
              </label>
              <input
                value={fields.client_name}
                onChange={(e) =>
                  setFields((f) => ({ ...f, client_name: e.target.value }))
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">
                Property Address
              </label>
              <input
                value={fields.property_address}
                onChange={(e) =>
                  setFields((f) => ({
                    ...f,
                    property_address: e.target.value,
                  }))
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">
                Trade / Type
              </label>
              <input
                value={fields.trade_type}
                onChange={(e) =>
                  setFields((f) => ({ ...f, trade_type: e.target.value }))
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase opacity-50 mb-1">
                Description / Scope
              </label>
              <textarea
                value={fields.description}
                onChange={(e) =>
                  setFields((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500 w-16">Client</span>
              <span className="text-white">{fields.client_name || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-16">Address</span>
              <span className="text-white">
                {fields.property_address || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-16">Scope</span>
              <span className="text-gray-300 line-clamp-3">
                {fields.description || "No description"}
              </span>
            </div>
          </div>
        )}

        {/* Raw email preview */}
        {draft.raw_content && (
          <details className="group">
            <summary className="text-[10px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              Original Email Content
            </summary>
            <div className="mt-2 p-3 bg-black/20 rounded-lg text-xs text-gray-400 whitespace-pre-wrap line-clamp-10 max-h-40 overflow-y-auto">
              {draft.raw_content}
            </div>
          </details>
        )}

        <AnimatedButton
          onClick={handleConvert}
          disabled={converting}
          isLoading={converting}
          className="w-full"
          size="lg"
        >
          <Check className="w-5 h-5" />
          Create Job
        </AnimatedButton>
      </GlassCard>
    </motion.div>
  );
}
