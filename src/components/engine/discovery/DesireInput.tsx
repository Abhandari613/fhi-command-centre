'use client';

import { useState } from 'react';
import { createDesire } from '@/app/actions/engine/desire-actions';
import { GlassCard } from '@/components/ui/GlassCard';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

interface DesireInputProps {
    engagementId: string;
    existingDesires: any[]; // Replace with proper type from Supabase
}

export function DesireInput({ engagementId, existingDesires }: DesireInputProps) {
    const [statement, setStatement] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statement.trim()) return;

        setIsSubmitting(true);
        try {
            await createDesire(engagementId, statement);
            setStatement('');
            router.refresh();
        } catch (error) {
            console.error('Failed to create desire', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-4">
            <h3 className="text-xl font-bold text-white/90">Owner Desires</h3>

            <GlassCard className="p-4">
                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            placeholder="What does the owner want? (e.g. 'Spend less time on invoices')"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !statement.trim()}
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>

                </form>
                <div className="mt-4 flex justify-center">
                    <VoiceRecorder
                        onTranscriptionComplete={(text) => setStatement((prev) => prev ? `${prev} ${text}` : text)}
                    />
                </div>
            </GlassCard>

            <div className="grid gap-3">
                {existingDesires.length === 0 && (
                    <p className="text-white/40 text-sm italic text-center py-4">No desires captured yet.</p>
                )}
                {existingDesires.map((desire) => (
                    <GlassCard key={desire.id} className="p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-amber-400/80" />
                        <div>
                            <p className="text-white/90">{desire.raw_statement}</p>
                            <span className="text-xs text-white/40">{new Date(desire.created_at).toLocaleDateString()}</span>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </section>
    );
}
