"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Briefcase, Calendar, MapPin, User, ArrowRight, AlertCircle, Mic } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { ReviewDraftModal } from "./ReviewDraftModal";

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & { clients?: { name: string } | null };

// Temporary type since we haven't generated the exact Supabase types yet.
type Draft = any;

export function WorkOrderList() {
    const supabase = createClient();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'review' | 'active' | 'completed' | 'all'>('active');
    const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);

    const fetchData = async () => {
        setLoading(true);
        if (filter === 'review') {
            const { data, error } = await supabase
                .from('work_order_drafts')
                .select('*')
                .eq('status', 'needs_review')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setDrafts(data);
            }
        } else {
            let query = supabase
                .from('work_orders')
                .select('*, clients(name)')
                .order('created_at', { ascending: false });

            if (filter === 'active') {
                query = query.in('status', ['Scheduled', 'In Progress', 'Unassigned']);
            } else if (filter === 'completed') {
                query = query.eq('status', 'Completed');
            }

            const { data, error } = await query;
            if (!error && data) {
                setWorkOrders(data as WorkOrder[]);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, supabase]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Filter Tabs */}
            <div className="flex p-1 bg-black/20 rounded-xl overflow-x-auto hide-scrollbar">
                {(['review', 'active', 'completed', 'all'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "flex-1 py-2 px-3 min-w-[80px] text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                            filter === f ? "bg-primary text-white shadow-lg" : "text-white/50 hover:text-white/80",
                            f === 'review' && filter !== 'review' && "text-brand-primary/80"
                        )}
                    >
                        {f === 'review' ? (
                            <div className="flex items-center justify-center gap-1.5">
                                Needs Review
                            </div>
                        ) : f}
                    </button>
                ))}
            </div>

            {filter === 'review' ? (
                // DRAFTS VIEW
                drafts.length === 0 ? (
                    <div className="text-center opacity-50 py-10 flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 opacity-30" />
                        <p>No work orders need review.</p>
                        <p className="text-sm">Speak a new one using the mic button below.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {drafts.map((draft) => {
                            const data = draft.extracted_data || {};
                            const hasIssues = data.needs_clarification || (data.missing_details && data.missing_details.length > 0);

                            return (
                                <GlassCard
                                    key={draft.id}
                                    className="p-5 flex flex-col gap-4 group hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden"
                                    onClick={() => setSelectedDraft(draft)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight mb-1">
                                                {data.property_address_or_unit || "Unknown Location"}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs opacity-60">
                                                <User className="w-3 h-3" />
                                                <span>{data.client_name || "Unknown Client"}</span>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider",
                                            hasIssues ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                                        )}>
                                            {hasIssues ? "Needs Clarification" : "Ready"}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2 text-sm opacity-80">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-primary" />
                                            <span className="truncate">{data.trade_type || "General"}</span>
                                        </div>
                                        <div className="text-xs italic opacity-70 border-l-2 border-white/20 pl-3 mt-1 line-clamp-2">
                                            "{draft.raw_content}"
                                        </div>
                                    </div>

                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                                        <span className="text-xs font-semibold flex items-center gap-1">Review <ArrowRight className="w-4 h-4" /></span>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )
            ) : (
                // WORK ORDERS VIEW
                workOrders.length === 0 ? (
                    <div className="text-center opacity-50 py-10 flex flex-col items-center gap-4">
                        <Briefcase className="w-12 h-12 opacity-30" />
                        <p>No work orders found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {workOrders.map((wo) => (
                            <GlassCard key={wo.id} className="p-5 flex flex-col gap-4 group hover:bg-white/5 transition-colors relative overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight mb-1">{wo.property_address_or_unit}</h3>
                                        <div className="flex items-center gap-2 text-xs opacity-60">
                                            <User className="w-3 h-3" />
                                            <span>{wo.clients?.name || "Unknown Property"}</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider",
                                        wo.status === 'Completed' ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                                    )}>
                                        {wo.status}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 text-sm opacity-80">
                                    {wo.start_date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            <span>
                                                {new Date(wo.start_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <span className="truncate">{wo.property_address_or_unit}</span>
                                    </div>
                                </div>

                                <Link href={`/ops/work-orders/${wo.id}`} className="absolute inset-0" />

                                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-5 h-5 text-primary" />
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )
            )}

            <ReviewDraftModal
                draft={selectedDraft}
                onClose={() => {
                    setSelectedDraft(null);
                    fetchData(); // Refresh the list
                }}
            />
        </div>
    );
}
