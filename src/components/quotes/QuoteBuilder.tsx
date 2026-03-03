"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { LocationPicker } from "@/components/clients/LocationPicker";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { Plus, Trash2, Save, Loader2, ArrowRight, ArrowLeft, User, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createQuoteAction } from "@/app/actions/quote-actions";
import { CreateQuoteInput } from "@/lib/schemas/quoteSchema";
import { motion, AnimatePresence } from "framer-motion";

type Client = { id: string; name: string; email?: string };

interface LineItem {
    id: string;
    description: string;
    quantity: number | '';
    unit_price: number | '';
    item_type: 'labor' | 'material';
    provided_by: 'contractor' | 'client';
}

import { createClient } from "@/utils/supabase/client";

interface QuoteBuilderProps {
    initialClientId?: string;
}

export function QuoteBuilder({ initialClientId }: QuoteBuilderProps) {
    const router = useRouter();
    const supabase = createClient();
    const [step, setStep] = useState<1 | 2>(1);
    const [isPending, startTransition] = useTransition();
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Form State
    type Client = { id: string; name: string; email?: string | null; address?: string | null };
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");

    // Workflow State
    const [estimatedDuration, setEstimatedDuration] = useState<number | undefined>();
    const [depositRequired, setDepositRequired] = useState(true); // Default to true based on user pref
    const [depositAmount, setDepositAmount] = useState<number | undefined>();

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: '', item_type: 'labor', provided_by: 'contractor' }
    ]);

    // Pre-select client if ID is provided
    useEffect(() => {
        if (initialClientId && !selectedClient) {
            const fetchClient = async () => {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', initialClientId)
                    .single();

                if (data && !error) {
                    setSelectedClient(data);
                    if (data.address) {
                        setSelectedAddress(data.address);
                    }
                }
            };
            fetchClient();
        }
    }, [initialClientId, selectedClient, supabase]);

    const calculateTotal = () => {
        return lineItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { id: Math.random().toString(), description: '', quantity: 1, unit_price: '', item_type: 'labor', provided_by: 'contractor' }]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length === 1) return;
        setLineItems(lineItems.filter(i => i.id !== id));
    };

    const handleVoiceRecording = async (audioBlob: Blob) => {
        setIsProcessingVoice(true);
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
            const response = await fetch("/api/voice/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Transcription failed: ${response.statusText}`);
            }

            const { data } = await response.json();

            if (data.jobTitle) setJobTitle(data.jobTitle);
            if (data.jobDescription) setJobDescription(data.jobDescription);

            if (data.lineItems && Array.isArray(data.lineItems)) {
                setLineItems(data.lineItems.map((item: { description?: string, quantity?: number, unit_price?: number }) => ({
                    id: Math.random().toString(),
                    description: item.description || "Item",
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || '',
                    item_type: 'labor',
                    provided_by: 'contractor'
                })));
                setStep(2);
            }
        } catch (error) {
            console.error("Voice Error:", error);
            alert(`Voice Command Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsProcessingVoice(false);
        }
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(lineItems.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSaveQuote = (status: 'draft' | 'open' = 'draft') => {
        if (!selectedClient || !jobTitle) return;

        const input: CreateQuoteInput = {
            client_id: selectedClient.id,
            location_id: selectedLocationId,
            title: jobTitle,
            description: jobDescription,
            address: selectedAddress || undefined,
            line_items: lineItems.map(i => ({
                description: i.description,
                quantity: Number(i.quantity) || 0,
                unit_price: Number(i.unit_price) || 0,
                item_type: i.item_type,
                provided_by: i.provided_by
            })),
            estimated_duration: estimatedDuration,
            deposit_required: depositRequired,
            deposit_amount: depositAmount,
            status: status
        };

        startTransition(async () => {
            const result = await createQuoteAction(input);
            if (result.success) {
                router.push(`/ops/quotes/${result.data?.id}`);
                router.refresh();
            } else {
                alert(result.error || "Failed to save quote");
            }
        });
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
        }),
    };

    return (
        <div className="min-h-screen py-8 px-4 flex items-center justify-center">
            {/* Background Effects */}
            <div className="aurora-blur bg-blue-500/20 top-0 left-0" />
            <div className="aurora-blur bg-purple-500/20 bottom-0 right-0" />

            <GlassCard className="max-w-2xl w-full mx-auto p-4 md:p-8 space-y-8" intensity="solid">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            New Quote
                        </h1>
                    </div>
                    {/* Steps Indicator */}
                    <div className="flex gap-2 w-24">
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]" : "bg-white/10")} />
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]" : "bg-white/10")} />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-6">
                                {/* Voice Command - Prominent at top */}
                                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                                    <p className="text-xs font-medium text-purple-300 uppercase tracking-wider">AI Quick Fill</p>
                                    <VoiceRecorder onRecordingComplete={handleVoiceRecording} isProcessing={isProcessingVoice} />
                                    <p className="text-xs text-gray-500">Describe the job to auto-fill details</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary/80 border-b border-white/5 pb-2">
                                        <User className="w-5 h-5" />
                                        <h2 className="font-semibold">Client Information</h2>
                                    </div>
                                    <ClientPicker
                                        onSelect={(client) => {
                                            setSelectedClient(client);
                                            setSelectedLocationId(null); // Reset location when client changes
                                        }}
                                        selectedClientId={selectedClient?.id}
                                    />

                                    {selectedClient && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <LocationPicker
                                                clientId={selectedClient.id}
                                                selectedLocationId={selectedLocationId}
                                                defaultAddress={selectedClient.address}
                                                onSelect={(id, addr) => {
                                                    setSelectedLocationId(id);
                                                    setSelectedAddress(addr);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary/80 border-b border-white/5 pb-2">
                                        <FileText className="w-5 h-5" />
                                        <h2 className="font-semibold">Job Details</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Job Title</label>
                                            <input
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                placeholder="e.g. Master Bathroom Renovation"
                                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description</label>
                                            <textarea
                                                value={jobDescription}
                                                onChange={(e) => setJobDescription(e.target.value)}
                                                placeholder="Scope of work details..."
                                                rows={4}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Est. Duration (Days)</label>
                                            <input
                                                type="number"
                                                value={estimatedDuration || ''}
                                                onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || undefined)}
                                                placeholder="e.g. 3"
                                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <AnimatedButton
                                        disabled={!jobTitle}
                                        onClick={() => setStep(2)}
                                        className="w-full mt-6"
                                        size="lg"
                                    >
                                        Next Step <ArrowRight className="w-5 h-5 ml-2" />
                                    </AnimatedButton>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            custom={2}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold">Quote Items</h2>
                                    <button onClick={() => setStep(1)} className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                                        <ArrowLeft className="w-4 h-4" /> Edit Details
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {lineItems.map((item, index) => (
                                        <GlassCard key={item.id} className="p-4" intensity="bright">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        className="w-full bg-transparent border-none p-0 font-bold text-lg focus:outline-none placeholder:text-white/30 focus:ring-0"
                                                        placeholder="Item Description"
                                                        value={item.description}
                                                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                                        autoFocus={index === lineItems.length - 1 && item.description === ''}
                                                    />
                                                    <div className="flex items-center gap-4">
                                                        <select
                                                            value={item.item_type || 'labor'}
                                                            onChange={(e) => updateLineItem(item.id, 'item_type', e.target.value as 'labor' | 'material')}
                                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase tracking-wider font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                        >
                                                            <option value="labor">Labor</option>
                                                            <option value="material">Material</option>
                                                        </select>
                                                        {item.item_type === 'material' && (
                                                            <select
                                                                value={item.provided_by || 'contractor'}
                                                                onChange={(e) => updateLineItem(item.id, 'provided_by', e.target.value as 'contractor' | 'client')}
                                                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase tracking-wider font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            >
                                                                <option value="contractor">Contractor Supplies</option>
                                                                <option value="client">Client Supplies</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeLineItem(item.id)}
                                                    className="text-red-400/50 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-1">
                                                    <label className="text-[10px] opacity-50 uppercase font-bold block mb-1">Qty</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                                                        value={item.quantity === '' ? '' : item.quantity}
                                                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="text-[10px] opacity-50 uppercase font-bold block mb-1">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-black/20 rounded-lg pl-6 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            value={item.unit_price === '' ? '' : item.unit_price}
                                                            onChange={(e) => updateLineItem(item.id, 'unit_price', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-1 text-right">
                                                    <label className="text-[10px] opacity-50 uppercase font-bold block mb-1">Total</label>
                                                    <div className="text-lg font-bold py-1 text-emerald-400">
                                                        ${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>

                                <AnimatedButton
                                    onClick={addLineItem}
                                    variant="secondary"
                                    className="w-full mt-6 border-dashed border-white/20 bg-transparent hover:bg-white/5"
                                >
                                    <Plus className="w-5 h-5 mr-2" /> Add Line Item
                                </AnimatedButton>
                            </section>

                            <section className="pt-6 border-t border-white/10 mt-8">
                                <div className="flex justify-between items-center mb-6 px-2">
                                    <span className="font-bold opacity-70 text-lg">Total Estimate</span>
                                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                        ${calculateTotal().toFixed(2)}
                                    </span>
                                </div>

                                {/* Deposit Configuration */}
                                <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 border border-white/20 p-4 rounded-xl cursor-pointer" onClick={() => setDepositRequired(!depositRequired)}>
                                            <div className={cn("w-5 h-5 rounded border flex flex-shrink-0 items-center justify-center transition-colors", depositRequired ? "bg-emerald-500 border-emerald-500" : "bg-black/50 border-white/20")}>
                                                {depositRequired && <div className="w-2.5 h-2.5 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium">Require Deposit (25%)</span>
                                        </div>

                                        {depositRequired && (
                                            <div className="flex items-center justify-between border border-white/20 p-4 rounded-xl bg-black/20">
                                                <span className="text-sm font-medium opacity-80">Deposit Amount</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative w-32">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            value={depositAmount !== undefined ? depositAmount : (calculateTotal() * 0.25).toFixed(2)}
                                                            onChange={(e) => setDepositAmount(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                                            className="w-full bg-black/50 border-none rounded-lg pl-6 pr-2 py-2 text-right text-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-emerald-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <AnimatedButton
                                        disabled={isPending || calculateTotal() === 0}
                                        onClick={() => handleSaveQuote('draft')}
                                        variant="secondary"
                                        size="lg"
                                        className="w-full"
                                    >
                                        {isPending ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                        Save as Draft
                                    </AnimatedButton>
                                    <AnimatedButton
                                        disabled={isPending || calculateTotal() === 0}
                                        onClick={() => handleSaveQuote('open')}
                                        size="lg"
                                        className="w-full shadow-lg shadow-primary/20"
                                    >
                                        {isPending ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                        Finalize Quote
                                    </AnimatedButton>
                                </div>
                            </section>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>
        </div >
    );
}
