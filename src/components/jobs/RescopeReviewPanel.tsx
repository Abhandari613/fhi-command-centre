"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  acceptRescopeTasks,
  dismissRescopeTasks,
} from "@/app/actions/rescope-actions";
import {
  AlertCircle,
  Check,
  X,
  CheckCheck,
  XCircle,
  Loader2,
} from "lucide-react";

type Task = {
  id: string;
  description: string;
  scope_round: number;
  source: string;
};

export function RescopeReviewPanel({
  jobId,
  tasks,
  onUpdate,
}: {
  jobId: string;
  tasks: Task[];
  onUpdate: () => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (tasks.length === 0) return null;

  const visibleTasks = tasks.filter((t) => !dismissed.has(t.id));
  if (visibleTasks.length === 0) return null;

  const handleAccept = async (taskId: string) => {
    setProcessing(taskId);
    await acceptRescopeTasks(jobId, [taskId]);
    setProcessing(null);
    onUpdate();
  };

  const handleDismiss = async (taskId: string) => {
    setProcessing(taskId);
    await dismissRescopeTasks(jobId, [taskId]);
    setDismissed((prev) => new Set([...prev, taskId]));
    setProcessing(null);
  };

  const handleAcceptAll = async () => {
    setProcessing("all");
    await acceptRescopeTasks(
      jobId,
      visibleTasks.map((t) => t.id),
    );
    setProcessing(null);
    onUpdate();
  };

  const handleDismissAll = async () => {
    setProcessing("all");
    await dismissRescopeTasks(
      jobId,
      visibleTasks.map((t) => t.id),
    );
    setDismissed(
      (prev) => new Set([...prev, ...visibleTasks.map((t) => t.id)]),
    );
    setProcessing(null);
  };

  return (
    <GlassCard className="p-4 border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-yellow-400" />
        <h3 className="text-sm font-bold text-yellow-400">
          New Scope Items Detected ({visibleTasks.length})
        </h3>
      </div>

      <p className="text-xs opacity-60 mb-3">
        AI identified additional work from on-site photos. Review and accept or
        dismiss each item.
      </p>

      <ul className="space-y-2 mb-4">
        {visibleTasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
          >
            <span className="text-sm flex-1">{task.description}</span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => handleAccept(task.id)}
                disabled={processing !== null}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all"
                title="Accept"
              >
                {processing === task.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleDismiss(task.id)}
                disabled={processing !== null}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          onClick={handleAcceptAll}
          disabled={processing !== null}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30"
        >
          {processing === "all" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          Accept All
        </button>
        <button
          onClick={handleDismissAll}
          disabled={processing !== null}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30"
        >
          <XCircle className="w-4 h-4" />
          Dismiss All
        </button>
      </div>
    </GlassCard>
  );
}
