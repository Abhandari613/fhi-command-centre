"use client";

import { useState, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { GoogleAddressInput } from "@/components/ui/GoogleAddressInput";
import { createJobManual } from "@/app/actions/manual-job-actions";
import {
  Briefcase,
  MapPin,
  FileText,
  Paperclip,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
  Zap,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function NewJobPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<"standard" | "rush">("standard");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    jobId?: string;
    jobNumber?: string;
    error?: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = title || description || address;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("address", address);
    formData.set("urgency", urgency);
    if (clientId) formData.set("client_id", clientId);
    files.forEach((f) => formData.append("attachments", f));

    const res = await createJobManual(formData);
    setResult(res);
    setLoading(false);

    if (res.success) {
      setTitle("");
      setDescription("");
      setAddress("");
      setClientId(null);
      setClientName(null);
      setUrgency("standard");
      setFiles([]);
      setShowClientPicker(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-white">
          New Job
        </h1>
        <p className="text-[10px] font-mono text-white/30 tracking-wider">
          Create a job from a call, walkthrough, or conversation
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
                  <div className="flex gap-4 mt-1">
                    <Link
                      href={`/ops/jobs/${result.jobId}/scope`}
                      className="text-sm text-primary hover:underline"
                    >
                      Add scope &rarr;
                    </Link>
                    <Link
                      href={`/ops/jobs/${result.jobId}`}
                      className="text-sm text-white/50 hover:underline"
                    >
                      View job
                    </Link>
                  </div>
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
        {/* Urgency toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUrgency("standard")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              urgency === "standard"
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-white/[0.03] border border-white/5 text-white/40"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setUrgency("rush")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              urgency === "rush"
                ? "bg-red-500/20 border border-red-500/40 text-red-300"
                : "bg-white/[0.03] border border-white/5 text-white/40"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Rush
          </button>
        </div>

        {/* Property Address */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            <MapPin className="inline w-4 h-4 mr-1" />
            Property Address
          </label>
          <GoogleAddressInput
            value={address}
            onChange={setAddress}
            placeholder="Start typing an address..."
          />
        </div>

        {/* Job Title */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            <Briefcase className="inline w-4 h-4 mr-1" />
            Job Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kitchen remodel, Unit 4B turnover..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2 opacity-80">
            <FileText className="inline w-4 h-4 mr-1" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did they say? Notes from the call, walkthrough, etc..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Client (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowClientPicker(!showClientPicker)}
            className="flex items-center justify-between w-full text-sm font-semibold opacity-80 mb-2"
          >
            <span>
              <User className="inline w-4 h-4 mr-1" />
              Client
              {clientName && (
                <span className="ml-2 text-primary font-bold">
                  {clientName}
                </span>
              )}
            </span>
            {showClientPicker ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <AnimatePresence>
            {showClientPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ClientPicker
                  selectedClientId={clientId}
                  onSelect={(client) => {
                    setClientId(client.id);
                    setClientName(client.name);
                    setShowClientPicker(false);
                    // Auto-fill address from client if empty
                    if (!address && client.address) {
                      setAddress(client.address);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
          disabled={loading || !canSubmit}
          className="w-full bg-gradient-to-b from-primary to-[#e05e00] hover:from-primary/90 hover:to-[#e05e00]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-4 text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px] shadow-[0_4px_20px_-2px_rgba(255,107,0,0.4)]"
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

      {/* Link to email intake for the other flow */}
      <div className="text-center">
        <Link
          href="/ingest"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Have an email to paste instead? Use Email Intake &rarr;
        </Link>
      </div>
    </div>
  );
}
