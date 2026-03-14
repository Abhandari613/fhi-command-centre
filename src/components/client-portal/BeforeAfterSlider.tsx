"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { UnfoldHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    className?: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage, className }: BeforeAfterSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;

        setSliderPosition(percentage);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;
        handleMove(e.touches[0].clientX);
    }, [isDragging, handleMove]);

    const onMouseDown = useCallback(() => setIsDragging(true), []);
    const onTouchStart = useCallback(() => setIsDragging(true), []);
    const onMouseUp = useCallback(() => setIsDragging(false), []);
    const onTouchEnd = useCallback(() => setIsDragging(false), []);

    useEffect(() => {
        document.addEventListener("mouseup", onMouseUp as any);
        document.addEventListener("touchend", onTouchEnd as any);

        return () => {
            document.removeEventListener("mouseup", onMouseUp as any);
            document.removeEventListener("touchend", onTouchEnd as any);
        };
    }, [onMouseUp, onTouchEnd]);

    return (
        <div
            ref={containerRef}
            className={cn("relative w-full aspect-video overflow-hidden rounded-2xl select-none cursor-ew-resize", className)}
            onMouseMove={onMouseMove}
            onTouchMove={onTouchMove}
            onMouseDown={(e) => {
                setIsDragging(true);
                handleMove(e.clientX);
            }}
            onTouchStart={(e) => {
                setIsDragging(true);
                handleMove(e.touches[0].clientX);
            }}
        >
            {/* After Image (Background) */}
            <div className="absolute inset-0 w-full h-full">
                <Image
                    src={afterImage}
                    alt="After"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-md">
                    AFTER
                </div>
            </div>

            {/* Before Image (Foreground - Clipped) */}
            <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <Image
                    src={beforeImage}
                    alt="Before"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute top-4 left-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-md">
                    BEFORE
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-shadow"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <UnfoldHorizontal className="w-4 h-4 text-black" />
                </div>
            </div>
        </div>
    );
}
