"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { getJobWithAttachments } from "@/app/actions/scope-actions";
import { advanceJobStatus } from "@/app/actions/dashboard-jobs-actions";
import {
  MapPin,
  Mail,
  AlertTriangle,
  Camera,
  CheckSquare,
  FileText,
  Loader2,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  incoming: "Incoming",
  quoted: "Quoted",
  in_progress: "In Progress",
  invoiced: "Invoiced",
  paid: "Paid",
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  active: "Active",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  incoming: "bg-blue-500/20 text-blue-400",
  quoted: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-orange-500/20 text-orange-400",
  invoiced: "bg-purple-500/20 text-purple-400",
  paid: "bg-green-500/20 text-green-400",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    const data = await getJobWithAttachments(id);
    setJob(data.job);
    setAttachments(data.attachments);
    setTasks(data.tasks);
    setLoaded(true);
  };

  const handleAdvance = async () => {
    setAdvancing(true);
    await advanceJobStatus(id);
    await loadJob();
    setAdvancing(false);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20 opacity-40">
        <p>Job not found</p>
      </div>
    );
  }

  const confirmedTasks = tasks.filter((t: any) => t.is_confirmed);
  const quotedTotal = confirmedTasks.reduce(
    (sum: number, t: any) => sum + (t.quantity || 1) * (t.unit_price || 0),
    0
  );
  const photos = attachments.filter((a: any) => a.file_type === "photo");
  const statusColor = STATUS_COLORS[job.status] || "bg-white/10 text-white/60";

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-mono font-bold opacity-60">
            {job.job_number}
          </span>
          {job.urgency === "rush" && (
            <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Rush
            </span>
          )}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {job.property_address || job.address || job.title}
        </h1>
      </header>

      {/* Status + advance */}
      <GlassCard className="p-4 flex items-center justify-between">
        <div>
          <span className="text-xs opacity-50 block mb-1">Status</span>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}
          >
            {STATUS_LABELS[job.status] || job.status}
          </span>
        </div>
        {!["paid", "completed", "cancelled"].includes(job.status) && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="min-w-[44px] min-h-[44px] bg-white/5 hover:bg-white/10 rounded-xl px-4 flex items-center gap-2 text-sm font-medium transition-all"
          >
            {advancing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </GlassCard>

      {/* Quick info */}
      <GlassCard className="p-4 space-y-3">
        {(job.property_address || job.address) && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-0.5 opacity-50 flex-shrink-0" />
            <span className="text-sm">{job.property_address || job.address}</span>
          </div>
        )}
        {job.requester_email && (
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 mt-0.5 opacity-50 flex-shrink-0" />
            <span className="text-sm">{job.requester_name || job.requester_email}</span>
          </div>
        )}
        {job.due_date && (
          <div className="text-sm opacity-60">
            Due:{" "}
            {new Date(job.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
        {quotedTotal > 0 && (
          <div className="text-lg font-bold text-green-400">
            ${quotedTotal.toFixed(2)} quoted
          </div>
        )}
      </GlassCard>

      {/* Email source */}
      {job.source_email_subject && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-bold opacity-60 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Original Email
          </h3>
          <p className="text-sm font-medium mb-1">{job.source_email_subject}</p>
          {job.source_email_body && (
            <p className="text-xs opacity-50 whitespace-pre-wrap line-clamp-6">
              {job.source_email_body}
            </p>
          )}
        </GlassCard>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-bold opacity-60 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((a: any) => (
              <img
                key={a.id}
                src={a.file_url}
                alt="Job photo"
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tasks summary */}
      {confirmedTasks.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-bold opacity-60 mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Scope ({confirmedTasks.length} tasks)
          </h3>
          <ul className="space-y-1">
            {confirmedTasks.map((t: any) => (
              <li key={t.id} className="text-sm flex justify-between">
                <span>{t.description}</span>
                {t.unit_price > 0 && (
                  <span className="text-green-400 font-medium">
                    ${((t.quantity || 1) * t.unit_price).toFixed(0)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Action links */}
      <div className="space-y-3">
        <Link
          href={`/ops/jobs/${id}/scope`}
          className="w-full bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          <ClipboardList className="w-5 h-5" />
          Edit Scope
        </Link>
        <Link
          href={`/ops/jobs/${id}/quote`}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
        >
          <FileText className="w-5 h-5" />
          Build Quote
        </Link>
      </div>
    </div>
  );
}
