"use client";

import { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Camera, Check, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassSelect } from "@/components/ui/GlassSelect";

export function ReceiptScanner() {
    const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
    const [matchResult, setMatchResult] = useState<{ merchant: string, amount: number, matched: boolean } | null>(null);
    const [activeWorkOrders, setActiveWorkOrders] = useState<any[]>([]);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchWOs = async () => {
            const { data } = await (supabase.from as any)('work_orders')
                .select('id, property_address_or_unit, clients(name)')
                .in('status', ['Scheduled', 'In Progress'])
                .order('created_at', { ascending: false });
            if (data) setActiveWorkOrders(data);
        };
        fetchWOs();
    }, [supabase]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            handleUpload(file);
        }
    };

    const handleUpload = async (file: File) => {
        setStatus("uploading");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Get Org ID
            const { data } = await supabase.from('user_profiles').select('organization_id').single();
            const profile = data as { organization_id: string | null } | null;

            if (!profile?.organization_id) throw new Error("No organization found");

            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.organization_id}/${user.id}/${Date.now()}.${fileExt}`;

            // 2. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;


            // 3. Convert to Base64
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            // 4. Process Receipt (OCR & Matching)
            setStatus("processing");
            const { processAndSaveReceipt } = await import("@/app/actions/receipt-actions");
            const result = await processAndSaveReceipt({
                fileBase64: base64,
                imageUrl: fileName,
                workOrderId: selectedWorkOrderId || undefined
            });

            if (!result.success) throw new Error((result as any).error ? String((result as any).error?.message || (result as any).error) : "Upload failed");

            setMatchResult({
                merchant: result.data?.merchantName || "Unknown",
                amount: result.data?.totalAmount || 0,
                matched: result.data?.matchFound || false
            });

            setStatus("success");
            setTimeout(() => {
                router.push('/ops/receipts');
            }, 3000); // Give user time to read the match result

        } catch (error) {
            console.error(error);
            setStatus("error");
        }
    };

    return (
        <div className="w-full space-y-6">
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {/* Scanner Area */}
            <div className="relative flex flex-col items-center justify-center gap-6 min-h-[400px]">

                {status === "idle" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8 w-full"
                    >
                        <div className="relative w-64 h-64 mx-auto rounded-3xl border-2 border-white/10 flex items-center justify-center overflow-hidden bg-black/20">
                            {/* Scanning Animation */}
                            <motion.div
                                className="absolute top-0 left-0 right-0 h-1 bg-primary/50 shadow-[0_0_20px_rgba(0,229,255,0.8)] z-10"
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute inset-4 border border-dashed border-white/20 rounded-2xl" />

                            <ScanLine className="w-16 h-16 text-primary/50" />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                Ready to Scan
                            </h3>
                            <p className="opacity-60 text-sm max-w-[250px] mx-auto font-medium mb-4">
                                Align receipt within the frame for auto-detection and OCR extraction.
                            </p>

                            <div className="max-w-[250px] mx-auto text-left mb-6">
                                <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider text-white">Tag Work Order (Optional)</label>
                                <GlassSelect
                                    value={selectedWorkOrderId}
                                    onChange={(val) => setSelectedWorkOrderId(val)}
                                    options={[
                                        { value: '', label: 'Unassigned / General Expense' },
                                        ...activeWorkOrders.map(wo => ({
                                            value: wo.id,
                                            label: `${wo.clients?.name || 'Client'} - ${wo.property_address_or_unit}`
                                        }))
                                    ]}
                                />
                            </div>
                        </div>

                        <AnimatedButton
                            onClick={() => fileInputRef.current?.click()}
                            size="lg"
                            className="mx-auto w-full max-w-xs shadow-[0_0_30px_rgba(0,229,255,0.3)]"
                        >
                            <Camera className="w-5 h-5 mr-2" />
                            Activate Camera
                        </AnimatedButton>
                    </motion.div>
                )}

                {status === "uploading" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-20"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                        </div>
                        <span className="text-lg font-bold text-white tracking-wide">Uploading...</span>
                    </motion.div>
                )}

                {status === "processing" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-20"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                            <ScanLine className="w-16 h-16 text-purple-400 animate-pulse relative z-10" />
                        </div>
                        <span className="text-lg font-bold text-white tracking-wide">Analyzing & Matching...</span>
                    </motion.div>
                )}

                {status === "success" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <GlassCard intensity="bright" className="p-10 flex flex-col items-center gap-4 border-emerald-500/30 bg-emerald-500/5">
                            <div className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                                <Check className="w-10 h-10" strokeWidth={3} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-2xl text-white">Success!</h3>
                                <p className="text-emerald-400 font-medium text-lg">
                                    ${matchResult?.amount?.toFixed(2)} at {matchResult?.merchant}
                                </p>
                                {matchResult?.matched ? (
                                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/30">
                                        <Check className="w-4 h-4" />
                                        Linked to Transaction
                                    </div>
                                ) : (
                                    <p className="text-white/40 text-sm">Receipt saved (No transaction match yet)</p>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {status === "error" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center px-8"
                    >
                        <GlassCard className="p-8 border-red-500/30 bg-red-500/5 space-y-4">
                            <p className="text-red-400 font-bold text-lg">Upload Failed</p>
                            <p className="text-sm opacity-60">Something went wrong. Please check your connection.</p>
                            <AnimatedButton onClick={() => setStatus('idle')} variant="secondary" className="w-full">
                                Retry
                            </AnimatedButton>
                        </GlassCard>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
