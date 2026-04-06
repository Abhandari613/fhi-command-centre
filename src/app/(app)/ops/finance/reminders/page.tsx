import { getPendingReminderDrafts } from "@/app/actions/payment-reminder-draft-actions";
import { ReminderDraftList } from "./ReminderDraftList";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const drafts = await getPendingReminderDrafts();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Reminders</h1>
        <p className="text-sm text-white/60 mt-1">
          Review and send payment reminders to clients
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <p className="text-white/60">No pending reminders</p>
          <p className="text-sm text-white/40 mt-1">
            Reminders are generated daily at 8:30 AM for overdue invoices
          </p>
        </div>
      ) : (
        <ReminderDraftList drafts={drafts} />
      )}
    </div>
  );
}
