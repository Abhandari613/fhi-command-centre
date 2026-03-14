"use client";

import { useEffect, useState, useTransition } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ServiceItemCard } from "@/components/finance/ServiceItemCard";
import {
  getServicesCatalog,
  upsertServiceItem,
  type ServiceItem,
} from "@/app/actions/services-catalog-actions";
import { ArrowLeft, Plus, Loader2, X, BookOpen, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CatalogPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [formQty, setFormQty] = useState(1);
  const [formType, setFormType] = useState("labor");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getServicesCatalog();
    setItems(data);
    setLoading(false);
  };

  const openEdit = (item: ServiceItem) => {
    setEditItem(item);
    setFormName(item.task_name);
    setFormDesc(item.description || "");
    setFormPrice(item.unit_price);
    setFormQty(item.default_quantity);
    setFormType(item.item_type);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormDesc("");
    setFormPrice(0);
    setFormQty(1);
    setFormType("labor");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    startTransition(async () => {
      await upsertServiceItem({
        id: editItem?.id,
        task_name: formName.trim(),
        description: formDesc.trim() || undefined,
        unit_price: formPrice,
        default_quantity: formQty,
        item_type: formType,
      });
      setShowForm(false);
      setEditItem(null);
      await loadData();
    });
  };

  const filtered =
    filter === "all" ? items : items.filter((i) => i.item_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ops/finance"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Services Catalog
            </h1>
            <p className="text-sm text-white/50">
              {items.length} service{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <AnimatedButton size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Service
        </AnimatedButton>
      </header>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-white/30" />
        {["all", "labor", "material", "flat_rate"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${
              filter === f
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-white/[0.02] text-white/40 border-white/5 hover:text-white/60"
            }`}
          >
            {f === "all"
              ? "All"
              : f === "flat_rate"
                ? "Flat Rate"
                : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <GlassCard intensity="panel" className="p-6 relative">
                <button
                  onClick={() => setShowForm(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  {editItem ? "Edit Service" : "Add Service"}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase font-bold opacity-60 ml-1">
                      Service Name
                    </label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      placeholder="e.g. Drywall Patching"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold opacity-60 ml-1">
                      Description
                    </label>
                    <input
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold opacity-60 ml-1">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={formPrice}
                        onChange={(e) =>
                          setFormPrice(Number(e.target.value) || 0)
                        }
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold opacity-60 ml-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formQty}
                        onChange={(e) =>
                          setFormQty(Number(e.target.value) || 1)
                        }
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold opacity-60 ml-1">
                        Type
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      >
                        <option value="labor">Labor</option>
                        <option value="material">Material</option>
                        <option value="flat_rate">Flat Rate</option>
                      </select>
                    </div>
                  </div>
                  <AnimatedButton
                    onClick={handleSubmit}
                    disabled={isPending || !formName.trim()}
                    className="w-full"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {editItem ? "Update Service" : "Add Service"}
                  </AnimatedButton>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Catalog Grid */}
      {filtered.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="text-sm text-white/40">No services in catalog.</p>
          <AnimatedButton size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add First Service
          </AnimatedButton>
        </GlassCard>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {filtered.map((item) => (
            <ServiceItemCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDeactivate={loadData}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
