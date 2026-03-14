"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
    children?: React.ReactNode;
}

export function AnimatedButton({
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading,
    ...props
}: AnimatedButtonProps) {
    const variants = {
        primary: [
            "bg-gradient-to-b from-primary to-[#e05e00]",
            "text-white font-semibold",
            "border border-primary/40",
            "shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_4px_12px_-2px_rgba(255,107,0,0.4)]",
            "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_6px_20px_-2px_rgba(255,107,0,0.5)]",
            "hover:from-[#ff7a1a] hover:to-primary",
            "active:shadow-[0_1px_3px_0_rgba(0,0,0,0.4)_inset]",
            "active:from-[#e05e00] active:to-[#cc5500]",
        ].join(" "),
        secondary: [
            "bg-[#0e0e10]/90 hover:bg-[#141416]/95",
            "backdrop-blur-sm",
            "text-gray-200 hover:text-white",
            "border border-white/[0.06] hover:border-white/[0.10]",
            "shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_4px_16px_-2px_rgba(0,0,0,0.6)]",
            "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_6px_20px_-2px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,107,0,0.06)]",
        ].join(" "),
        danger: [
            "bg-red-950/50 hover:bg-red-900/50",
            "text-red-400 hover:text-red-300",
            "border border-red-500/20 hover:border-red-500/40",
            "shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]",
        ].join(" "),
        ghost: [
            "hover:bg-white/[0.04]",
            "text-gray-400 hover:text-white",
            "border border-transparent",
        ].join(" "),
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0 flex items-center justify-center",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
                "relative rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
                "disabled:opacity-40 disabled:pointer-events-none disabled:saturate-0",
                "cursor-pointer select-none",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </motion.button>
    );
}
