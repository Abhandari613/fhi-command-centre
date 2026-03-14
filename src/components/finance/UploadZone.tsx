"use client";

import { useState, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function UploadZone({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const router = useRouter();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/finance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResult({
        success: true,
        message: data.message || "File uploaded successfully",
      });
      router.refresh();
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setIsUploading(false);
      setIsDragActive(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-3xl border-2 border-dashed transition-all duration-300",
          isDragActive
            ? "border-indigo-500/50 bg-indigo-500/10 scale-[1.01]"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleChange}
          disabled={isUploading}
          accept=".csv,.xlsx,.xls"
        />

        <div className="flex flex-col items-center gap-4 text-center pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors",
              isDragActive
                ? "bg-indigo-500 text-white"
                : "bg-white/10 text-white/50",
            )}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              {isUploading ? "Uploading..." : "Drop Statement Here"}
            </h3>
            <p className="text-white/40 font-medium">
              Supports .csv, .xlsx (Bank or Credit Card)
            </p>
          </div>
        </div>

        {/* Background Glow */}
        <div
          className={cn(
            "absolute inset-0 rounded-3xl bg-indigo-500/20 blur-3xl transition-opacity duration-500 pointer-events-none",
            isDragActive ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Result Toast */}
      {result && (
        <div
          className={cn(
            "mt-4 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
            result.success
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20",
          )}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{result.message}</span>
        </div>
      )}
    </div>
  );
}
