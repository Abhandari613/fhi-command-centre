"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Send,
} from "lucide-react";

export default function CompletionReviewPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const supabase = createClient() as any;
  const [job, setJob] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showPunchForm, setShowPunchForm] = useState(false);
  const [punchItems, setPunchItems] = useState<string[]>([""]);
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const [punchSubmitted, setPunchSubmitted] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    // Fetch job
    const { data: jobData } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    setJob(jobData);

    // Fetch tasks with photos
    const { data: taskData } = await supabase
      .from("job_tasks")
      .select("id, description, quantity, unit_price")
      .eq("job_id", jobId)
      .eq("is_confirmed", true);

    if (taskData) {
      const taskIds = taskData.map((t: any) => t.id);
      const { data: links } = await supabase
        .from("task_photo_links")
        .select("task_id, photo_id, job_photos(url)")
        .in("task_id", taskIds);

      const enriched = taskData.map((task: any) => ({
        ...task,
        photos: (links || [])
          .filter((l: any) => l.task_id === task.id)
          .map((l: any) => l.job_photos?.url)
          .filter(Boolean),
      }));

      setTasks(enriched);
    }

    // Fetch report
    const { data: reportData } = await supabase
      .from("completion_reports")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setReport(reportData);
    if (reportData?.status === "approved") setApproved(true);

    setLoading(false);
  };

  const handleApprove = async () => {
    if (!report) return;
    setApproving(true);

    await supabase
      .from("completion_reports")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", report.id);

    await supabase
      .from("jobs")
      .update({ status: "invoiced" })
      .eq("id", jobId);

    await supabase.from("job_events").insert({
      job_id: jobId,
      event_type: "completion_approved",
      metadata: { reportId: report.id, source: "portal" },
    });

    setApproving(false);
    setApproved(true);
  };

  const handleSubmitPunchList = async () => {
    if (!report) return;
    const validItems = punchItems.filter((i) => i.trim());
    if (validItems.length === 0) return;

    setSubmittingPunch(true);

    await supabase
      .from("completion_reports")
      .update({ status: "punch_list" })
      .eq("id", report.id);

    const rows = validItems.map((desc) => ({
      completion_report_id: report.id,
      job_id: jobId,
      description: desc.trim(),
      status: "open",
    }));

    await supabase.from("punch_list_items").insert(rows);

    await supabase.from("job_events").insert({
      job_id: jobId,
      event_type: "punch_list_created",
      metadata: { reportId: report.id, itemCount: validItems.length, source: "portal" },
    });

    setSubmittingPunch(false);
    setPunchSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-gray-900 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-6 h-6 text-orange-400" />
            <h1 className="text-xl font-bold">Completion Report</h1>
          </div>
          <p className="text-sm opacity-70">
            {job.job_number} — {job.property_address || job.address}
          </p>
        </div>

        {/* Approved state */}
        {approved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-green-800">Approved</h3>
              <p className="text-sm text-green-600">
                This completion report has been approved.
              </p>
            </div>
          </div>
        )}

        {punchSubmitted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-yellow-800">Punch List Submitted</h3>
              <p className="text-sm text-yellow-600">
                Frank has been notified of the items that need attention.
              </p>
            </div>
          </div>
        )}

        {/* Task list with photos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">
              Tasks ({tasks.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {tasks.map((task: any) => (
              <div key={task.id} className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {task.description}
                    </p>
                    {task.unit_price > 0 && (
                      <p className="text-sm text-gray-500">
                        ${((task.quantity || 1) * task.unit_price).toFixed(2)}
                      </p>
                    )}
                    {task.photos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {task.photos.map((url: string, i: number) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Completion ${i + 1}`}
                            className="w-24 h-18 object-cover rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!approved && !punchSubmitted && (
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all"
            >
              {approving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              Approve & Authorize Payment
            </button>

            {!showPunchForm ? (
              <button
                onClick={() => setShowPunchForm(true)}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Report Punch List Items
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Punch List Items
                </h3>
                {punchItems.map((item, i) => (
                  <input
                    key={i}
                    value={item}
                    onChange={(e) => {
                      const updated = [...punchItems];
                      updated[i] = e.target.value;
                      setPunchItems(updated);
                    }}
                    placeholder={`Issue ${i + 1}: describe the problem...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPunchItems([...punchItems, ""])}
                    className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add item
                  </button>
                </div>
                <button
                  onClick={handleSubmitPunchList}
                  disabled={submittingPunch}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all"
                >
                  {submittingPunch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Punch List
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Frank&apos;s Home Improvement — Completion Review Portal
        </p>
      </div>
    </div>
  );
}
