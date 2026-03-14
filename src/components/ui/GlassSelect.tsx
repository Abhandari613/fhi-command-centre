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
  disabled = false,
}: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    <div className={`relative ${className || ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
                    w-full flex items-center justify-between text-left
                    bg-[#111113] border border-white/[0.06] rounded-lg p-3 text-sm
                    focus:outline-none focus:border-primary/40 transition-all duration-200
                    shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset,0_2px_4px_-1px_rgba(0,0,0,0.4)]
                    ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[#161618] hover:border-white/[0.1]"}
                    ${!value ? "text-gray-500" : "text-white"}
                `}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute z-50 w-full mt-1 overflow-hidden bg-[#111113] border border-white/[0.08] rounded-lg shadow-[0_8px_32px_-4px_rgba(0,0,0,0.8)]"
          >
            <div className="max-h-60 overflow-auto py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                                        w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-all duration-150
                                        ${
                                          value === option.value
                                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                                            : "text-gray-400 hover:bg-white/[0.03] hover:text-white border-l-2 border-transparent"
                                        }
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
