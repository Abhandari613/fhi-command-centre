"use client";


import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Plus, Search, Mail, Phone, MapPin, Loader2, ArrowRight, X, User } from 'lucide-react';
import Link from 'next/link';
import { createClientAction } from "@/app/actions/client-actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientsPage() {
    const supabase = createClient();
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // New Client Form State
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('*').order('name');
            if (data) setClients(data);
            setLoading(false);
        };
        fetchClients();
    }, [supabase]);

    const filteredClients = clients.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        startTransition(async () => {
            const result = await createClientAction({
                name: newClientName.trim(),
                email: newClientEmail.trim() || undefined,
                phone: newClientPhone.trim() || undefined
            });

            if (result.success && result.data) {
                setClients(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
                setIsCreating(false);
                setNewClientName("");
                setNewClientEmail("");
                setNewClientPhone("");
                router.refresh();
            } else {
                alert(result.error || "Failed to create client");
            }
        });
    };

    return (
        <div className="min-h-screen pb-24 p-6 space-y-6">
            <header className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                        Property Managers
                    </h1>
                    <p className="opacity-60 text-sm">Manage your property managers and clients</p>
                </div>
                <AnimatedButton
                    onClick={() => setIsCreating(true)}
                    className="shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5 mr-2" /> New PM / Client
                </AnimatedButton>
            </header>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 text-white" />
                <input
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
                    placeholder="Search properties or clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Create Client Modal (Overlay) */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard intensity="panel" className="p-6 relative">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" /> New Profile
                                </h2>

                                <form onSubmit={handleCreateClient} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold opacity-60 ml-1">Name</label>
                                        <input
                                            required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                                            placeholder="Jane Doe"
                                            value={newClientName}
                                            onChange={e => setNewClientName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold opacity-60 ml-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                                            placeholder="jane@example.com"
                                            value={newClientEmail}
                                            onChange={e => setNewClientEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold opacity-60 ml-1">Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                                            placeholder="(555) 123-4567"
                                            value={newClientPhone}
                                            onChange={e => setNewClientPhone(e.target.value)}
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <AnimatedButton
                                            type="submit"
                                            className="w-full"
                                            disabled={isPending}
                                        >
                                            {isPending ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                            Create Profile
                                        </AnimatedButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Client List */}
            <div className="space-y-3">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                    ))
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No profiles found.</p>
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <Link key={client.id} href={`/ops/clients/${client.id}`}>
                            <GlassCard className="p-6 hover:bg-white/5 transition-colors cursor-pointer group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-5 h-5 text-zinc-400" />
                                </div>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                                            <span className="text-xl font-bold text-white">
                                                {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                                {client.name || 'Unnamed Client'}
                                            </h3>
                                            <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                                                <Mail className="w-3 h-3" />
                                                {client.email || 'No email'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                        <Phone className="w-4 h-4 text-zinc-500" />
                                        {client.phone || 'No phone'}
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                        <MapPin className="w-4 h-4 text-zinc-500" />
                                        {client.address || 'No address'}
                                    </div>
                                </div>

                                {/* Mini Job Stats (Mock for now, can be real later) */}
                                <div className="mt-6 pt-4 border-t border-white/5 flex gap-4">
                                    <div className="text-xs text-zinc-500">
                                        <span className="text-zinc-300 font-medium">View Details</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
