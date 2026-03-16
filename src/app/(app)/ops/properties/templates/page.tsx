"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  getTurnoverTemplates,
  createTurnoverTemplate,
  updateTurnoverTemplate,
  deleteTurnoverTemplate,
} from "@/app/actions/property-actions";
import type { TurnoverTemplate } from "@/types/properties";
import {
  ArrowLeft,
  Plus,
  Loader2,
  FileText,
  Pencil,
  Trash2,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type TemplateTask = {
  description: string;
  trade: string;
  estimated_cost: number | null;
  sort_order: number;
};

const TRADE_OPTIONS = [
  "general",
  "painting",
  "plumbing",
  "electrical",
  "cleaning",
  "flooring",
  "drywall",
  "carpentry",
  "appliances",
  "hvac",
  "locksmith",
  "pest_control",
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TurnoverTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TurnoverTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const data = await getTurnoverTemplates();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteTurnoverTemplate(id);
    await loadData();
    setDeleting(null);
  };

  const handleSaved = async () => {
    setShowCreate(false);
    setEditing(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 py-2"
      >
        {/* Header */}
        <motion.header variants={item} className="space-y-2">
          <Link
            href="/ops/properties"
            className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-primary font-mono transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            PROPERTIES
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Turnover Templates
            </h1>
            <AnimatedButton
              variant="primary"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </AnimatedButton>
          </div>
          <p className="text-[10px] font-mono text-white/30 tracking-wider">
            {templates.length} template{templates.length !== 1 ? "s" : ""} —
            reusable task lists for unit turnovers
          </p>
        </motion.header>

        {/* KPI strip */}
        <motion.section variants={item} className="grid grid-cols-3 gap-2">
          <GlassCard intensity="panel" className="p-2 text-center">
            <span className="text-lg font-black tabular-nums font-mono text-white/80">
              {templates.length}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-white/40 font-bold">
              Templates
            </p>
          </GlassCard>
          <GlassCard intensity="panel" className="p-2 text-center">
            <span className="text-lg font-black tabular-nums font-mono text-white/80">
              {templates.reduce((sum, t) => sum + t.tasks.length, 0)}
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-white/40 font-bold">
              Total Tasks
            </p>
          </GlassCard>
          <GlassCard intensity="panel" className="p-2 text-center">
            <span className="text-lg font-black tabular-nums font-mono text-white/80">
              {
                new Set(templates.flatMap((t) => t.tasks.map((tk) => tk.trade)))
                  .size
              }
            </span>
            <p className="text-[7px] uppercase tracking-[0.15em] text-white/40 font-bold">
              Trades
            </p>
          </GlassCard>
        </motion.section>

        {/* Template cards */}
        <motion.section variants={item} className="space-y-2">
          {templates.map((tmpl) => (
            <GlassCard key={tmpl.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="text-sm font-bold text-white truncate">
                      {tmpl.name}
                    </h3>
                  </div>
                  {tmpl.description && (
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-2">
                      {tmpl.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tmpl.tasks.map((task, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/50"
                      >
                        <Wrench className="w-2.5 h-2.5 text-white/25" />
                        {task.description}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30 font-mono">
                    <span>
                      {tmpl.tasks.length} task
                      {tmpl.tasks.length !== 1 ? "s" : ""}
                    </span>
                    {(() => {
                      const total = tmpl.tasks.reduce(
                        (sum, t) => sum + (t.estimated_cost ?? 0),
                        0,
                      );
                      return total > 0 ? (
                        <span className="flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {total.toLocaleString()}
                        </span>
                      ) : null;
                    })()}
                    <span>
                      {[...new Set(tmpl.tasks.map((t) => t.trade))].join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(tmpl)}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    title="Edit template"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white/30 hover:text-primary" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    disabled={deleting === tmpl.id}
                    className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    title="Delete template"
                  >
                    {deleting === tmpl.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}

          {templates.length === 0 && (
            <GlassCard className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-semibold text-white/40">
                No templates yet
              </p>
              <p className="text-xs text-white/20 mt-1">
                Create a template to reuse task lists across turnovers
              </p>
            </GlassCard>
          )}
        </motion.section>
      </motion.div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {(showCreate || editing) && (
          <TemplateModal
            template={editing}
            onClose={() => {
              setShowCreate(false);
              setEditing(null);
            }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Template Modal with inline Task Builder ──

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: TurnoverTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [tasks, setTasks] = useState<TemplateTask[]>(
    template?.tasks?.length
      ? [...template.tasks].sort((a, b) => a.sort_order - b.sort_order)
      : [
          {
            description: "",
            trade: "general",
            estimated_cost: null,
            sort_order: 0,
          },
        ],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        description: "",
        trade: "general",
        estimated_cost: null,
        sort_order: tasks.length,
      },
    ]);
  };

  const removeTask = (idx: number) => {
    if (tasks.length <= 1) return;
    const updated = tasks
      .filter((_, i) => i !== idx)
      .map((t, i) => ({ ...t, sort_order: i }));
    setTasks(updated);
  };

  const updateTask = (
    idx: number,
    field: keyof TemplateTask,
    value: string | number | null,
  ) => {
    const updated = [...tasks];
    updated[idx] = { ...updated[idx], [field]: value };
    setTasks(updated);
  };

  const moveTask = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const updated = [...tasks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setTasks(updated.map((t, i) => ({ ...t, sort_order: i })));
  };

  // Drag handlers
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...tasks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setTasks(updated.map((t, i) => ({ ...t, sort_order: i })));
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emptyTasks = tasks.filter((t) => !t.description.trim());
    if (emptyTasks.length > 0) {
      setError("All tasks must have a description");
      return;
    }

    setSaving(true);
    const payload = {
      ...(isEdit ? { id: template!.id } : {}),
      name: name.trim(),
      description: description.trim() || null,
      tasks: tasks.map((t, i) => ({
        description: t.description.trim(),
        trade: t.trade,
        estimated_cost: t.estimated_cost,
        sort_order: i,
      })),
    };

    const result = isEdit
      ? await updateTurnoverTemplate(payload)
      : await createTurnoverTemplate(payload);

    setSaving(false);

    if (result && "success" in result && !result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : ((result.error as any)?.message ?? "Save failed"),
      );
      return;
    }

    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <GlassCard intensity="solid" className="p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">
              {isEdit ? "Edit Template" : "New Template"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 1BR Turn"
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about when to use this template"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Task Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold">
                Tasks ({tasks.length})
              </label>
              <button
                type="button"
                onClick={addTask}
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-bold transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Task
              </button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex gap-2 items-start p-2 rounded-lg border transition-colors ${
                    dragIdx === idx
                      ? "border-primary/40 bg-primary/5"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  {/* Drag handle + reorder buttons */}
                  <div className="flex flex-col items-center gap-0.5 pt-2 shrink-0">
                    <GripVertical className="w-3.5 h-3.5 text-white/20 cursor-grab active:cursor-grabbing" />
                    <button
                      type="button"
                      onClick={() => moveTask(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20"
                    >
                      <ChevronUp className="w-3 h-3 text-white/30" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTask(idx, "down")}
                      disabled={idx === tasks.length - 1}
                      className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20"
                    >
                      <ChevronDown className="w-3 h-3 text-white/30" />
                    </button>
                  </div>

                  {/* Task fields */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="text"
                      value={task.description}
                      onChange={(e) =>
                        updateTask(idx, "description", e.target.value)
                      }
                      placeholder="Task description"
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <div className="flex gap-1.5">
                      <select
                        value={task.trade}
                        onChange={(e) =>
                          updateTask(idx, "trade", e.target.value)
                        }
                        className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white/60 focus:outline-none focus:border-primary/40 transition-colors"
                      >
                        {TRADE_OPTIONS.map((t) => (
                          <option key={t} value={t} className="bg-[#1a1a2e]">
                            {t.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                        <input
                          type="number"
                          value={task.estimated_cost ?? ""}
                          onChange={(e) =>
                            updateTask(
                              idx,
                              "estimated_cost",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          placeholder="Cost"
                          className="w-20 bg-white/[0.03] border border-white/[0.06] rounded pl-5 pr-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeTask(idx)}
                    disabled={tasks.length <= 1}
                    className="p-1 rounded hover:bg-red-500/10 transition-colors shrink-0 mt-1 disabled:opacity-20"
                  >
                    <X className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="primary"
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Template"
              )}
            </AnimatedButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}
