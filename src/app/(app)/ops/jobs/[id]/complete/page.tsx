"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { CompletionProgressBar } from "@/components/completion/CompletionProgressBar";
import { TaskPhotoLinker } from "@/components/completion/TaskPhotoLinker";
import { PunchListPanel } from "@/components/completion/PunchListPanel";
import {
  createCompletionReport,
  getCompletionReport,
  getReconciliationStatus,
  getCompletionPhotos,
  sendCompletionReport,
  getPunchListItems,
} from "@/app/actions/completion-actions";
import {
  ClipboardCheck,
  Send,
  Loader2,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function CompletionPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [punchItems, setPunchItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const loadData = async () => {
    const [recon, photoData, reportData, punch] = await Promise.all([
      getReconciliationStatus(jobId),
      getCompletionPhotos(jobId),
      getCompletionReport(jobId),
      getPunchListItems(jobId),
    ]);

    setReconciliation(recon);
    setPhotos(photoData);
    setReport(reportData);
    setPunchItems(punch);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [jobId]);

  const handleGenerateReport = async () => {
    const result = await createCompletionReport(jobId);
    if (result.success) {
      await loadData();
    }
  };

  const handleSend = async () => {
    if (!report) return;
    setSending(true);

    const result = await sendCompletionReport(report.id, [
      "neilh@allprofessionaltrades.com",
      "coady@allprofessionaltrades.com",
    ]);

    setSending(false);
    if (result.success) {
      setSent(true);
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  const allLinked =
    reconciliation &&
    reconciliation.total > 0 &&
    reconciliation.linked >= reconciliation.total;
  const reportSent = report?.status === "sent" || report?.status === "approved";
  const reportApproved = report?.status === "approved";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-extrabold tracking-tight">
            Completion Report
          </h1>
        </div>
        <p className="text-sm opacity-60">
          Link completion photos to each task, then send to Neil for approval.
        </p>
      </header>

      {/* Progress */}
      {reconciliation && (
        <GlassCard className="p-4">
          <CompletionProgressBar
            total={reconciliation.total}
            linked={reconciliation.linked}
          />
        </GlassCard>
      )}

      {/* Report status */}
      {reportApproved && (
        <GlassCard className="p-6 bg-green-500/10 border-green-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-green-400">Approved</h3>
            <p className="text-sm opacity-60">
              Neil approved the completion report.
            </p>
          </div>
        </GlassCard>
      )}

      {reportSent && !reportApproved && (
        <GlassCard className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-blue-400">Report Sent</h3>
              <p className="text-xs opacity-60">
                Waiting for Neil&apos;s inspection and approval.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Punch list */}
      <PunchListPanel items={punchItems} />

      {/* Task-Photo Linker */}
      {reconciliation && (
        <GlassCard className="p-4">
          <TaskPhotoLinker
            tasks={reconciliation.tasks}
            photos={photos}
            onUpdate={loadData}
          />
        </GlassCard>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {!report && (
          <button
            onClick={handleGenerateReport}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px]"
          >
            <FileText className="w-5 h-5" />
            Generate Report
          </button>
        )}

        {report && !reportSent && (
          <button
            onClick={handleSend}
            disabled={!allLinked || sending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[56px] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {allLinked
              ? "Send to Neil"
              : `Link all tasks first (${reconciliation?.unlinked} remaining)`}
          </button>
        )}
      </div>
    </div>
  );
}
