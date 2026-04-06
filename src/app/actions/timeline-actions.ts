"use server";

import { createClient } from "@/utils/supabase/server";

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  metadata?: any;
};

/**
 * TRACK 10: Get the full lifecycle timeline for a job.
 */
export async function getJobTimeline(jobId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const events: TimelineEvent[] = [];

  // 1. Job events from job_events table
  const { data: jobEvents } = await supabase
    .from("job_events")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  for (const ev of jobEvents || []) {
    const type = ev.event_type || "event";
    const meta = ev.metadata as any;
    let title = type.replace(/_/g, " ");
    let description = "";

    // Enhance titles for known event types
    switch (type) {
      case "status_change":
        title = `Status: ${meta?.from} → ${meta?.to}`;
        break;
      case "status_completed":
        title = "Job Completed";
        description = meta?.note || "";
        break;
      case "invoice_created":
        title = `Invoice Created: ${meta?.invoiceNumber}`;
        description = `Total: $${meta?.total?.toFixed(2) || "0.00"}`;
        break;
      case "invoice_sent":
        title = "Invoice Sent";
        description = `To: ${meta?.to}`;
        break;
      case "email_linked":
        title = "Email Thread Linked";
        break;
      case "email_reply_sent":
        title = "Email Reply Sent";
        description = meta?.bodyPreview || "";
        break;
      case "photos_shared":
        title = `${meta?.photoCount} Photos Shared`;
        description = `Sent to ${meta?.to}`;
        break;
      case "scope_change_added":
        title = `Scope Change (+${meta?.itemCount} items)`;
        description = `Value: $${meta?.totalValue?.toFixed(2) || "0"}`;
        break;
      case "job_created_from_draft":
        title = "Job Created from Email Draft";
        break;
      case "note_added":
        title = "Note";
        description = meta?.note || "";
        break;
      case "deposit_paid":
        title = "Deposit Received";
        description = `Method: ${meta?.method}`;
        break;
      case "supplies_confirmed":
        title = "Supplies Confirmed";
        break;
      default:
        if (meta?.note) description = meta.note;
    }

    events.push({
      id: ev.id,
      type,
      title,
      description,
      actor: meta?.actor || "System",
      timestamp: ev.created_at,
      metadata: meta,
    });
  }

  // 2. Linked emails
  const { data: emailLinks } = await (supabase.from as any)("job_email_links")
    .select("linked_at, email_threads(subject, participants)")
    .eq("job_id", jobId);

  for (const link of emailLinks || []) {
    const thread = (link as any).email_threads;
    if (thread) {
      events.push({
        id: `email-${link.linked_at}`,
        type: "email_received",
        title: thread.subject || "Email",
        description: `From: ${(thread.participants || [])[0] || "unknown"}`,
        actor: "Email",
        timestamp: link.linked_at,
      });
    }
  }

  // 3. Finance transactions linked to job
  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("id, amount, transaction_date, description, status")
    .eq("job_id", jobId)
    .order("transaction_date", { ascending: true });

  for (const tx of transactions || []) {
    events.push({
      id: `tx-${tx.id}`,
      type: tx.amount > 0 ? "payment_received" : "expense_recorded",
      title:
        tx.amount > 0
          ? `Payment: $${tx.amount.toFixed(2)}`
          : `Expense: $${Math.abs(tx.amount).toFixed(2)}`,
      description: tx.description || "",
      actor: "Finance",
      timestamp: tx.transaction_date,
    });
  }

  // 4. Photos uploaded
  const { data: photos } = await (supabase.from as any)("job_photos")
    .select("id, type, created_at, caption")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  // Group photos by date to avoid flooding timeline
  const photosByDate = new Map<string, any[]>();
  for (const p of photos || []) {
    const dateKey = new Date(p.created_at).toISOString().split("T")[0];
    if (!photosByDate.has(dateKey)) photosByDate.set(dateKey, []);
    photosByDate.get(dateKey)!.push(p);
  }

  for (const [date, datePhotos] of photosByDate) {
    events.push({
      id: `photos-${date}`,
      type: "photos_uploaded",
      title: `${datePhotos.length} Photo${datePhotos.length > 1 ? "s" : ""} Uploaded`,
      description: datePhotos
        .map((p: any) => p.type)
        .filter(Boolean)
        .join(", "),
      actor: "Frank",
      timestamp: datePhotos[0].created_at,
    });
  }

  // Sort by timestamp
  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return events;
}
