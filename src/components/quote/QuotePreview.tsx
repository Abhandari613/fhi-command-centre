import { GlassCard } from "@/components/ui/GlassCard";
import { Edit2, Send, DollarSign, Hammer, Package } from "lucide-react";

interface QuotePreviewProps {
    transcript: string;
    onEdit: () => void;
    onSend: () => void;
}

export function QuotePreview({ transcript, onEdit, onSend }: QuotePreviewProps) {
    // Mock data for preview - in real app this comes from GPT
    const quoteData = {
        title: "Master Bathroom Renovation",
        total: 4250.00,
        labour: 2500.00,
        materials: [
            { name: "Porcelain Floor Tiles (50 sq ft)", price: 450.00 },
            { name: "Vanity Unit & Sink", price: 850.00 },
            { name: "Grout & Adhesive", price: 150.00 },
            { name: "Paint & Primer", price: 300.00 },
        ],
        clientSupplies: [
            "Bathroom Mirror",
            "Towel Rails",
            "Toilet Roll Holder"
        ]
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-8">

            {/* Total Price Card */}
            <GlassCard intensity="bright" className="p-6 flex justify-between items-center border-l-4 border-l-emerald-500">
                <div>
                    <p className="text-sm opacity-70 font-medium uppercase tracking-wide">Total Estimate</p>
                    <h2 className="text-3xl font-extrabold text-white">${quoteData.total.toFixed(2)}</h2>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
            </GlassCard>

            {/* Details Card */}
            <GlassCard className="p-6 space-y-6">

                {/* Job Summary */}
                <div className="space-y-2">
                    <h3 className="font-bold text-lg">{quoteData.title}</h3>
                    <p className="text-sm opacity-70 leading-relaxed italic">&quot;{transcript}&quot;</p>
                </div>

                <div className="h-px bg-white/10" />

                {/* Labour */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Hammer className="w-4 h-4 text-primary" />
                        <span className="font-medium">Labour</span>
                    </div>
                    <span className="font-bold opacity-90">${quoteData.labour.toFixed(2)}</span>
                </div>

                {/* Materials */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="font-medium">Materials (Frank Sourced)</span>
                    </div>
                    <ul className="space-y-2 pl-7">
                        {quoteData.materials.map((item, i) => (
                            <li key={i} className="flex justify-between text-sm opacity-80">
                                <span>{item.name}</span>
                                <span>${item.price.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Client Supplies */}
                <div className="bg-white/5 p-4 rounded-lg space-y-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-500 opacity-90">Client Responsibility</span>
                    <ul className="space-y-1">
                        {quoteData.clientSupplies.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm opacity-70">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

            </GlassCard>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onEdit}
                    className="flex-1 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                >
                    <Edit2 className="w-4 h-4" />
                    Edit
                </button>
                <button
                    onClick={onSend}
                    className="flex-[2] py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-transform active:scale-95"
                >
                    <Send className="w-4 h-4" />
                    Approve & Send
                </button>
            </div>

        </div>
    );
}
