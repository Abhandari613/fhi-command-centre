"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getJobWithAttachments,
  saveJobTasks,
  confirmJobTasks,
} from "@/app/actions/scope-actions";
import {
  Camera,
  Check,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Task = {
  id?: string;
  description: string;
  is_confirmed: boolean;
};

export default function ScopePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    const data = await getJobWithAttachments(id);
    setJob(data.job);
    setAttachments(data.attachments);
    setTasks(
      data.tasks.map((t: any) => ({
        id: t.id,
        description: t.description,
        is_confirmed: t.is_confirmed,
      })),
    );
    setLoaded(true);
  };

  const scanPhotos = async () => {
    const photoUrls = attachments
      .filter((a: any) => a.file_type === "photo")
      .map((a: any) => a.file_url);

    if (!photoUrls.length) return;

    setScanning(true);
    try {
      const res = await fetch("/api/ai/scope-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: photoUrls }),
      });
      const data = await res.json();
      if (data.tasks?.length) {
        const newTasks: Task[] = data.tasks.map((desc: string) => ({
          description: desc,
          is_confirmed: false,
        }));
        setTasks((prev) => [...prev, ...newTasks]);
      }
    } catch (err) {
      console.error("AI scan failed:", err);
    }
    setScanning(false);
  };

  const toggleConfirm = (idx: number) => {
    setTasks((prev) =>
      prev.map((t, i) =>
        i === idx ? { ...t, is_confirmed: !t.is_confirmed } : t,
      ),
    );
  };

  const removeTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { description: newTask.trim(), is_confirmed: true },
    ]);
    setNewTask("");
  };

  const handleSave = async () => {
    setSaving(true);
    await saveJobTasks(id, tasks);

    const confirmedIds = tasks
      .filter((t) => t.is_confirmed && t.id)
      .map((t) => t.id!);
    if (confirmedIds.length) {
      await confirmJobTasks(id, confirmedIds);
    }

    setSaving(false);
    router.push(`/ops/jobs/${id}/quote`);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  const photoAttachments = attachments.filter(
    (a: any) => a.file_type === "photo",
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Scope Work</h1>
        <p className="text-sm opacity-70">
          {job?.job_number} &mdash; {job?.property_address || job?.title}
        </p>
      </header>

      {/* Photo thumbnails */}
      {photoAttachments.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 opacity-60" />
            <span className="text-sm font-semibold opacity-80">
              {photoAttachments.length} photo
              {photoAttachments.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photoAttachments.map((a: any) => (
              <img
                key={a.id}
                src={a.file_url}
                alt="Job photo"
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>

          {/* AI Scan button */}
          <button
            onClick={scanPhotos}
            disabled={scanning}
            className="mt-3 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[48px]"
          >
            {scanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning photos...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AI: Find tasks in photos
              </>
            )}
          </button>
        </GlassCard>
      )}

      {/* Task checklist */}
      <GlassCard className="p-4 space-y-3">
        <h2 className="text-lg font-bold">Task List</h2>

        <AnimatePresence>
          {tasks.map((task, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-3"
            >
              <button
                onClick={() => toggleConfirm(idx)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.is_confirmed
                      ? "bg-green-500 border-green-500"
                      : "border-white/30"
                  }`}
                >
                  {task.is_confirmed && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.is_confirmed ? "opacity-100" : "opacity-60"
                }`}
              >
                {task.description}
              </span>
              <button
                onClick={() => removeTask(idx)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 opacity-40 hover:opacity-80" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add manual task */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            onClick={addTask}
            className="min-w-[48px] min-h-[48px] bg-white/10 hover:bg-white/15 rounded-xl flex items-center justify-center transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </GlassCard>

      {/* Save & continue to quote */}
      <button
        onClick={handleSave}
        disabled={saving || tasks.filter((t) => t.is_confirmed).length === 0}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl py-4 text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Save &amp; Build Quote
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
}
