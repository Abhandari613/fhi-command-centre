'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft, ArrowRight, CheckCircle, Copy, Download, Zap } from 'lucide-react';
import Link from 'next/link';

interface ProposalGeneratorProps {
    engagement: any;
    desires: any[];
    interventions: any[];
}

export function ProposalGenerator({ engagement, desires, interventions }: ProposalGeneratorProps) {
    const totalValue = interventions.reduce((sum, i) => sum + (i.projected_monthly_value || 0), 0);
    const totalHours = interventions.reduce((sum, i) => sum + (i.projected_weekly_hours_saved || 0), 0);

    // Group interventions by type
    const interventionsByType = interventions.reduce((acc, i) => {
        acc[i.type] = acc[i.type] || [];
        acc[i.type].push(i);
        return acc;
    }, {} as Record<string, typeof interventions>);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <header className="flex items-center justify-between print:hidden">
                <Link href="/engine/translate" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Translation
                </Link>
                <div className="flex gap-2">
                    <button className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors">
                        <Copy className="w-4 h-4" />
                        Copy Link
                    </button>
                    <button className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </header>

            <GlassCard className="p-12 space-y-12 bg-black/40 border-white/5 print:border-none print:shadow-none print:text-black">
                {/* Proposal Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs uppercase tracking-wider mb-4">
                        Strategic Proposal
                    </div>
                    <h1 className="text-4xl font-bold text-white">Operational Transformation Plan</h1>
                    <p className="text-xl text-white/60">Prepared for {engagement.client_name}</p>
                </div>

                {/* Executive Summary / Value Proposition */}
                <section className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400" />
                            Projected Impact
                        </h3>
                        <p className="text-white/70 leading-relaxed">
                            Based on our discovery session, we have identified key operational frictions limiting your growth.
                            This proposal outlines a strategic intervention plan designed to reclaim time and unlock revenue potential.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-bold text-emerald-400">${totalValue.toLocaleString()}</span>
                            <span className="text-xs uppercase tracking-wider text-white/40 mt-1">Monthly Value</span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-bold text-blue-400">{totalHours}h</span>
                            <span className="text-xs uppercase tracking-wider text-white/40 mt-1">Weekly Hours Saved</span>
                        </div>
                    </div>
                </section>

                {/* Owner Desires Recap */}
                <section className="space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Understanding Your Vision</h3>
                    <div className="grid gap-4">
                        {desires.map((desire) => (
                            <div key={desire.id} className="flex gap-4">
                                <div className="mt-1 min-w-6 flex justify-center">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-lg text-white/90 italic">"{desire.raw_statement}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Strategic Interventions */}
                <section className="space-y-8">
                    <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Strategic Roadmap</h3>

                    {Object.keys(interventionsByType).length === 0 && (
                        <p className="text-white/40 italic">No interventions mapped yet.</p>
                    )}

                    {(Object.entries(interventionsByType) as [string, any[]][]).map(([type, items]) => (
                        <div key={type} className="space-y-4">
                            <h4 className="text-lg font-semibold text-white/80 capitalize flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                {type.replace('_', ' ')}
                            </h4>
                            <div className="grid gap-4 pl-4 border-l border-white/10 ml-1">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-white/5 rounded-lg p-5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-white">{item.name}</h5>
                                            <span className="text-xs bg-black/20 px-2 py-1 rounded text-white/40">Phase {item.phase || 1}</span>
                                        </div>
                                        <p className="text-white/70 text-sm mb-4">{item.description}</p>

                                        <div className="flex gap-4 text-xs">
                                            {item.estimated_build_hours && (
                                                <span className="text-white/50">Est. Time: <span className="text-white">{item.estimated_build_hours}h</span></span>
                                            )}
                                            {item.estimated_build_cost && (
                                                <span className="text-white/50">Est. Cost: <span className="text-white">${item.estimated_build_cost}</span></span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                {/* Footer / Call to Action */}
                <div className="pt-8 border-t border-white/10 text-center">
                    <p className="text-white/40 text-sm">Generated by Frank Home Improvement Outcome Engine</p>
                </div>
            </GlassCard>
        </div>
    );
}
