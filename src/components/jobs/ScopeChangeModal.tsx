"use client";

import { useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { addScopeFromEmail } from "@/app/actions/scope-change-actions";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ScopeChangeModalProps {
  jobId: string;
  threadId?: string | null;
  initialItems?: { description: string; quantity: number; unit_price: number }[];
  onClose: () => void;
  onAdded?: () => void;
}

export function ScopeChangeModal({
  jobId,
  threadId,
  initialItems,
  onClose,
  onAdded,
}: ScopeChangeModalProps) {
  const [items, setItems] = useState(
    initialItems || [{ description: "", quantity: 1, unit_price: 0 }],
  );
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSaving(true);
    const result = await addScopeFromEmail(jobId, threadId || null, validItems);
    if (result.success) {
      toast.success("Scope updated");
      onAdded?.();
      onClose();
    } else {
      toast.error(result.error || "Failed to add scope");
    }
    setSaving(false);
  };

  const total = items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-[#0e0e10] border-t border-white/10 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold text-white mb-1">Add Scope Change</h2>
        <p className="text-xs text-gray-400 mb-4">
          These items will be added as change orders to the job.
        </p>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  Item {i + 1}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                value={item.description}
                onChange={(e) =>
                  updateItem(i, "description", e.target.value)
                }
                placeholder="What needs doing?"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Qty
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", Number(e.target.value))
                    }
                    min={1}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(i, "unit_price", Number(e.target.value))
                    }
                    min={0}
                    step={0.01}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="w-full mt-3 py-2 text-sm text-primary/70 hover:text-primary border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>

        {total > 0 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
            <span className="text-sm font-bold text-gray-400">
              Change Order Total
            </span>
            <span className="text-lg font-bold text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <AnimatedButton
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            className="flex-1"
            onClick={handleSubmit}
            disabled={saving}
            isLoading={saving}
          >
            Add to Job
          </AnimatedButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
