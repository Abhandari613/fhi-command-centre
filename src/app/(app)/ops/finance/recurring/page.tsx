"use client";

import { useEffect, useState, useTransition } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { RecurringScheduleCard } from "@/components/finance/RecurringScheduleCard";
import {
  getRecurringSchedules,
  createRecurringSchedule,
  type RecurringSchedule,
} from "@/app/actions/recurring-schedule-actions";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Plus, Loader2, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function RecurringPage() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formFreq, setFormFreq] = useState("monthly");
  const [formNextDue, setFormNextDue] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formItems, setFormItems] = useState([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [formDeposit, setFormDeposit] = useState(false);
  const [formDepositAmt, setFormDepositAmt] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sched, clientRes] = await Promise.all([
      getRecurringSchedules(),
      supabase.from("clients").select("id, name").order("name"),
    ]);
    setSchedules(sched);
    setClients(clientRes.data || []);
    setLoading(false);
  };

  const handleCreate = () => {
    if (!formClientId || !formTitle) return;
    startTransition(async () => {
      await createRecurringSchedule({
        client_id: formClientId,
        title: formTitle,
        frequency: formFreq,
        next_due: formNextDue,
        line_items: formItems.filter((li) => li.description.trim()),
        deposit_required: formDeposit,
        deposit_amount: formDeposit ? formDepositAmt : undefined,
      });
      setShowCreate(false);
      resetForm();
      await loadData();
    });
  };

  const resetForm = () => {
    setFormClientId("");
    setFormTitle("");
    setFormFreq("monthly");
    setFormNextDue(new Date().toISOString().split("T")[0]);
    setFormItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setFormDeposit(false);
    setFormDepositAmt(0);
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

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
              Recurring Schedules
            </h1>
            <p className="text-sm text-white/50">
              {schedules.length} schedule{schedules.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <AnimatedButton size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New
        </AnimatedButton>
      </header>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <GlassCard intensity="panel" className="p-6 relative">
                <button
                  onClick={() => setShowCreate(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" /> New Recurring
                  Schedule
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase font-bold opacity-60 ml-1">
                      Client
                    </label>
                    <select
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                    >
                      <option value="">Select client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold opacity-60 ml-1">
                      Title
                    </label>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      placeholder="Monthly property maintenance"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold opacity-60 ml-1">
                        Frequency
                      </label>
                      <select
                        value={formFreq}
                        onChange={(e) => setFormFreq(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold opacity-60 ml-1">
                        Next Due
                      </label>
                      <input
                        type="date"
                        value={formNextDue}
                        onChange={(e) => setFormNextDue(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <label className="text-xs uppercase font-bold opacity-60 ml-1">
                      Line Items
                    </label>
                    {formItems.map((li, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 mt-1">
                        <input
                          value={li.description}
                          onChange={(e) =>
                            updateLineItem(idx, "description", e.target.value)
                          }
                          className="col-span-3 bg-black/20 border border-white/10 rounded-lg p-2 text-sm focus:border-primary/50 focus:outline-none"
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              idx,
                              "quantity",
                              Number(e.target.value) || 1,
                            )
                          }
                          className="col-span-1 bg-black/20 border border-white/10 rounded-lg p-2 text-sm focus:border-primary/50 focus:outline-none"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          value={li.unit_price}
                          onChange={(e) =>
                            updateLineItem(
                              idx,
                              "unit_price",
                              Number(e.target.value) || 0,
                            )
                          }
                          className="col-span-2 bg-black/20 border border-white/10 rounded-lg p-2 text-sm focus:border-primary/50 focus:outline-none"
                          placeholder="Price"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setFormItems((prev) => [
                          ...prev,
                          { description: "", quantity: 1, unit_price: 0 },
                        ])
                      }
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      + Add line item
                    </button>
                  </div>

                  {/* Deposit */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formDeposit}
                      onChange={(e) => setFormDeposit(e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-sm">Require deposit</label>
                    {formDeposit && (
                      <input
                        type="number"
                        value={formDepositAmt}
                        onChange={(e) =>
                          setFormDepositAmt(Number(e.target.value) || 0)
                        }
                        className="w-24 bg-black/20 border border-white/10 rounded-lg p-2 text-sm focus:border-primary/50 focus:outline-none"
                        placeholder="$0"
                      />
                    )}
                  </div>

                  <AnimatedButton
                    onClick={handleCreate}
                    disabled={isPending || !formClientId || !formTitle}
                    className="w-full"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create Schedule
                  </AnimatedButton>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <RotateCcw className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="text-sm text-white/40">No recurring schedules yet.</p>
          <AnimatedButton
            size="sm"
            className="mt-4"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" /> Create First Schedule
          </AnimatedButton>
        </GlassCard>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {schedules.map((s) => (
            <RecurringScheduleCard
              key={s.id}
              schedule={s}
              clientName={clientMap[s.client_id]}
              onToggle={loadData}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
