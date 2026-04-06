"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { logJobEvent } from "@/app/actions/event-actions";
import {
  ArrowLeft,
  Loader2,
  Briefcase,
  Printer,
  Send,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AssignSubModal } from "@/components/work-orders/AssignSubModal";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { PaymentList } from "@/components/payments/PaymentList";
import { JobPhotoGallery } from "@/components/work-orders/JobPhotoGallery";
import { TaskCompletionList } from "@/components/work-orders/TaskCompletionList";
import { getWorkOrderLinkedJob } from "@/app/actions/work-order-actions";
import { createInvoiceFromWorkOrder, sendInvoice } from "@/app/actions/invoice-from-wo-actions";
import { motion } from "framer-motion";
import { User, Phone, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";

// TODO: Sync Supabase types to include work_orders/work_order_tasks tables
type WorkOrderRow = any;
type ClientRow = any;
type WorkOrderTaskRow = any;

type WorkOrderWithDetails = WorkOrderRow & {
  clients: ClientRow | null;
  work_order_tasks: WorkOrderTaskRow[];
};

export default function WorkOrderDetailsPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  const [photos, setPhotos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [linkedJob, setLinkedJob] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    // Query by work_order_id (new) OR job_id=work_order.id (legacy workaround for existing records)
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .or(`work_order_id.eq.${id},job_id.eq.${id}`)
      .order("created_at", { ascending: false });
    setPhotos(data || []);
  }, [supabase, id]);

  const fetchPayments = useCallback(async () => {
    // Transactions matched to this work_order
    const { data } = await supabase
      .from("finance_transactions")
      .select("*")
      .eq("work_order_id", id)
      .order("transaction_date", { ascending: false });
    setPayments(data || []);
  }, [supabase, id]);

  useEffect(() => {
    const fetchWorkOrder = async () => {
      const { data, error } = await (supabase.from as any)("work_orders")
        .select("*, clients(*), work_order_tasks(*, subcontractors(*))")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching work order:", error);
      } else {
        setWorkOrder(data as unknown as WorkOrderWithDetails);
      }

      // Events (Reusing job_events as work_order_events for now)
      const { data: eventsData } = await supabase
        .from("job_events")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false });

      setEvents(eventsData || []);

      // Load linked job if this work order was created from a job
      const job = await getWorkOrderLinkedJob(id);
      setLinkedJob(job);

      setLoading(false);
    };

    if (id) {
      fetchWorkOrder();
      fetchPayments();
      fetchPhotos();
    }
  }, [id, supabase, fetchPayments, fetchPhotos]);

  const calculateTotal = () => {
    return (
      workOrder?.work_order_tasks?.reduce(
        (sum: number, item: WorkOrderTaskRow) =>
          sum + (item.cost_estimate || 0),
        0,
      ) || 0
    );
  };

  const calculatePaid = () => {
    return payments
      .filter((p) => p.amount > 0)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const handleUpdateStatus = async (status: string) => {
    const { error } = await (supabase.from as any)("work_orders")
      .update({ status })
      .eq("id", id);
    if (!error && workOrder) {
      setWorkOrder({ ...workOrder, status });
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8 h-screen items-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  if (!workOrder)
    return (
      <div className="p-8 text-center text-xl font-bold opacity-50">
        Work Order not found
      </div>
    );

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      <div className="aurora-blur bg-primary/20 top-[-50px] left-[-50px]" />

      <div className="p-6 flex flex-col gap-6 relative z-10">
        <header className="flex items-center gap-4">
          <Link href="/ops/work-orders">
            <AnimatedButton
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </AnimatedButton>
          </Link>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-xl font-black tracking-tight truncate">
              {workOrder.property_address_or_unit}
            </h1>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <span className="uppercase font-bold tracking-wider text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20">
                {workOrder.status}
              </span>
              <span className="font-mono text-xs">
                #{workOrder.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </header>

        {/* Linked Job context */}
        {linkedJob && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href={`/ops/jobs/${linkedJob.id}`}>
              <GlassCard className="p-4 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-primary opacity-70" />
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest mb-0.5">
                      Linked Job
                    </p>
                    <p className="text-sm font-bold">
                      {linkedJob.job_number} —{" "}
                      {linkedJob.property_address || linkedJob.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full capitalize">
                    {linkedJob.status}
                  </span>
                  <ExternalLink className="w-4 h-4 opacity-30" />
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard intensity="panel" className="p-6 space-y-8">
            {/* Header Info */}
            <div className="flex justify-between items-start border-b border-white/5 pb-6">
              <div>
                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">
                  Property Manager / Client
                </h3>
                <div className="font-bold text-lg">
                  {workOrder.clients?.name}
                </div>
                <div className="text-sm opacity-60 font-medium">
                  {workOrder.clients?.email}
                </div>
                <div className="text-sm opacity-60 font-medium">
                  {workOrder.clients?.phone}
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest mb-2">
                  Received Date
                </h3>
                <div className="font-mono font-bold text-primary">
                  {workOrder.received_at
                    ? new Date(workOrder.received_at).toLocaleDateString()
                    : new Date(workOrder.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Tasks (Line Items) */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-[10px] opacity-40 uppercase font-bold tracking-widest">
                  Tasks & Subcontractors
                </h3>
                <AnimatedButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  + Task / Assign
                </AnimatedButton>
              </div>

              {/* Task completion list with checkboxes (TRACK 3) */}
              {workOrder.work_order_tasks.length === 0 ? (
                <div className="text-sm opacity-50 italic text-center py-2">
                  No tasks defined.
                </div>
              ) : (
                <TaskCompletionList
                  tasks={workOrder.work_order_tasks}
                  workOrderId={id}
                  onAllComplete={() => {
                    toast.success("All tasks complete!", {
                      description: "Ready to create invoice?",
                    });
                  }}
                  onTaskToggle={async () => {
                    // Refresh work order data
                    const { data: refreshed } = await (supabase.from as any)("work_orders")
                      .select("*, clients(*), work_order_tasks(*, subcontractors(*))")
                      .eq("id", id)
                      .single();
                    if (refreshed) setWorkOrder(refreshed as unknown as WorkOrderWithDetails);
                  }}
                />
              )}
            </div>

            {/* Total Estimate */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="font-bold text-lg opacity-80">
                Total Value Estimate
              </span>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Subcontractor Photos / Completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard intensity="panel" className="p-6">
            <JobPhotoGallery
              jobId={workOrder.id}
              photos={photos}
              type="after" // Reuse logic
              title="Work Photos"
            />
          </GlassCard>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {workOrder.status === "Draft" && (
            <AnimatedButton
              onClick={() => handleUpdateStatus("Scheduled")}
              size="lg"
              className="w-full shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-gradient-to-r from-emerald-500 to-emerald-600 border-none"
            >
              Mark as Scheduled
            </AnimatedButton>
          )}

          {workOrder.status === "Scheduled" && (
            <AnimatedButton
              onClick={() => handleUpdateStatus("In Progress")}
              size="lg"
              className="w-full shadow-[0_4px_20px_-2px_rgba(255,107,0,0.4)] bg-gradient-to-b from-primary to-[#e05e00] border-none"
            >
              <Loader2 className="animate-spin w-5 h-5 mr-2" /> Start Work
            </AnimatedButton>
          )}

          {/* Create Invoice (TRACK 4) */}
          {(workOrder.status === "Completed" ||
            workOrder.work_order_tasks.every(
              (t: any) => t.status === "Completed",
            )) && (
            <AnimatedButton
              onClick={async () => {
                setCreatingInvoice(true);
                const result = await createInvoiceFromWorkOrder(id);
                if (result.success && result.invoiceId) {
                  setInvoiceId(result.invoiceId);
                  toast.success("Invoice created!", {
                    action: {
                      label: "Send Now",
                      onClick: async () => {
                        const sendResult = await sendInvoice(result.invoiceId!);
                        if (sendResult.success) {
                          toast.success("Invoice sent!");
                        } else {
                          toast.error(sendResult.error || "Send failed");
                        }
                      },
                    },
                  });
                } else {
                  toast.error(result.error || "Failed to create invoice");
                }
                setCreatingInvoice(false);
              }}
              disabled={creatingInvoice}
              isLoading={creatingInvoice}
              size="lg"
              className="w-full shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-gradient-to-r from-purple-500 to-purple-600 border-none"
            >
              <Receipt className="w-5 h-5 mr-2" />
              Create Invoice
            </AnimatedButton>
          )}

          {/* Send Invoice if created */}
          {invoiceId && (
            <AnimatedButton
              onClick={async () => {
                const result = await sendInvoice(invoiceId!);
                if (result.success) {
                  toast.success("Invoice sent to client!");
                  setInvoiceId(null);
                } else {
                  toast.error(result.error || "Send failed");
                }
              }}
              size="lg"
              className="w-full shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-gradient-to-r from-indigo-500 to-indigo-600 border-none"
            >
              <Send className="w-5 h-5 mr-2" />
              Send Invoice
            </AnimatedButton>
          )}

          <AnimatedButton
            variant="secondary"
            onClick={() => window.print()}
            className="w-full"
          >
            <Printer className="w-5 h-5 mr-2 opacity-70" />
            Print Work Order
          </AnimatedButton>
        </motion.div>

        {/* Payments Reconciliation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Financial Tracking</h3>
              <Link href="/ops/finance">
                <AnimatedButton
                  size="sm"
                  variant="secondary"
                  className="border-emerald-500/50"
                >
                  View Finance
                </AnimatedButton>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                <div className="text-[10px] uppercase opacity-50 font-bold mb-1">
                  Total Value
                </div>
                <div className="font-bold font-mono text-sm">
                  ${calculateTotal().toFixed(2)}
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                <div className="text-[10px] uppercase opacity-50 font-bold mb-1">
                  Paid / Ingested
                </div>
                <div className="font-bold font-mono text-sm text-emerald-400">
                  ${calculatePaid().toFixed(2)}
                </div>
              </div>
            </div>
            {payments.length === 0 ? (
              <p className="text-xs italic opacity-50">
                No transactions matched to this Work Order yet.
              </p>
            ) : null}
          </GlassCard>
        </motion.div>

        {/* Notes / Comments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary opacity-70" />
              Notes & Comments
            </h3>

            {/* Add note */}
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newNote.trim()) {
                    setAddingNote(true);
                    await logJobEvent(id, "note_added", {
                      note: newNote.trim(),
                    });
                    // Refresh events
                    const { data: eventsData } = await supabase
                      .from("job_events")
                      .select("*")
                      .eq("job_id", id)
                      .order("created_at", { ascending: false });
                    setEvents(eventsData || []);
                    setNewNote("");
                    setAddingNote(false);
                  }
                }}
              />
              <AnimatedButton
                variant="secondary"
                size="sm"
                disabled={addingNote || !newNote.trim()}
                onClick={async () => {
                  if (!newNote.trim()) return;
                  setAddingNote(true);
                  await logJobEvent(id, "note_added", {
                    note: newNote.trim(),
                  });
                  const { data: eventsData } = await supabase
                    .from("job_events")
                    .select("*")
                    .eq("job_id", id)
                    .order("created_at", { ascending: false });
                  setEvents(eventsData || []);
                  setNewNote("");
                  setAddingNote(false);
                }}
              >
                {addingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </AnimatedButton>
            </div>

            {/* Event / note feed */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-xs italic opacity-50 text-center py-2">
                  No notes or activity yet.
                </p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                        {(ev.event_type || "event").replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-white/30 font-mono">
                        {new Date(ev.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {ev.metadata?.note && (
                      <p className="text-white/70">{ev.metadata.note}</p>
                    )}
                    {!ev.metadata?.note && ev.metadata && (
                      <p className="text-white/40 text-xs">
                        {JSON.stringify(ev.metadata)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Modal is kept generic for now, ideally updated to assign a specific task */}
        <AssignSubModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          jobId={workOrder.id}
          onAssigned={() => {}}
        />
      </div>
    </div>
  );
}
