'use client';

import { useState } from 'react';
import { createFriction } from '@/app/actions/engine/friction-actions';
import { GlassCard } from '@/components/ui/GlassCard';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FrictionListProps {
    engagementId: string;
    existingFriction: any[]; // Replace with proper type
}

export function FrictionList({ engagementId, existingFriction }: FrictionListProps) {
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setIsSubmitting(true);
        try {
            await createFriction(engagementId, description, severity);
            setDescription('');
            setSeverity('medium');
            router.refresh();
        } catch (error) {
            console.error('Failed to create friction item', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSeverityColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-blue-400 bg-blue-400/10';
            case 'medium': return 'text-amber-400 bg-amber-400/10';
            case 'high': return 'text-orange-500 bg-orange-500/10';
            case 'critical': return 'text-red-500 bg-red-500/10';
            default: return 'text-white/50 bg-white/5';
        }
    };

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white/90">Friction Points</h3>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/60">
                    {existingFriction.length} Items
                </span>
            </header>

            <GlassCard className="p-4">
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the friction (e.g. 'Double entry of data in QBO')"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                    />
                    <div className="flex items-center gap-2">
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value as any)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="low">Low Impact</option>
                            <option value="medium">Medium Impact</option>
                            <option value="high">High Impact</option>
                            <option value="critical">Critical</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isSubmitting || !description.trim()}
                            className="ml-auto bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Friction
                        </button>
                    </div>
                </form>
            </GlassCard>

            <div className="grid gap-3">
                {existingFriction.length === 0 && (
                    <p className="text-white/40 text-sm italic text-center py-4">No friction points identified yet.</p>
                )}
                {existingFriction.map((item) => (
                    <GlassCard key={item.id} className="p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${getSeverityColor(item.risk_impact > 7 ? 'critical' : 'medium').split(' ')[0]}`} />
                        <div className="flex-1">
                            <p className="text-white/90">{item.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${getSeverityColor(item.severity || 'medium')}`}>
                                    {item.severity || 'Medium'}
                                </span>
                                <span className="text-xs text-white/40">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </section>
    );
}
