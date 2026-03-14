"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { QuoteTimeline } from "@/components/quotes/QuoteTimeline";
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

import { Database } from "@/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];
type QuoteLineItemRow = Database['public']['Tables']['quote_line_items']['Row'];

type JobWithDetails = JobRow & {
    clients: ClientRow | null;
    quote_line_items: QuoteLineItemRow[];
};

export default function QuoteDetailsPage() {
    const supabase = createClient();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [quote, setQuote] = useState<JobWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [assignedSubs, setAssignedSubs] = useState<any[]>([]);

    const [photos, setPhotos] = useState<any[]>([]);

    const fetchPhotos = useCallback(async () => {
        const { data } = await supabase
            .from('job_photos')
            .select('*')
            .eq('job_id', id)
            .order('created_at', { ascending: false });
        setPhotos(data || []);
    }, [supabase, id]);



    const fetchAssignments = useCallback(async () => {
        const { data } = await supabase
            .from('job_assignments')
            .select('*, subcontractors(*)')
            .eq('job_id', id);

        if (data) {
            setAssignedSubs(data.map(d => d.subcontractors).filter(Boolean));
        }
    }, [supabase, id]);

    const fetchPayments = useCallback(async () => {
        const { data } = await supabase
            .from('payments')
            .select('*')
            .eq('job_id', id)
            .order('date', { ascending: false });
        setPayments(data || []);
    }, [supabase, id]);

    useEffect(() => {
        const fetchQuote = async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*, clients(*), quote_line_items(*)')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching quote:", error);
                setQuote(data as unknown as JobWithDetails);
            }

            // Fetch Events
            const { data: eventsData } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', id)
                .order('created_at', { ascending: false });

            setEvents(eventsData || []);

            setLoading(false);
        };

        if (id) {
            fetchQuote();
            fetchPayments();
            fetchAssignments();
            fetchPhotos();
        }
    }, [id, supabase, fetchPayments, fetchAssignments, fetchPhotos]);

    const calculateTotal = () => {
        return quote?.quote_line_items?.reduce((sum: number, item: QuoteLineItemRow) => sum + (item.total || 0), 0) || 0;
    };

    const calculatePaid = () => {
        return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    };

    const handleConvertToJob = async () => {
        if (!confirm("Are you sure you want to convert this quote to an active job?")) return;
        setConverting(true);

        try {
            const { convertQuoteToJob } = await import("@/app/actions/job-actions");
            const result = await convertQuoteToJob(id);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Success - redirect to active jobs
            router.push('/ops/jobs');
            router.refresh();
        } catch (e: unknown) {
            console.error("Error converting quote:", e);
            const message = e instanceof Error ? e.message : "Unknown error";
            alert(`Failed to convert quote: ${message}`);
            setConverting(false); // Only re-enable on error
        }
        // finally block removed to keep button disabled on success during redirect
    };

    const handleSendQuote = async () => {
        if (!confirm("Send quote to client? (Simulation)")) return;

        try {
            // In real app, send email here
            await logJobEvent(id, 'email_sent', { method: 'email_simulation' });

            // Update status to 'sent' if it is 'draft'
            if (quote?.status === 'draft') {
                await supabase.from('jobs').update({ status: 'sent' }).eq('id', id);
            }

            // Refresh events
            const { data: eventsData } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', id)
                .order('created_at', { ascending: false });
            setEvents(eventsData || []);

            alert("Quote sent! (Simulated)");
            router.refresh();
        } catch (e) {
            console.error("Error sending quote:", e);
        }
    };

    if (loading) return <div className="flex justify-center p-8 h-screen items-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (!quote) return <div className="p-8 text-center text-xl font-bold opacity-50">Quote not found</div>;

    return (
        <div className="relative min-h-screen pb-24 overflow-hidden">
            <div className="aurora-blur bg-primary/20 top-[-50px] left-[-50px]" />

            <div className="p-6 flex flex-col gap-6 relative z-10">
                <header className="flex items-center gap-4">
                    <Link href="/ops/quotes">
                        <AnimatedButton variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </AnimatedButton>
                    </Link>
                    <div className="flex-1 overflow-hidden">
                        <h1 className="text-xl font-black tracking-tight truncate">{quote.title}</h1>
                        <div className="flex items-center gap-2 text-sm opacity-70">
                            <span className="uppercase font-bold tracking-wider text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20">
                                {quote.status}
                            </span>
                            <span className="font-mono text-xs">#{quote.id.slice(0, 8)}</span>
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
                                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">Client</h3>
                                <div className="font-bold text-lg">{quote.clients?.name}</div>
                                <div className="text-sm opacity-60 font-medium">{quote.clients?.email}</div>
                                <div className="text-sm opacity-60 font-medium">{quote.clients?.phone}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">Date</h3>
                                <div className="font-mono font-bold text-primary">{new Date(quote.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Timeline */}
                        {events.length > 0 && (
                            <div className="mb-6">
                                <QuoteTimeline events={events} className="bg-white/5 border-none" />
                            </div>
                        )}

                        {/* Condition Assessment (Before Photos) */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <GlassCard intensity="normal" className="p-6 bg-white/5 border-none">
                                <JobPhotoGallery
                                    jobId={quote.id}
                                    photos={photos}
                                    type="before"
                                    title="Condition Assessment (Before)"
                                />
                            </GlassCard>
                        </motion.div>

                        {/* Job Description */}
                        <div>
                            <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-3">Scope of Work</h3>
                            <GlassCard intensity="normal" className="p-4 bg-white/5 border-none">
                                <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap font-medium">
                                    {quote.description || "No description provided."}
                                </p>
                            </GlassCard>
                        </div>

                        {/* Line Items */}
                        <div>
                            <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-3">Line Items</h3>
                            <div className="space-y-3">
                                {quote.quote_line_items.map((item: QuoteLineItemRow) => (
                                    <div key={item.id} className="flex justify-between items-start text-sm bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex-1">
                                            <div className="font-bold mb-1">{item.description}</div>
                                            <div className="text-xs opacity-50 font-mono">{item.quantity} x ${item.unit_price?.toFixed(2)}</div>
                                        </div>
                                        <div className="font-mono font-bold tabular-nums text-emerald-400">
                                            ${item.total?.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="font-bold text-lg opacity-80">Total Estimate</span>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                ${calculateTotal().toFixed(2)}
                            </span>
                        </div>
                    </GlassCard>

                </motion.div>

                {/* Completion Photos (After Photos) - Only for Active/Completed Jobs */}
                {['active', 'completed'].includes(quote.status || '') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <GlassCard intensity="panel" className="p-6">
                            <JobPhotoGallery
                                jobId={quote.id}
                                photos={photos}
                                type="after"
                                title="Work Completion (After)"
                            />
                        </GlassCard>
                    </motion.div>
                )}

                {/* Actions */}
                <motion.div
                    className="flex flex-col gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <AnimatedButton
                        onClick={handleSendQuote}
                        className="w-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/50"
                    >
                        <Send className="w-5 h-5 mr-2" />
                        Send Quote (Simulated)
                    </AnimatedButton>

                    <AnimatedButton
                        disabled={converting || quote.status === 'active'}
                        onClick={handleConvertToJob}
                        size="lg"
                        className="w-full shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-gradient-to-r from-emerald-500 to-emerald-600 border-none"
                    >
                        {converting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Briefcase className="w-5 h-5 mr-2" />}
                        {quote.status === 'active' ? "Job Active" : "Convert to Active Job"}
                    </AnimatedButton>

                    <AnimatedButton
                        variant="secondary"
                        onClick={() => window.print()}
                        className="w-full"
                    >
                        <Printer className="w-5 h-5 mr-2 opacity-70" />
                        Print / Save PDF
                    </AnimatedButton>
                </motion.div>

                {/* Subcontractors Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Team</h3>
                            <AnimatedButton
                                size="sm"
                                variant="secondary"
                                onClick={() => setIsAssignModalOpen(true)}
                            >
                                + Assign Sub
                            </AnimatedButton>
                        </div>

                        {assignedSubs.length === 0 ? (
                            <div className="text-sm opacity-50 italic text-center py-4">No subcontractors assigned yet.</div>
                        ) : (
                            <div className="grid gap-3">
                                {assignedSubs.map((sub) => (
                                    <div key={sub.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                                                <User className="w-4 h-4 opacity-70" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">{sub.name}</div>
                                                <div className="text-xs opacity-50 flex items-center gap-2">
                                                    <span>{sub.trade || 'Team Member'}</span>
                                                    {sub.phone && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                                    {sub.phone && <span>{sub.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {sub.phone && (
                                            <a href={`tel:${sub.phone}`} className="p-2 hover:bg-white/10 rounded-full transition-colors text-primary">
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </motion.div>

                {/* Payments Section (Active Jobs Only) */}
                {quote.status === 'active' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <GlassCard className="p-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">Payments</h3>
                                <AnimatedButton
                                    size="sm"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50"
                                >
                                    + Record Payment
                                </AnimatedButton>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <div className="text-[10px] uppercase opacity-50 font-bold mb-1">Total</div>
                                    <div className="font-bold font-mono text-sm">${calculateTotal().toFixed(2)}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <div className="text-[10px] uppercase opacity-50 font-bold mb-1">Paid</div>
                                    <div className="font-bold font-mono text-sm text-emerald-400">${calculatePaid().toFixed(2)}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                                    <div className="text-[10px] uppercase opacity-50 font-bold mb-1">Balance</div>
                                    <div className="font-bold font-mono text-sm text-amber-400">${(calculateTotal() - calculatePaid()).toFixed(2)}</div>
                                </div>
                            </div>

                            <PaymentList payments={payments} />
                        </GlassCard>
                    </motion.div>
                )}

                <AssignSubModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    jobId={quote.id}
                    onAssigned={() => {
                        fetchAssignments();
                    }}
                />

                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    jobId={quote.id}
                    onPaymentRecorded={() => fetchPayments()}
                />
            </div>

        </div>
    );
}
