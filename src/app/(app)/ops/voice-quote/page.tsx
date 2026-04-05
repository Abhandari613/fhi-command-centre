"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  StopCircle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { GoogleAddressInput } from "@/components/ui/GoogleAddressInput";
import { useRouter } from "next/navigation";

// --- Types ---

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteData {
  jobTitle: string;
  jobDescription: string;
  lineItems: LineItem[];
}

interface SelectedClient {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
}

type Step = "record" | "review" | "confirm";

// --- Helpers ---

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// --- Component ---

export default function VoiceQuotePage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("record");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcription state
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  // Extracted data (editable)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [client, setClient] = useState<SelectedClient | null>(null);
  const [address, setAddress] = useState("");

  // Confirm state
  const [isCreating, setIsCreating] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [createdJobNumber, setCreatedJobNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- Recording ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob, mimeType);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      const file = new File([audioBlob], `recording.${ext}`, {
        type: mimeType,
      });
      formData.append("file", file);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Transcription failed");
      }

      const result = await res.json();
      const data: QuoteData = result.data;

      setTranscript(result.transcript || "");
      setTitle(data?.jobTitle || "");
      setDescription(data?.jobDescription || "");
      setLineItems(
        data?.lineItems?.length
          ? data.lineItems
          : [{ description: "", quantity: 1, unit_price: 0 }],
      );
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Failed to process audio");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Line item editing ---

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    );
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const total = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_price,
    0,
  );

  // --- Create job ---

  const handleCreateJob = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("title", title || address || "Voice Quote");
      formData.set("description", description || "");
      formData.set("address", address || "");
      if (client?.id) formData.set("client_id", client.id);

      // Create the job via the manual-job-actions server action
      const { createJobManual } = await import(
        "@/app/actions/manual-job-actions"
      );
      const result = await createJobManual(formData);

      if (!result.success || !result.jobId) {
        throw new Error(result.error || "Failed to create job");
      }

      // Now add line items as job_tasks
      if (lineItems.length > 0) {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        for (const li of lineItems) {
          if (!li.description.trim()) continue;
          await supabase.from("job_tasks").insert({
            job_id: result.jobId,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            is_confirmed: true,
          } as any);
        }
      }

      setCreatedJobId(result.jobId);
      setCreatedJobNumber(result.jobNumber || null);
      setStep("confirm");
    } catch (err: any) {
      setError(err.message || "Failed to create job");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Reset ---

  const handleReset = () => {
    setStep("record");
    setTranscript("");
    setTitle("");
    setDescription("");
    setLineItems([]);
    setClient(null);
    setAddress("");
    setCreatedJobId(null);
    setCreatedJobNumber(null);
    setError(null);
    setRecordingTime(0);
  };

  // --- Render ---

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Voice Quote</h1>
          <p className="text-xs text-gray-500">
            Speak the job details, review, and create
          </p>
        </div>
      </motion.div>

      {/* Step indicator */}
      <motion.div variants={item} className="flex items-center gap-2 text-xs">
        {(["record", "review", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`w-8 h-px ${step === s || step === "confirm" ? "bg-primary/60" : "bg-white/10"}`}
              />
            )}
            <div
              className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider transition-colors ${
                step === s
                  ? "bg-primary/20 text-primary"
                  : step === "confirm" ||
                      (step === "review" && s === "record")
                    ? "bg-white/5 text-emerald-400"
                    : "bg-white/5 text-gray-600"
              }`}
            >
              {s === "record" && step !== "record" ? (
                <Check className="w-3 h-3 inline" />
              ) : (
                s
              )}
            </div>
          </div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ====== STEP 1: RECORD ====== */}
        {step === "record" && (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <GlassCard className="p-8 flex flex-col items-center gap-6">
              {/* Pulse ring animation */}
              <div className="relative">
                {isRecording && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500/20"
                      animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      style={{ width: 96, height: 96, top: -8, left: -8 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500/10"
                      animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      style={{ width: 96, height: 96, top: -8, left: -8 }}
                    />
                  </>
                )}

                <motion.button
                  type="button"
                  disabled={isProcessing}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startRecording();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                  whileHover={!isRecording ? { scale: 1.05 } : undefined}
                  whileTap={!isRecording ? { scale: 0.95 } : undefined}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-10 ${
                    isRecording
                      ? "bg-red-500 ring-4 ring-red-500/30"
                      : isProcessing
                        ? "bg-primary/40 cursor-not-allowed"
                        : "bg-gradient-to-b from-primary to-[#e05e00] cursor-pointer"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : isRecording ? (
                    <StopCircle className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </motion.button>
              </div>

              {/* Timer */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl font-mono font-bold text-red-400 tabular-nums"
                >
                  {formatTime(recordingTime)}
                </motion.div>
              )}

              <p className="text-sm text-gray-400 font-medium text-center">
                {isProcessing
                  ? "Processing your recording..."
                  : isRecording
                    ? "Release to stop recording"
                    : "Hold the button and describe the job"}
              </p>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-primary"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI is extracting quote details...</span>
                </motion.div>
              )}
            </GlassCard>

            {error && (
              <GlassCard className="p-4 border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400/60 underline mt-1"
                >
                  Dismiss
                </button>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ====== STEP 2: REVIEW ====== */}
        {step === "review" && (
          <motion.div
            key="review"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {/* Transcript (collapsible) */}
            {transcript && (
              <motion.div variants={item}>
                <GlassCard className="overflow-hidden">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    <span>Raw Transcript</span>
                    {showTranscript ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showTranscript && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-sm text-gray-300 leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5">
                          {transcript}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            )}

            {/* Job Title & Description */}
            <motion.div variants={item}>
              <GlassCard className="p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Job Details
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-medium">
                    Title
                  </label>
                  <input
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary/50 mt-1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Job title..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary/50 mt-1 min-h-[80px] resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Scope of work..."
                  />
                </div>
              </GlassCard>
            </motion.div>

            {/* Client */}
            <motion.div variants={item}>
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Client
                </h3>
                {client ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{client.name}</p>
                      <p className="text-xs text-gray-500">
                        {client.email || "No email"}
                      </p>
                    </div>
                    <button
                      onClick={() => setClient(null)}
                      className="text-xs text-gray-500 hover:text-white underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <ClientPicker
                    onSelect={(c) => setClient(c)}
                    selectedClientId={client ? (client as SelectedClient).id : null}
                  />
                )}
              </GlassCard>
            </motion.div>

            {/* Address */}
            <motion.div variants={item}>
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Property Address
                </h3>
                <GoogleAddressInput
                  value={address}
                  onChange={setAddress}
                  onSelect={(addr) => setAddress(addr)}
                  placeholder="Job site address..."
                />
              </GlassCard>
            </motion.div>

            {/* Line Items */}
            <motion.div variants={item}>
              <GlassCard className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Line Items
                  </h3>
                  <button
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((li, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/20 rounded-lg p-3 border border-white/5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none placeholder:text-gray-600"
                          value={li.description}
                          onChange={(e) =>
                            updateLineItem(i, "description", e.target.value)
                          }
                          placeholder="Task description..."
                        />
                        <button
                          onClick={() => removeLineItem(i)}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-600 uppercase">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="w-full bg-black/30 border border-white/5 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                            value={li.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                i,
                                "quantity",
                                Number(e.target.value) || 1,
                              )
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-600 uppercase">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full bg-black/30 border border-white/5 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                            value={li.unit_price}
                            onChange={(e) =>
                              updateLineItem(
                                i,
                                "unit_price",
                                Number(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-600 uppercase">
                            Total
                          </label>
                          <p className="px-2 py-1.5 text-sm font-medium text-emerald-400">
                            {fmt.format(li.quantity * li.unit_price)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Grand total */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-sm font-bold text-gray-400">
                    Estimated Total
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {fmt.format(total)}
                  </span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div variants={item}>
                <GlassCard className="p-4 border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </GlassCard>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div variants={item} className="flex gap-3">
              <AnimatedButton
                variant="ghost"
                onClick={handleReset}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </AnimatedButton>
              <AnimatedButton
                variant="primary"
                onClick={handleCreateJob}
                isLoading={isCreating}
                className="flex-[2]"
              >
                Looks Good
                <ArrowRight className="w-4 h-4" />
              </AnimatedButton>
            </motion.div>
          </motion.div>
        )}

        {/* ====== STEP 3: CONFIRM ====== */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <GlassCard className="p-8 flex flex-col items-center gap-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1,
                }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-emerald-400" />
              </motion.div>

              <div>
                <h2 className="text-lg font-bold">Job Created</h2>
                {createdJobNumber && (
                  <p className="text-sm text-gray-400 mt-1">
                    Job #{createdJobNumber}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Status: <span className="text-white/50 font-medium">Draft</span>{" "}
                  &mdash; review the quote and send when ready
                </p>
              </div>

              <div className="flex gap-3 w-full mt-4">
                <AnimatedButton
                  variant="secondary"
                  onClick={handleReset}
                  className="flex-1"
                >
                  <Mic className="w-4 h-4" />
                  New Quote
                </AnimatedButton>
                <AnimatedButton
                  variant="primary"
                  onClick={() =>
                    router.push(`/ops/jobs/${createdJobId}/quote`)
                  }
                  className="flex-1"
                >
                  Review Quote
                  <ArrowRight className="w-4 h-4" />
                </AnimatedButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
