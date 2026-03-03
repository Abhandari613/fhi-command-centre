"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Loader2, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCalibrationCycle } from "@/app/actions/engine/calibration-actions";
import { getReliefMetrics, createMetricSnapshot } from "@/app/actions/engine/metric-actions";
import { getFrictionItems, updateFrictionStatus } from "@/app/actions/engine/friction-actions";

type Step = 'intro' | 'metrics' | 'frictions' | 'plan' | 'summary';

export function CalibrationWizard({ engagementId }: { engagementId: string }) {
    const [step, setStep] = useState<Step>('intro');
    const [loading, setLoading] = useState(false);
    const [cycleId, setCycleId] = useState<string | null>(null);

    const handleStart = () => setStep('metrics');

    const handleMetricsComplete = () => setStep('frictions');

    const handleFrictionsComplete = () => setStep('plan');

    const handlePlanComplete = async () => {
        setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const cycle = await createCalibrationCycle(engagementId, startDate.toISOString(), new Date().toISOString());
            if (cycle) {
                setCycleId(cycle.id);
                setStep('summary');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save calibration cycle");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
                {step === 'intro' && (
                    <IntroStep onStart={handleStart} key="intro" />
                )}
                {step === 'metrics' && (
                    <MetricsStep onNext={handleMetricsComplete} engagementId={engagementId} key="metrics" />
                )}
                {step === 'frictions' && (
                    <FrictionStep onNext={handleFrictionsComplete} engagementId={engagementId} key="frictions" />
                )}
                {step === 'plan' && (
                    <PlanStep onNext={handlePlanComplete} loading={loading} key="plan" />
                )}
                {step === 'summary' && (
                    <SummaryStep cycleId={cycleId} key="summary" />
                )}
            </AnimatePresence>
        </div>
    );
}

function IntroStep({ onStart }: { onStart: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard className="p-12 text-center space-y-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Weekly Calibration</h2>
                <p className="text-lg opacity-70 max-w-lg mx-auto">
                    Time to review your progress. We'll check your relief metrics, review resolved frictions, and plan the next set of interventions.
                </p>
                <AnimatedButton size="lg" onClick={onStart} className="mt-8">
                    Start Session <ArrowRight className="ml-2 w-5 h-5" />
                </AnimatedButton>
            </GlassCard>
        </motion.div>
    );
}

function MetricsStep({ onNext, engagementId }: { onNext: () => void, engagementId: string }) {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [snapshots, setSnapshots] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getReliefMetrics(engagementId).then(data => {
            setMetrics(data || []);
            setLoading(false);
        });
    }, [engagementId]);

    const handleNext = async () => {
        setSaving(true);
        const promises = Object.entries(snapshots).map(([metricId, value]) =>
            createMetricSnapshot(metricId, engagementId, value)
        );
        await Promise.all(promises);
        setSaving(false);
        onNext();
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-4">Step 1: Metric Review</h3>
                <p className="opacity-60 mb-8">Update your key relief metrics for this week.</p>

                <div className="space-y-4 mb-8">
                    {metrics.length === 0 ? (
                        <div className="p-4 border border-white/10 rounded-lg text-center opacity-50">No metrics defined yet.</div>
                    ) : (
                        metrics.map(metric => (
                            <div key={metric.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <div className="font-bold">{metric.name}</div>
                                    <div className="text-xs opacity-50 uppercase">{metric.unit}</div>
                                </div>
                                <input
                                    type="number"
                                    className="bg-black/20 border border-white/10 rounded px-3 py-2 w-32 text-right"
                                    placeholder="Value"
                                    onChange={(e) => setSnapshots(prev => ({ ...prev, [metric.id]: parseFloat(e.target.value) }))}
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end">
                    <AnimatedButton onClick={handleNext} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                        Next: Review Frictions
                    </AnimatedButton>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function FrictionStep({ onNext, engagementId }: { onNext: () => void, engagementId: string }) {
    const [frictions, setFrictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFrictionItems(engagementId).then(data => {
            setFrictions(data || []);
            setLoading(false);
        });
    }, [engagementId]);

    const toggleResolved = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'resolved' ? 'analyzed' : 'resolved';
        // Optimistic update
        setFrictions(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));

        await updateFrictionStatus(id, newStatus);
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-4">Step 2: Friction Review</h3>
                <p className="opacity-60 mb-8">Mark any frictions you've resolved this past week.</p>

                <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {frictions.length === 0 ? (
                        <div className="p-4 border border-white/10 rounded-lg text-center opacity-50">No frictions recorded.</div>
                    ) : (
                        frictions.map(item => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${item.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                onClick={() => toggleResolved(item.id, item.status)}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${item.status === 'resolved' ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                                    {item.status === 'resolved' && <CheckCircle className="w-4 h-4 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className={item.status === 'resolved' ? 'line-through opacity-50' : ''}>{item.description}</div>
                                    <div className="text-xs opacity-40 mt-1 uppercase">{item.severity}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end">
                    <AnimatedButton onClick={onNext}>Next: Plan Week</AnimatedButton>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function PlanStep({ onNext, loading }: { onNext: () => void, loading: boolean }) {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-4">Step 3: Plan Next Interventions</h3>
                <p className="opacity-60 mb-8">Select the top 3 interventions to focus on this week.</p>

                <div className="p-12 border border-dashed border-white/10 rounded-xl text-center mb-8">
                    <span className="opacity-50">Intervention selection will go here...</span>
                </div>

                <div className="flex justify-end">
                    <AnimatedButton onClick={onNext} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Complete Calibration
                    </AnimatedButton>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function SummaryStep({ cycleId }: { cycleId: string | null }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Calibration Complete!</h2>
                <p className="opacity-60 mb-8">Your progress has been recorded. See you next week.</p>
                <div className="text-xs opacity-30 font-mono mb-8">Cycle ID: {cycleId}</div>

                <AnimatedButton variant="secondary" onClick={() => window.location.href = '/engine/dashboard'}>
                    Go to Dashboard
                </AnimatedButton>
            </GlassCard>
        </motion.div>
    );
}
