"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  intensity?: "normal" | "bright" | "panel" | "solid";
}

export function GlassCard({ children, className, intensity = "normal", ...props }: GlassCardProps) {
  const intensityClass = {
    normal: "glass",
    bright: "glass-bright",
    panel: "glass-panel",
    solid: "glass-solid",
  }[intensity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        intensityClass,
        "rounded-lg border border-white/[0.06] shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
