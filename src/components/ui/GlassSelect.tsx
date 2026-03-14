"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
}

interface GlassSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function GlassSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    disabled = false
}: GlassSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between text-left
                    bg-black/20 border border-white/10 rounded-lg p-3 text-sm
                    focus:outline-none focus:border-primary/50 transition-colors
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
                    ${!value ? 'text-white/30' : 'text-white'}
                `}
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown
                    className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 overflow-hidden bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl ring-1 ring-black/5"
                    >
                        <div className="max-h-60 overflow-auto py-1">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors
                                        ${value === option.value
                                            ? 'bg-primary/20 text-primary font-medium'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                                    `}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {value === option.value && (
                                        <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
