"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

interface CompoundingCurveProps {
  data: {
    date: string;
    baseline: number;
    actual: number;
    projected?: number;
  }[];
  className?: string;
}

export function CompoundingCurve({ data, className }: CompoundingCurveProps) {
  if (!data || data.length === 0) {
    return (
      <GlassCard
        className={`p-6 flex items-center justify-center min-h-[300px] ${className}`}
      >
        <p className="opacity-50">No data available for projection.</p>
      </GlassCard>
    );
  }

  // Calculations for scaling
  const maxValue =
    Math.max(
      ...data.map((d) => Math.max(d.baseline, d.actual, d.projected || 0)),
    ) * 1.1;
  const height = 300;
  const width = 600; // ViewBox width, not pixel width
  const padding = 40;

  const xScale = (index: number) =>
    padding + (index / (data.length - 1)) * (width - 2 * padding);
  const yScale = (value: number) =>
    height - padding - (value / maxValue) * (height - 2 * padding);

  // Generate paths
  const baselinePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.baseline)}`)
    .join(" ");
  const actualPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.actual)}`)
    .join(" ");

  return (
    <GlassCard className={`p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-2">Compounding Value</h3>
      <p className="text-sm opacity-60 mb-6">
        Visualizing the gap between the old way and the new operations.
      </p>

      <div className="w-full relative aspect-[2/1] overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <g key={i}>
              <line
                x1={padding}
                y1={height - padding - tick * (height - 2 * padding)}
                x2={width - padding}
                y2={height - padding - tick * (height - 2 * padding)}
                stroke="white"
                strokeOpacity={0.05}
              />
              <text
                x={padding - 10}
                y={height - padding - tick * (height - 2 * padding)}
                fill="white"
                opacity={0.3}
                fontSize={10}
                textAnchor="end"
                alignmentBaseline="middle"
              >
                {Math.round(tick * maxValue)}
              </text>
            </g>
          ))}

          {/* Area under actual (gradient) */}
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${actualPath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#actualGradient)"
          />

          {/* Baseline Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d={baselinePath}
            fill="none"
            stroke="white"
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="4 4"
          />

          {/* Actual Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
            d={actualPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
          />

          {/* Dots */}
          {data.map((d, i) => (
            <g key={i}>
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 + i * 0.1 }}
                cx={xScale(i)}
                cy={yScale(d.actual)}
                r={4}
                fill="#10b981"
                stroke="#1e1e1e"
                strokeWidth={2}
              />
              {/* Tooltip trigger area could go here */}
            </g>
          ))}
        </svg>

        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="opacity-80">Actual Value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-white/30" />
            <span className="opacity-50">Baseline</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
