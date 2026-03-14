"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getJobForQuote,
  updateTaskPricing,
  updateJobToQuoted,
} from "@/app/actions/quote-builder-actions";
import { getSavedRates, upsertRate } from "@/app/actions/rate-actions";
import {
  FileText,
  Send,
  Loader2,
  DollarSign,
  Download,
  CheckCircle,
} from "lucide-react";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

function guessRateFromMap(description: string, rates: Record<string, number>): number {
  const desc = description.toLowerCase();
  for (const [key, rate] of Object.entries(rates)) {
    if (desc.includes(key.toLowerCase())) return rate;
  }
  return 0;
}

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [data, rates] = await Promise.all([getJobForQuote(id), getSavedRates()]);
    setJob(data.job);
    setItems(
      data.tasks.map((t: any) => ({
        id: t.id,
        description: t.description,
        quantity: t.quantity || 1,
        unit_price: t.unit_price || guessRateFromMap(t.description, rates),
      }))
    );
    setLoaded(true);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const saveAllPricing = async () => {
    for (const item of items) {
      await updateTaskPricing(item.id, {
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description,
      });
      if (item.unit_price > 0) {
        await upsertRate(item.description, item.unit_price);
      }
    }
  };

  const pdfPayload = useCallback(
    () => ({
      jobNumber: job?.job_number || "",
      propertyAddress: job?.property_address || job?.address || "",
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      total,
    }),
    [job, items, total]
  );

  const generatePDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload()),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${job?.job_number || "FHI"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    }
    setDownloading(false);
  };

  const handleSendToNeil = async () => {
    setSaving(true);
    await saveAllPricing();
    await updateJobToQuoted(id);

    try {
      const res = await fetch("/api/quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload()),
      });
      const data = await res.json();

      if (data.fallback) {
        const subject = encodeURIComponent(
          `Quote ${job?.job_number} - ${job?.property_address || job?.title || "Job"}`
        );
        const bodyText = encodeURIComponent(
          `Hi Coady,\n\nPlease find the quote for ${job?.job_number} attached.\n\nProperty: ${job?.property_address || job?.address || "N/A"}\nTotal: $${total.toFixed(2)}\n\nThanks,\nFrank`
        );
        window.open(
          `mailto:coady@allprofessionaltrades.com?cc=neilh@allprofessionaltrades.com&subject=${subject}&body=${bodyText}`,
          "_self"
        );
      }
    } catch {
      const subject = encodeURIComponent(`Quote ${job?.job_number}`);
      window.open(
        `mailto:coady@allprofessionaltrades.com?cc=neilh@allprofessionaltrades.com&subject=${subject}`,
        "_self"
      );
    }

    setSent(true);
    setSaving(false);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Build Quote</h1>
        <p className="text-sm opacity-70">
          {job?.job_number} &mdash; {job?.property_address || job?.title}
        </p>
      </header>

      {sent && (
        <GlassCard className="p-4 border-green-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <p className="text-green-300 font-semibold">
              Quote sent! Job marked as Quoted.
            </p>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Line Items
        </h2>

        {items.map((item, idx) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-3 space-y-2">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-1 text-sm font-medium focus:outline-none focus:border-blue-500/50"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs opacity-50">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", parseFloat(e.target.value) || 1)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs opacity-50">Rate ($)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={item.unit_price}
                  onChange={(e) =>
                    updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs opacity-50">Total</label>
                <div className="px-3 py-2 text-sm font-semibold text-green-400">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Total
          </span>
          <span className="text-2xl font-extrabold text-green-400">
            ${total.toFixed(2)}
          </span>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <button
          onClick={generatePDF}
          disabled={downloading}
          className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download PDF
            </>
          )}
        </button>

        <button
          onClick={handleSendToNeil}
          disabled={saving || total === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl py-4 text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send to Neil
            </>
          )}
        </button>
      </div>
    </div>
  );
}
