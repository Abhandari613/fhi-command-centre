'use client';

import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { runAutoCategorization } from '@/app/actions/finance';
import { cn } from '@/lib/utils';

export function AutoCategorizeButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleRun = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const { count } = await runAutoCategorization();
            if (count > 0) {
                setResult(`Auto-categorized ${count} transactions!`);
            } else {
                setResult("No new matches found.");
            }

            // Clear result after 3 seconds
            setTimeout(() => setResult(null), 3000);
        } catch (err) {
            console.error("Auto-categorization failed", err);
            setResult("Failed to run.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleRun}
                disabled={isLoading}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    isLoading
                        ? "bg-white/5 text-white/40 cursor-wait"
                        : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                )}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Wand2 className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Running...' : 'Auto-Categorize'}</span>
            </button>

            {result && (
                <div className="absolute top-full mt-2 right-0 bg-zinc-900 border border-white/10 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap animate-in slide-in-from-top-2 fade-in shadow-xl z-50">
                    {result}
                </div>
            )}
        </div>
    );
}
