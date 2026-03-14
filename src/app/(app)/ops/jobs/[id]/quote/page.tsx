"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getJobForQuote,
  updateTaskPricing,
  updateJobToQuoted,
} from "@/app/actions/quote-builder-actions";
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

const DEFAULT_RATES: Record<string, number> = {
  "paint room": 150,
  "paint ceiling": 80,
  "cabinet painting": 35,
  "drywall patch": 95,
  "tile repair": 25,
};

function getSavedRates(): Record<string, number> {
  if (typeof window === "undefined") return DEFAULT_RATES;
  try {
    const saved = localStorage.getItem("fhi-rates");
    return saved ? { ...DEFAULT_RATES, ...JSON.parse(saved) } : DEFAULT_RATES;
  } catch {
    return DEFAULT_RATES;
  }
}

function guessRate(description: string): number {
  const desc = description.toLowerCase();
  const rates = getSavedRates();
  for (const [key, rate] of Object.entries(rates)) {
    if (desc.includes(key)) return rate;
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

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const data = await getJobForQuote(id);
    setJob(data.job);
    setItems(
      data.tasks.map((t: any) => ({
        id: t.id,
        description: t.description,
        quantity: t.quantity || 1,
        unit_price: t.unit_price || guessRate(t.description),
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
    }
  };

  const generatePDF = useCallback(() => {
    // Build a printable HTML invoice and trigger browser print/save
    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rows = items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${item.unit_price.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.quantity * item.unit_price).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><title>Quote ${job?.job_number}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#333}
table{width:100%;border-collapse:collapse}
th{background:#1a1a2e;color:white;padding:10px;text-align:left}
.total{font-size:1.3em;font-weight:bold;text-align:right;margin-top:20px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
.footer{margin-top:40px;text-align:center;font-size:0.85em;color:#888}</style></head>
<body>
<div class="header">
  <div><h1 style="margin:0;color:#1a1a2e">Frank's Home Improvement</h1>
  <p style="margin:4px 0;color:#666">Quality Painting & Repairs</p></div>
  <div style="text-align:right"><strong>Quote</strong><br/>${job?.job_number || ""}<br/>${date}</div>
</div>
<p><strong>Property:</strong> ${job?.property_address || job?.address || "N/A"}</p>
<table>
  <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total">Total: $${total.toFixed(2)}</div>
<div class="footer">
  <p>aguirref04@gmail.com</p>
  <p>Thank you for choosing Frank's Home Improvement</p>
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }, [items, job, total]);

  const handleSendToNeil = async () => {
    setSaving(true);
    await saveAllPricing();
    await updateJobToQuoted(id);

    // Open email client with pre-filled fields
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

      {/* Line items */}
      <GlassCard className="p-4 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Line Items
        </h2>

        {items.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white/5 rounded-xl p-3 space-y-2"
          >
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

        {/* Grand total */}
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

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={generatePDF}
          className="w-full bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          <Download className="w-5 h-5" />
          Generate PDF
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
