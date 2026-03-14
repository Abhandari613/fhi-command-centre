"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { logJobEvent } from "@/app/actions/event-actions";
import { ArrowLeft, Loader2, Briefcase, Printer, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AssignSubModal } from "@/components/work-orders/AssignSubModal";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { PaymentList } from "@/components/payments/PaymentList";
import { JobPhotoGallery } from "@/components/work-orders/JobPhotoGallery";
import { motion } from "framer-motion";
import { User, Phone } from "lucide-react";

// TODO: Sync Supabase types to include work_orders/work_order_tasks tables
type WorkOrderRow = any;
type ClientRow = any;
type WorkOrderTaskRow = any;

type WorkOrderWithDetails = WorkOrderRow & {
    clients: ClientRow | null;
    work_order_tasks: WorkOrderTaskRow[];
};

export default function WorkOrderDetailsPage() {
    const supabase = createClient();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [workOrder, setWorkOrder] = useState<WorkOrderWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);

    const [photos, setPhotos] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    const fetchPhotos = useCallback(async () => {
        // Reuse job_photos tied by job_id=wo.id
        const { data } = await supabase
            .from('job_photos')
            .select('*')
            .eq('job_id', id)
            .order('created_at', { ascending: false });
        setPhotos(data || []);
    }, [supabase, id]);

    const fetchPayments = useCallback(async () => {
        // Transactions matched to this work_order
        const { data } = await supabase
            .from('finance_transactions')
            .select('*')
            .eq('work_order_id', id)
            .order('transaction_date', { ascending: false });
        setPayments(data || []);
    }, [supabase, id]);

    useEffect(() => {
        const fetchWorkOrder = async () => {
            const { data, error } = await (supabase.from as any)('work_orders')
                .select('*, clients(*), work_order_tasks(*, subcontractors(*))')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching work order:", error);
            } else {
                setWorkOrder(data as unknown as WorkOrderWithDetails);
            }

            // Events (Reusing job_events as work_order_events for now)
            const { data: eventsData } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', id)
                .order('created_at', { ascending: false });

            setEvents(eventsData || []);
            setLoading(false);
        };

        if (id) {
            fetchWorkOrder();
            fetchPayments();
            fetchPhotos();
        }
    }, [id, supabase, fetchPayments, fetchPhotos]);

    const calculateTotal = () => {
        return workOrder?.work_order_tasks?.reduce((sum: number, item: WorkOrderTaskRow) => sum + (item.cost_estimate || 0), 0) || 0;
    };

    const calculatePaid = () => {
        return payments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
    };

    const handleUpdateStatus = async (status: string) => {
        const { error } = await (supabase.from as any)('work_orders').update({ status }).eq('id', id);
        if (!error && workOrder) {
            setWorkOrder({ ...workOrder, status });
        }
    };

    if (loading) return <div className="flex justify-center p-8 h-screen items-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (!workOrder) return <div className="p-8 text-center text-xl font-bold opacity-50">Work Order not found</div>;

    return (
        <div className="relative min-h-screen pb-24 overflow-hidden">
            <div className="aurora-blur bg-primary/20 top-[-50px] left-[-50px]" />

            <div className="p-6 flex flex-col gap-6 relative z-10">
                <header className="flex items-center gap-4">
                    <Link href="/ops/work-orders">
                        <AnimatedButton variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </AnimatedButton>
                    </Link>
                    <div className="flex-1 overflow-hidden">
                        <h1 className="text-xl font-black tracking-tight truncate">{workOrder.property_address_or_unit}</h1>
                        <div className="flex items-center gap-2 text-sm opacity-70">
                            <span className="uppercase font-bold tracking-wider text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20">
                                {workOrder.status}
                            </span>
                            <span className="font-mono text-xs">#{workOrder.id.slice(0, 8)}</span>
                        </div>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <GlassCard intensity="panel" className="p-6 space-y-8">
                        {/* Header Info */}
                        <div className="flex justify-between items-start border-b border-white/5 pb-6">
                            <div>
                                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">Property Manager / Client</h3>
                                <div className="font-bold text-lg">{workOrder.clients?.name}</div>
                                <div className="text-sm opacity-60 font-medium">{workOrder.clients?.email}</div>
                                <div className="text-sm opacity-60 font-medium">{workOrder.clients?.phone}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">Received Date</h3>
                                <div className="font-mono font-bold text-primary">{workOrder.received_at ? new Date(workOrder.received_at).toLocaleDateString() : new Date(workOrder.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Tasks (Line Items) */}
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest">Tasks & Subcontractors</h3>
                                <AnimatedButton size="sm" variant="secondary" onClick={() => setIsAssignModalOpen(true)}>+ Task / Assign</AnimatedButton>
                            </div>

                            <div className="space-y-3">
                                {workOrder.work_order_tasks.length === 0 ? (
                                    <div className="text-sm opacity-50 italic text-center py-2">No tasks defined.</div>
                                ) : workOrder.work_order_tasks.map((item: WorkOrderTaskRow) => (
                                    <div key={item.id} className="flex justify-between items-start text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex-1">
                                            <div className="font-bold mb-1">{item.trade_type} <span className="text-[10px] uppercase ml-2 text-primary opacity-70">{item.status}</span></div>
                                            {item.subcontractors ? (
                                                <div className="text-xs opacity-50 flex items-center gap-2">
                                                    <User className="w-3 h-3" />
                                                    {item.subcontractors.name}
                                                    {item.subcontractors.phone && `(${item.subcontractors.phone})`}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-rose-400 font-medium">Unassigned</div>
                                            )}
                                        </div>
                                        <div className="font-mono font-bold tabular-nums text-emerald-400">
                                            ${item.cost_estimate?.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Estimate */}
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="font-bold text-lg opacity-80">Total Value Estimate</span>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                ${calculateTotal().toFixed(2)}
                            </span>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Subcontractor Photos / Completion */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <GlassCard intensity="panel" className="p-6">
                        <JobPhotoGallery
                            jobId={workOrder.id}
                            photos={photos}
                            type="after" // Reuse logic
                            title="Work Photos"
                        />
                    </GlassCard>
                </motion.div>

                {/* Actions */}
                <motion.div
                    className="flex flex-col gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {workOrder.status === 'Draft' && (
                        <AnimatedButton
                            onClick={() => handleUpdateStatus('Scheduled')}
                            size="lg"
                            className="w-full shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-gradient-to-r from-emerald-500 to-emerald-600 border-none"
                        >
                            Mark as Scheduled
                        </AnimatedButton>
                    )}

                    {workOrder.status === 'Scheduled' && (
                        <AnimatedButton
                            onClick={() => handleUpdateStatus('In Progress')}
                            size="lg"
                            className="w-full shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-500 to-blue-600 border-none"
                        >
                            <Loader2 className="animate-spin w-5 h-5 mr-2" /> Start Work
                        </AnimatedButton>
                    )}

                    <AnimatedButton
                        variant="secondary"
                        onClick={() => window.print()}
                        className="w-full"
                    >
                        <Printer className="w-5 h-5 mr-2 opacity-70" />
                        Print Work Order
                    </AnimatedButton>
                </motion.div>

                {/* Payments Reconciliation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <GlassCard className="p-6 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">Financial Tracking</h3>
                            <Link href="/ops/finance">
                                <AnimatedButton size="sm" variant="secondary" className="border-emerald-500/50">
                                    View Finance
                                </AnimatedButton>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                <div className="text-[10px] uppercase opacity-50 font-bold mb-1">Total Value</div>
                                <div className="font-bold font-mono text-sm">${calculateTotal().toFixed(2)}</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                <div className="text-[10px] uppercase opacity-50 font-bold mb-1">Paid / Ingested</div>
                                <div className="font-bold font-mono text-sm text-emerald-400">${calculatePaid().toFixed(2)}</div>
                            </div>
                        </div>
                        {payments.length === 0 ? <p className="text-xs italic opacity-50">No transactions matched to this Work Order yet.</p> : null}
                    </GlassCard>
                </motion.div>

                {/* Modal is kept generic for now, ideally updated to assign a specific task */}
                <AssignSubModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    jobId={workOrder.id}
                    onAssigned={() => { }}
                />
            </div>
        </div>
    );
}
