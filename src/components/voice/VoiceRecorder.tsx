"use client";

import { useState, useRef } from "react";
import { Mic, Loader2, StopCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
    onRecordingComplete?: (audioBlob: Blob) => void;
    onTranscriptionComplete?: (text: string) => void;
    isProcessing?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, onTranscriptionComplete }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Use mp3 if supported, fallback to webm
            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                // Optional raw blob callback
                if (onRecordingComplete) onRecordingComplete(audioBlob);

                // Transcription flow
                if (onTranscriptionComplete) {
                    setIsTranscribing(true);
                    try {
                        const formData = new FormData();
                        // Whisper requires a file with extension
                        const file = new File([audioBlob], "recording.webm", { type: mimeType });
                        formData.append("file", file);

                        const response = await fetch("/api/openai/transcribe", {
                            method: "POST",
                            body: formData,
                        });

                        const data = await response.json();
                        if (data.text) {
                            onTranscriptionComplete(data.text);
                        } else {
                            console.error("Transcription failed", data.error);
                        }
                    } catch (error) {
                        console.error("Upload error:", error);
                    } finally {
                        setIsTranscribing(false);
                    }
                }

                stream.getTracks().forEach((track) => track.stop()); // Stop mic
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const isBusy = isRecording || isTranscribing;

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                disabled={isTranscribing}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording} // Mobile support
                onTouchEnd={stopRecording}   // Mobile support
                className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl",
                    isRecording ? "bg-red-500 scale-110 ring-4 ring-red-500/30" : "bg-primary hover:bg-primary/90",
                    isTranscribing ? "bg-primary/50 cursor-not-allowed" : "cursor-pointer"
                )}
            >
                {isTranscribing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : isRecording ? (
                    <StopCircle className="w-8 h-8 text-white animate-pulse" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>
            <p className="text-xs font-bold uppercase tracking-wider opacity-60">
                {isTranscribing ? "Transcribing..." : isRecording ? "Recording..." : "Hold to Speak"}
            </p>
        </div>
    );
}
