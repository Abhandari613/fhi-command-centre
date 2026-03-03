"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { FileText, User, Calendar, Loader2, ArrowRight, Filter, AlertCircle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, isPast, parseISO } from "date-fns";

import type { Database } from "@/types/supabase";

type JobRow = Database['public']['Tables']['jobs']['Row'];
type Job = JobRow & {
    quote_line_items?: any[];
    clients?: { full_name: string | null, company: string | null } | null;
};

type FilterType = 'all' | 'open' | 'closed' | 'pending' | 'expiring_soon' | 'expired' | 'draft';

interface QuoteStats {
    totalActive: number;
    expiringSoon: number; // <= 2 days
    expired: number;
    drafts: number;
}

export function QuoteList() {
    const supabase = createClient() as any;
    const [quotes, setQuotes] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [stats, setStats] = useState<QuoteStats>({ totalActive: 0, expiringSoon: 0, expired: 0, drafts: 0 });

    useEffect(() => {
        const fetchQuotes = async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*, clients(name), quote_line_items(total)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching quotes:", error);
            } else {
                setQuotes(data || []);
                calculateStats(data || []);
            }
            setLoading(false);
        };

        fetchQuotes();
    }, []);

    const calculateStats = (data: Job[]) => {
        const now = new Date();
        const newStats: QuoteStats = {
            totalActive: 0,
            expiringSoon: 0,
            expired: 0,
            drafts: 0
        };

        data.forEach(q => {
            const status = q.status?.toLowerCase() || 'draft';

            if (status === 'draft') newStats.drafts++;
            if (['open', 'sent', 'draft'].includes(status)) newStats.totalActive++;

            if (q.quote_expiry_date) {
                const expiry = parseISO(q.quote_expiry_date);
                if (isPast(expiry) && !['accepted', 'rejected', 'closed'].includes(status)) {
                    newStats.expired++;
                } else {
                    const daysLeft = differenceInDays(expiry, now);
                    if (daysLeft >= 0 && daysLeft <= 2 && !['accepted', 'rejected', 'closed'].includes(status)) {
                        newStats.expiringSoon++;
                    }
                }
            }
        });

        setStats(newStats);
    };

    const calculateQuoteTotal = (quote: Job) => {
        return quote.quote_line_items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
    };

    const getFilteredQuotes = () => {
        const now = new Date();
        return quotes.filter(q => {
            const status = q.status?.toLowerCase() || 'draft';

            switch (activeFilter) {
                case 'open': return ['open', 'sent'].includes(status);
                case 'closed': return ['accepted', 'rejected', 'closed'].includes(status);
                case 'pending':
                case 'draft': return status === 'draft';
                case 'expiring_soon':
                    if (!q.quote_expiry_date) return false;
                    const expirySoon = parseISO(q.quote_expiry_date);
                    const daysLeft = differenceInDays(expirySoon, now);
                    return daysLeft >= 0 && daysLeft <= 2 && !['accepted', 'rejected', 'closed'].includes(status);
                case 'expired':
                    if (!q.quote_expiry_date) return false;
                    const expiryExpired = parseISO(q.quote_expiry_date);
                    return isPast(expiryExpired) && !['accepted', 'rejected', 'closed'].includes(status);
                default: return true;
            }
        });
    };

    const filteredQuotes = getFilteredQuotes();

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard
                    onClick={() => setActiveFilter('all')}
                    className={`p-4 flex flex-col gap-1 items-center justify-center text-center cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95
                        ${activeFilter === 'all' ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(0,229,255,0.2)]' : ''}
                    `}
                >
                    <span className="text-2xl font-black text-white">{stats.totalActive}</span>
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Total Active</span>
                </GlassCard>
                <GlassCard
                    onClick={() => setActiveFilter('expiring_soon')}
                    className={`p-4 flex flex-col gap-1 items-center justify-center text-center relative overflow-hidden group cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95
                        ${activeFilter === 'expiring_soon' ? 'border-yellow-400/50 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : ''}
                    `}
                >
                    <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-2xl font-black text-yellow-400">{stats.expiringSoon}</span>
                    <span className="text-[10px] uppercase tracking-wider text-yellow-400/80 font-bold">1-2 Days Left</span>
                </GlassCard>
                <GlassCard
                    onClick={() => setActiveFilter('expired')}
                    className={`p-4 flex flex-col gap-1 items-center justify-center text-center relative overflow-hidden group cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95
                        ${activeFilter === 'expired' ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}
                    `}
                >
                    <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-2xl font-black text-red-500">{stats.expired}</span>
                    <span className="text-[10px] uppercase tracking-wider text-red-500/80 font-bold">Expired</span>
                </GlassCard>
                <GlassCard
                    onClick={() => setActiveFilter('draft')}
                    className={`p-4 flex flex-col gap-1 items-center justify-center text-center cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95
                        ${activeFilter === 'draft' ? 'border-gray-500/50 bg-gray-500/10' : ''}
                    `}
                >
                    <span className="text-2xl font-black text-gray-400">{stats.drafts}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Drafts</span>
                </GlassCard>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                {(['all', 'open', 'pending', 'closed'] as const).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`
                            px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all
                            ${activeFilter === filter
                                ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
                        `}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Quote List */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 min-h-[300px]">
                <AnimatePresence mode="popLayout">
                    {filteredQuotes.length === 0 ? (
                        <motion.div
                            variants={item}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center opacity-50 py-12 flex flex-col items-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <Filter className="w-8 h-8 opacity-30" />
                            </div>
                            <p className="text-lg font-medium">No estimates found for this filter.</p>
                            {activeFilter !== 'all' && (
                                <button onClick={() => setActiveFilter('all')} className="text-primary hover:underline text-sm">
                                    Clear filters
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredQuotes.map((quote) => (
                                <GlassCard
                                    key={quote.id}
                                    intensity="panel"
                                    className="p-5 flex flex-col gap-3 group relative overflow-hidden transition-all hover:bg-white/5 hover:border-white/10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight text-white group-hover:text-primary transition-colors">
                                                {quote.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                <User className="w-3 h-3 text-primary" />
                                                <span>{quote.clients?.full_name || "Unknown Client"}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-xl text-emerald-400">
                                                ${calculateQuoteTotal(quote).toFixed(2)}
                                            </div>
                                            <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 
                                                ${quote.status === 'accepted' ? 'text-emerald-500' :
                                                    quote.status === 'rejected' ? 'text-red-500' :
                                                        'text-gray-500'}`
                                            }>
                                                {quote.status || 'Draft'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-2 relative z-10 border-t border-white/5 pt-3">
                                        <div className="flex gap-4">
                                            <div className="text-[10px] opacity-40 flex items-center gap-1 font-medium">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(quote.created_at).toLocaleDateString()}
                                            </div>
                                            {quote.quote_expiry_date && (
                                                <div className={`text-[10px] flex items-center gap-1 font-medium 
                                                    ${isPast(parseISO(quote.quote_expiry_date)) ? 'text-red-400' : 'text-gray-400'}
                                                 `}>
                                                    <Clock className="w-3 h-3" />
                                                    Expires: {new Date(quote.quote_expiry_date).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>

                                        <Link href={`/ops/quotes/${quote.id}`}>
                                            <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform cursor-pointer">
                                                View Details <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </Link>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
