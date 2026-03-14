"use client";

import Image from "next/image";

const SLIDESHOW_IMAGES = [
  "/backgrounds/trailboss-1.jpg",
  "/backgrounds/trailboss-2.jpg",
  "/backgrounds/trailboss-3.jpg",
];

const CYCLE_DURATION = 24; // seconds for full cycle (3 images × 8s each)

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* === LAYER 1: Photo Slideshow === */}
      <div className="absolute inset-0 opacity-60">
        {SLIDESHOW_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0"
            style={{
              animation: `bgFade ${CYCLE_DURATION}s ease-in-out infinite`,
              animationDelay: `${i * (CYCLE_DURATION / SLIDESHOW_IMAGES.length)}s`,
              opacity: i === 0 ? undefined : 0,
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover grayscale-[40%] sepia-[0.3] hue-rotate-[15deg] brightness-75 saturate-[0.8]"
              sizes="100vw"
              priority={i === 0}
              quality={60}
            />
          </div>
        ))}
      </div>

      {/* === LAYER 2: Obsidian overlay with mix-blend === */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{ backgroundColor: "rgba(10, 10, 10, 0.75)" }}
      />
      {/* Gradient: fade top/bottom to pure obsidian */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/90" />
      {/* Subtle ember color wash */}
      <div className="absolute inset-0 bg-[#ff6b00]/[0.03] mix-blend-overlay" />

      {/* === LAYER 3: Existing ember glow orbs === */}
      <div className="ember-glow bg-primary top-[-150px] left-[-100px] animate-[ember-pulse_4s_ease-in-out_infinite]" />
      <div className="ember-glow bg-orange-900/50 bottom-[-200px] right-[-150px] animate-[ember-pulse_5s_ease-in-out_infinite_1s]" />

      {/* === LAYER 4: Chrome trim line === */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}
