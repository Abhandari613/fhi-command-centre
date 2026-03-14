"use client";

import { motion } from "framer-motion";

interface TickerItem {
  label: string;
  value: string;
  color?: string;
  pulse?: boolean;
}

interface TickerStripProps {
  items: TickerItem[];
}

export function TickerStrip({ items }: TickerStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1"
    >
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-1 shrink-0">
          {i > 0 && (
            <span className="text-white/10 mx-1 text-xs select-none">|</span>
          )}
          <span className="text-[9px] uppercase tracking-[0.12em] text-white/30 font-medium">
            {item.label}
          </span>
          <span
            className={`text-xs font-mono font-black tabular-nums ${
              item.color || "text-white"
            } ${item.pulse ? "animate-pulse" : ""}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
