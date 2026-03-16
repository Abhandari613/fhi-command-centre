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
  BookOpen,
  Plus,
  X,
} from "lucide-react";
import {
  getServicesCatalog,
  type ServiceItem,
} from "@/app/actions/services-catalog-actions";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatePresence, motion } from "framer-motion";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

function guessRateFromMap(
  description: string,
  rates: Record<string, number>,
): number {
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
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<ServiceItem[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [data, rates] = await Promise.all([
      getJobForQuote(id),
      getSavedRates(),
    ]);
    setJob(data.job);
    setItems(
      data.tasks.map((t: any) => ({
        id: t.id,
        description: t.description,
        quantity: t.quantity || 1,
        unit_price: t.unit_price || guessRateFromMap(t.description, rates),
      })),
    );
    setLoaded(true);
  };

  const updateItem = (
    idx: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const openCatalogPicker = async () => {
    if (catalog.length === 0) {
      const data = await getServicesCatalog();
      setCatalog(data);
    }
    setShowCatalog(true);
  };

  const addFromCatalog = (svc: ServiceItem) => {
    setItems((prev) => [
      ...prev,
      {
        id: `catalog-${Date.now()}-${Math.random()}`,
        description: svc.task_name,
        quantity: svc.default_quantity,
        unit_price: svc.unit_price,
      },
    ]);
    setShowCatalog(false);
  };

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
    [job, items, total],
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
          `Quote ${job?.job_number} - ${job?.property_address || job?.title || "Job"}`,
        );
        const bodyText = encodeURIComponent(
          `Hi Coady,\n\nPlease find the quote for ${job?.job_number} attached.\n\nProperty: ${job?.property_address || job?.address || "N/A"}\nTotal: $${total.toFixed(2)}\n\nThanks,\nFrank`,
        );
        window.open(
          `mailto:coady@allprofessionaltrades.com?cc=neilh@allprofessionaltrades.com&subject=${subject}&body=${bodyText}`,
          "_self",
        );
      }
    } catch {
      const subject = encodeURIComponent(`Quote ${job?.job_number}`);
      window.open(
        `mailto:coady@allprofessionaltrades.com?cc=neilh@allprofessionaltrades.com&subject=${subject}`,
        "_self",
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
        <h1 className="text-2xl font-black tracking-tight text-white">
          Build Quote
        </h1>
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

      {/* Catalog Picker Modal */}
      <AnimatePresence>
        {showCatalog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md max-h-[70vh] overflow-y-auto"
            >
              <GlassCard intensity="panel" className="p-6 relative">
                <button
                  onClick={() => setShowCatalog(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Pick from
                  Catalog
                </h2>
                {catalog.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-4">
                    No services in catalog yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {catalog.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => addFromCatalog(svc)}
                        className="w-full text-left p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {svc.task_name}
                            </p>
                            {svc.description && (
                              <p className="text-xs text-white/40 truncate">
                                {svc.description}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-emerald-400 ml-3">
                            ${svc.unit_price.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GlassCard className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Line Items
          </h2>
          <AnimatedButton variant="ghost" size="sm" onClick={openCatalogPicker}>
            <BookOpen className="w-4 h-4" /> Catalog
          </AnimatedButton>
        </div>

        {items.map((item, idx) => (
          <div key={item.id} className="bg-white/5 rounded-xl p-3 space-y-2">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
              className="w-full bg-transparent border-b border-white/10 pb-1 text-sm font-medium focus:outline-none focus:border-primary/50"
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                    updateItem(
                      idx,
                      "unit_price",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
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
          className="w-full bg-gradient-to-b from-primary to-[#e05e00] hover:from-[#ff7a1a] hover:to-primary shadow-[0_4px_20px_-2px_rgba(255,107,0,0.4)] disabled:opacity-40 text-white font-bold rounded-xl py-4 text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
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
