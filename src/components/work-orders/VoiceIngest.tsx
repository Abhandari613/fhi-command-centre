"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function VoiceIngest({ onIngestComplete }: { onIngestComplete?: () => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop mic
            };

            mediaRecorder.start();
            setIsRecording(true);
            toast.info("Listening... Speak the work order details.");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast.error("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudioBlob = async (blob: Blob) => {
        setIsProcessing(true);
        const toastId = toast.loading("AI is parsing your work order...");

        try {
            const formData = new FormData();
            formData.append("file", blob, "recording.webm");

            const response = await fetch("/api/voice/ingest-wo", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to process audio");
            }

            const result = await response.json();

            if (result.success) {
                toast.success("Work order draft created! Please review it.", { id: toastId });
                if (onIngestComplete) onIngestComplete();
            } else {
                throw new Error(result.error || "Unknown error occurred");
            }
        } catch (error: any) {
            console.error("Processing error:", error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-50 flex items-center justify-center">
            <AnimatePresence>
                {isRecording && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute right-full mr-4 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-full shadow-2xl overflow-hidden"
                    >
                        <div className="flex gap-1 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 bg-brand-primary rounded-full"
                                    animate={{ height: ["10px", "24px", "6px", "14px", "10px"] }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.1,
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-white/90 text-sm font-medium whitespace-nowrap hidden sm:block">
                            Listening...
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_0_40px_rgba(var(--brand-primary-rgb),0.4)] backdrop-blur-xl border border-white/20 transition-colors",
                    isRecording ? "bg-red-500/80 text-white" : "bg-brand-primary text-white",
                    isProcessing ? "opacity-70 cursor-not-allowed" : "hover:shadow-[0_0_60px_rgba(var(--brand-primary-rgb),0.6)]"
                )}
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

                {isProcessing ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                ) : isRecording ? (
                    <Square className="h-6 w-6 fill-current" />
                ) : (
                    <div className="relative">
                        <Mic className="h-7 w-7 text-white" />
                        <motion.div
                            className="absolute -top-1 -right-2 text-yellow-300"
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                        >
                            <Sparkles className="w-3 h-3 fill-current" />
                        </motion.div>
                    </div>
                )}

                {/* Pulse Ring when recording */}
                {isRecording && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-red-500/50"
                        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                )}
            </motion.button>
        </div>
    );
}
