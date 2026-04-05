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
  Search,
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
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<string>("all");
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(
    new Set(),
  );

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
    setCatalogSearch("");
    setCatalogFilter("all");
    setSelectedCatalogIds(new Set());
    setShowCatalog(true);
  };

  const toggleCatalogItem = (svcId: string) => {
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(svcId)) next.delete(svcId);
      else next.add(svcId);
      return next;
    });
  };

  const addSelectedFromCatalog = () => {
    const selected = catalog.filter((s) => selectedCatalogIds.has(s.id));
    setItems((prev) => [
      ...prev,
      ...selected.map((svc) => ({
        id: `catalog-${Date.now()}-${Math.random()}`,
        description: svc.task_name,
        quantity: svc.default_quantity,
        unit_price: svc.unit_price,
      })),
    ]);
    setShowCatalog(false);
  };

  const filteredCatalog = catalog.filter((svc) => {
    const matchesSearch = svc.task_name
      .toLowerCase()
      .includes(catalogSearch.toLowerCase());
    const matchesType =
      catalogFilter === "all" || svc.item_type === catalogFilter;
    return matchesSearch && matchesType;
  });

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
              className="w-full max-w-md max-h-[80vh] flex flex-col"
            >
              <GlassCard intensity="panel" className="p-6 relative flex flex-col overflow-hidden">
                <button
                  onClick={() => setShowCatalog(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Pick from
                  Catalog
                </h2>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search services..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 mb-3 placeholder:text-white/30"
                />

                {/* Type filter */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(
                    [
                      { key: "all", label: "All", color: "text-white/60" },
                      { key: "labor", label: "Labor", color: "text-blue-400" },
                      {
                        key: "material",
                        label: "Material",
                        color: "text-amber-400",
                      },
                      {
                        key: "flat_rate",
                        label: "Flat Rate",
                        color: "text-emerald-400",
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setCatalogFilter(f.key)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        catalogFilter === f.key
                          ? `${f.color} bg-white/10 border border-white/10`
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Items list */}
                <div className="overflow-y-auto flex-1 space-y-2 min-h-0">
                  {catalog.length === 0 ? (
                    <p className="text-sm text-white/40 text-center py-4">
                      No services in catalog yet.
                    </p>
                  ) : filteredCatalog.length === 0 ? (
                    <p className="text-sm text-white/40 text-center py-4">
                      No matching services.
                    </p>
                  ) : (
                    filteredCatalog.map((svc) => {
                      const isSelected = selectedCatalogIds.has(svc.id);
                      const typeBadgeColor =
                        svc.item_type === "labor"
                          ? "bg-blue-500/20 text-blue-400"
                          : svc.item_type === "material"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400";
                      return (
                        <button
                          key={svc.id}
                          onClick={() => toggleCatalogItem(svc.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors border ${
                            isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary"
                                  : "border-white/20"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white truncate">
                                  {svc.task_name}
                                </p>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadgeColor}`}
                                >
                                  {svc.item_type}
                                </span>
                              </div>
                              {svc.description && (
                                <p className="text-xs text-white/40 truncate">
                                  {svc.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-emerald-400 ml-3 shrink-0">
                              ${svc.unit_price.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Add Selected button */}
                {selectedCatalogIds.size > 0 && (
                  <div className="pt-4 border-t border-white/5 mt-4">
                    <AnimatedButton
                      variant="primary"
                      className="w-full"
                      onClick={addSelectedFromCatalog}
                    >
                      <Plus className="w-4 h-4" />
                      Add {selectedCatalogIds.size} Selected
                    </AnimatedButton>
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
