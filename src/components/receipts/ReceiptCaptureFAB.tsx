"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { quickCaptureReceipt } from "@/app/actions/receipt-capture-actions";
import { toast } from "sonner";

export function ReceiptCaptureFAB() {
  const [capturing, setCapturing] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTap = () => {
    setShowPulse(false);
    fileInputRef.current?.click();
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturing(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Fire quick capture (uploads + triggers background OCR)
      const result = await quickCaptureReceipt({
        fileBase64: base64,
        fileName: file.name || `receipt_${Date.now()}.jpg`,
      });

      if (result.success) {
        toast.success("Receipt captured", {
          description: "Processing in background...",
          duration: 2000,
        });
      } else {
        toast.error("Capture failed", {
          description: result.error || "Try again",
        });
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Hidden file input — camera only */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileCapture}
      />

      {/* FAB */}
      <div className="fixed bottom-28 right-4 z-[60] max-w-lg mx-auto">
        <motion.button
          onClick={handleTap}
          disabled={capturing}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-b from-primary to-[#e05e00] shadow-[0_4px_20px_-2px_rgba(255,107,0,0.5),0_1px_0_0_rgba(255,255,255,0.1)_inset] border border-primary/50 active:shadow-[0_2px_8px_-2px_rgba(255,107,0,0.3)] transition-shadow disabled:opacity-60"
        >
          {/* Pulse animation on first load */}
          <AnimatePresence>
            {showPulse && (
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: 3,
                  ease: "easeOut",
                }}
                className="absolute inset-0 rounded-full bg-primary/30"
              />
            )}
          </AnimatePresence>

          {capturing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Camera className="w-6 h-6 text-white" strokeWidth={2.5} />
          )}
        </motion.button>
      </div>
    </>
  );
}
