'use client';

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { CompoundingCurve } from "./charts/CompoundingCurve";
import { getReliefDashboardData } from "@/app/actions/engine/dashboard-actions";
import { format } from "date-fns";

export function ReliefDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getReliefDashboardData();
                setData(result);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin w-8 h-8 opacity-50" />
            </div>
        );
    }

    if (!data?.engagement) {
        return (
            <GlassCard className="p-8 text-center opacity-60">
                <h2 className="text-xl font-bold">No Active Engagement</h2>
                <p>Please start an engagement to see relief metrics.</p>
            </GlassCard>
        );
    }

    // Process data for Compounding Curve
    // Strategy: Find the first "Relief" metric (e.g. Time or Money) and plot it
    const primaryMetric = data.metrics.find((m: any) => m.metric_type === 'time' || m.metric_type === 'financial') || data.metrics[0];

    const chartData = primaryMetric ? data.snapshots
        .filter((s: any) => s.relief_metric_id === primaryMetric.id)
        .map((s: any) => ({
            date: format(new Date(s.measured_at), 'MMM d'),
            baseline: primaryMetric.baseline_value,
            actual: s.measured_value,
            // Simple linear projection for fun
            projected: s.measured_value * 1.1
        })) : [];

    // Calculate totals
    const totalTimeSaved = data.metrics
        .filter((m: any) => m.metric_type === 'time')
        .reduce((acc: number, m: any) => {
            const latestSnapshot = data.snapshots
                .filter((s: any) => s.relief_metric_id === m.id)
                .sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
            return acc + (latestSnapshot ? latestSnapshot.measured_value : 0);
        }, 0);

    const activeFrictions = data.frictions.length;
    const resolvedFrictionsCount = 0; // We define this if we fetch resolved count

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Relief Dashboard</h2>
                    <p className="opacity-70">Tracking value delivery for {data.engagement.client_name}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm opacity-50 uppercase tracking-wider">Phase</div>
                    <div className="font-bold text-emerald-400">{data.engagement.phase}</div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Key Metrics Cards */}
                <GlassCard className="p-6 flex flex-col justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-wider opacity-60">Time Reclaimed</span>
                        <div className="flex items-end gap-2 mt-2">
                            <span className="text-4xl font-bold">{totalTimeSaved}h</span>
                            <span className="text-sm mb-1 text-emerald-400 flex items-center bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {totalTimeSaved > 0 ? '+12%' : '0%'}
                            </span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-between">
                    <div>
                        <span className="text-xs uppercase tracking-wider opacity-60">Active Frictions</span>
                        <div className="flex items-end gap-2 mt-2">
                            <span className="text-4xl font-bold text-amber-500">{activeFrictions}</span>
                            <span className="text-sm mb-1 opacity-50">Issues</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 flex flex-col justify-between bg-primary/5 border-primary/20">
                    <div>
                        <span className="text-xs uppercase tracking-wider opacity-60 text-primary">Next Calibration</span>
                        <div className="flex items-end gap-2 mt-2">
                            <span className="text-2xl font-bold">Friday</span>
                            <span className="text-sm mb-1 opacity-50">9:00 AM</span>
                        </div>
                    </div>
                    <button className="mt-4 text-xs bg-primary text-black font-bold py-2 px-4 rounded hover:opacity-90 transition-opacity w-full" onClick={() => window.location.href = '/engine/calibrate'}>
                        Start Session now
                    </button>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Curve Chart */}
                <div className="lg:col-span-2">
                    <CompoundingCurve data={chartData} className="h-full" />
                </div>

                {/* Lists */}
                <div className="space-y-6">
                    <section>
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider opacity-80">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Top Frictions
                        </h3>
                        <div className="space-y-3">
                            {data.frictions.length === 0 ? (
                                <GlassCard className="p-4 text-center opacity-60 text-sm">No active friction.</GlassCard>
                            ) : (
                                data.frictions.map((f: any) => (
                                    <GlassCard key={f.id} className="p-4 border-l-4 border-l-amber-500 flex justify-between items-start gap-3">
                                        <div>
                                            <div className="font-medium text-sm">{f.description}</div>
                                            <div className="text-xs opacity-50 mt-1 capitalize">{f.severity} Severity</div>
                                        </div>
                                    </GlassCard>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Metric Details Table */}
            <section className="mt-8">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider opacity-80">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Metric Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.metrics.map((m: any) => {
                        const latest = data.snapshots
                            .filter((s: any) => s.relief_metric_id === m.id)
                            .sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];

                        return (
                            <GlassCard key={m.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold">{m.name}</span>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded uppercase">{m.unit}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs opacity-50">
                                        Target: {m.target_value}
                                    </div>
                                    <div className="text-xl font-bold text-emerald-400">
                                        {latest?.measured_value || 0}
                                    </div>
                                </div>
                                <div className="mt-2 text-xs opacity-30 text-right">
                                    Baseline: {m.baseline_value}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
