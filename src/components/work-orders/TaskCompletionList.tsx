"use client";

import { useState } from "react";
import {
  toggleTaskComplete,
  getTaskProgress,
} from "@/app/actions/task-completion-actions";
import { Check, Circle, Loader2, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskCompletionListProps {
  tasks: any[];
  workOrderId: string;
  onAllComplete?: () => void;
  onTaskToggle?: () => void;
}

export function TaskCompletionList({
  tasks: initialTasks,
  workOrderId,
  onAllComplete,
  onTaskToggle,
}: TaskCompletionListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const completedCount = tasks.filter(
    (t) => t.status === "Completed",
  ).length;
  const percentage =
    tasks.length > 0
      ? Math.round((completedCount / tasks.length) * 100)
      : 0;

  const handleToggle = async (taskId: string, currentlyComplete: boolean) => {
    setTogglingId(taskId);
    const result = await toggleTaskComplete(taskId, !currentlyComplete);

    if (result.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: !currentlyComplete ? "Completed" : "Pending",
                completed_at: !currentlyComplete
                  ? new Date().toISOString()
                  : null,
              }
            : t,
        ),
      );

      if (result.allComplete) {
        toast.success("All tasks complete!", {
          description: "Ready to advance status?",
        });
        onAllComplete?.();
      }

      onTaskToggle?.();
    } else {
      toast.error(result.error || "Failed to update task");
    }

    setTogglingId(null);
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-gray-400">
            {completedCount} of {tasks.length} tasks
          </span>
          <span className="text-xs font-bold text-primary">{percentage}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-[#e05e00] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isComplete = task.status === "Completed";
          const isToggling = togglingId === task.id;

          return (
            <motion.button
              key={task.id}
              onClick={() => handleToggle(task.id, isComplete)}
              disabled={isToggling}
              className={cn(
                "w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all",
                isComplete
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]",
              )}
              whileTap={{ scale: 0.98 }}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                  isComplete
                    ? "bg-emerald-500 text-black"
                    : "border-2 border-white/20",
                )}
              >
                {isToggling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isComplete ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : null}
              </div>

              {/* Task details */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isComplete
                      ? "text-emerald-400 line-through opacity-70"
                      : "text-white",
                  )}
                >
                  {task.trade_type && (
                    <span className="font-bold">{task.trade_type}: </span>
                  )}
                  {task.description}
                </p>
                {task.subcontractors && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    {task.subcontractors.name}
                  </div>
                )}
                {task.cost_estimate > 0 && (
                  <span className="text-xs text-emerald-400/60 font-mono mt-0.5 block">
                    ${task.cost_estimate.toFixed(2)}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
