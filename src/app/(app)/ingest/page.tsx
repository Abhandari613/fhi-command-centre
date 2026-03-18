"use client";

import { useState, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createJobFromEmail } from "@/app/actions/ingest-actions";
import {
  Mail,
  Paperclip,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function IngestPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    jobId?: string;
    jobNumber?: string;
    error?: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isRush = () => {
    const text = `${subject} ${body}`.toLowerCase();
    return ["rush", "asap", "urgent", "emergency", "immediately"].some((kw) =>
      text.includes(kw),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("body", body);
    files.forEach((f) => formData.append("attachments", f));

    const res = await createJobFromEmail(formData);
    setResult(res);
    setLoading(false);

    if (res.success) {
      setSubject("");
      setBody("");
      setFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Email Intake
        </h1>
        <p className="text-[10px] font-mono text-white/30 tracking-wider">
          Paste an incoming email to auto-create a job
        </p>
      </header>

      <AnimatePresence>
        {result?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="p-5 border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-lg font-bold text-green-300">
                    Job {result.jobNumber} created!
                  </p>
                  <Link
                    href={`/ops/jobs/${result.jobId}/scope`}
                    className="text-sm text-primary hover:underline"
                  >
                    Add scope from photos &rarr;
                  </Link>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {result && !result.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="p-5 border-red-500/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <p className="text-red-300">{result.error}</p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="p-5 space-y-5">
        {/* Urgency badge */}
        {isRush() && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-2 text-red-300 font-bold text-center text-sm">
            RUSH JOB DETECTED
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            <Mail className="inline w-4 h-4 mr-1" />
            Email Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Paste the subject line here..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            Email Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the email body here..."
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            <Paperclip className="inline w-4 h-4 mr-1" />
            Photos or PDF
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full bg-white/5 border-2 border-dashed border-white/15 rounded-xl py-4 text-center text-sm opacity-60 hover:opacity-80 active:scale-[0.98] transition-all min-h-[56px]"
          >
            Tap to add photos or PDF
          </button>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="truncate flex-1">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-2 p-1 hover:bg-white/10 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4 opacity-60" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || (!subject && !body)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-4 text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Create Job
            </>
          )}
        </button>
      </GlassCard>
    </div>
  );
}
