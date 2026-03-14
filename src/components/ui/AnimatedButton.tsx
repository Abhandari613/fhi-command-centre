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
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] border border-primary/50",
        secondary: "bg-[#141419]/65 hover:bg-[#1e1e24]/75 text-white border border-white/10 backdrop-blur-md shadow-lg",
        danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20",
        ghost: "hover:bg-white/5 text-gray-300 hover:text-white",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-lg",
        icon: "h-10 w-10 p-0 flex items-center justify-center",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "relative rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none",
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
