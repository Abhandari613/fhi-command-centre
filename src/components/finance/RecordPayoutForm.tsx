"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { recordSubPayout } from "@/app/actions/finance-bridge-actions";
import { useRouter } from "next/navigation";

type Sub = {
  id: string;
  name: string;
  trade?: string | null;
};

export function RecordPayoutForm({
  jobId,
  subs,
}: {
  jobId: string;
  subs: Sub[];
}) {
  const router = useRouter();
  const [subId, setSubId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subId || !amount) return;

    setLoading(true);
    setError("");

    const result = await recordSubPayout(
      jobId,
      subId,
      parseFloat(amount),
      description || "Sub payout"
    );

    if (!result.success) {
      setError(result.error || "Failed to record payout");
      setLoading(false);
      return;
    }

    setSubId("");
    setAmount("");
    setDescription("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        >
          <option value="">Select sub...</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.trade ? `(${s.trade})` : ""}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount ($)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !subId || !amount}
        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Record Payout"
        )}
      </button>
    </form>
  );
}
