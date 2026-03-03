"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, DollarSign } from "lucide-react";

type PaymentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    onPaymentRecorded: () => void;
};

export function PaymentModal({ isOpen, onClose, jobId, onPaymentRecorded }: PaymentModalProps) {
    const supabase = createClient() as any;
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('payments')
            .insert([{
                job_id: jobId,
                amount: parseFloat(amount),
                method,
                date,
                notes
            }]);

        if (error) {
            console.error(error);
            alert("Failed to record payment.");
        } else {
            setAmount("");
            setNotes("");
            onPaymentRecorded();
            onClose();
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/90 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="text-xs uppercase font-bold opacity-50 block mb-1">Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                            <input
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase font-bold opacity-50 block mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase font-bold opacity-50 block mb-1">Method</label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-colors [&>option]:bg-black"
                            >
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                                <option value="e-transfer">E-Transfer</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold opacity-50 block mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-colors h-24 resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Save Payment"}
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
