"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Sparkles,
  FileText,
  Calendar,
  Hammer,
  CheckCircle2,
  Receipt,
  DollarSign,
  Bell,
  TrendingUp,
  ChevronRight,
  Zap,
  Users,
  Camera,
  Send,
  CreditCard,
  FileSpreadsheet,
  ArrowDown,
  Clock,
  Shield,
  Brain,
  RotateCcw,
  X,
} from "lucide-react";

// ─── WORKFLOW DATA ────────────────────────────────────────────

type StageId =
  | "email_ingestion"
  | "ai_classification"
  | "auto_job_creation"
  | "draft_review"
  | "scheduling"
  | "auto_dispatch"
  | "work_execution"
  | "task_completion"
  | "turnover_automation"
  | "auto_invoice"
  | "invoice_delivery"
  | "payment_tracking"
  | "deposit_matching"
  | "payment_reminders"
  | "receipt_capture"
  | "receipt_ocr"
  | "receipt_matching"
  | "categorization_learning"
  | "finance_rules"
  | "tax_categories"
  | "year_end"
  | "weekly_digest"
  | "end_of_job_autopilot";

type WorkflowStage = {
  id: StageId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trigger: string;
  automation: string;
  what_happens: string[];
  tables: string[];
  outputs: string[];
  safety: string[];
  links_to: StageId[];
  lane: "jobs" | "finance" | "automation";
};

const STAGES: WorkflowStage[] = [
  // ── LANE: JOBS (Email → Work → Invoice) ──
  {
    id: "email_ingestion",
    title: "Email Ingestion",
    subtitle: "Gmail poll fetches threads",
    icon: <Mail className="w-5 h-5" />,
    color: "from-blue-500 to-blue-600",
    trigger: "Cron: 8 AM daily (GET /api/gmail/poll) or manual POST",
    automation: "Fetches last 30 days of Gmail threads via OAuth2. Filters for new/updated threads only.",
    what_happens: [
      "Fetch Gmail threads via googleapis (last 30 days)",
      "Skip already-processed threads (check email_threads table)",
      "Pick best inbound message for classification (not from Frank's address)",
      "Pass subject + body + sender to AI classifier",
    ],
    tables: ["gcal_tokens (read OAuth tokens)", "email_threads (upsert)", "email_scan_log (insert)"],
    outputs: ["Classified email → next stage based on type"],
    safety: ["Vercel CRON_SECRET auth in production", "Only processes unread inbound messages"],
    links_to: ["ai_classification"],
    lane: "jobs",
  },
  {
    id: "ai_classification",
    title: "AI Classification",
    subtitle: "Claude Sonnet classifies email intent",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-purple-500 to-purple-600",
    trigger: "Called by email ingestion for each new thread",
    automation: "POST /api/ai/classify-email — Claude Sonnet analyzes sender, subject, body",
    what_happens: [
      "AI returns: classification (new_work | quote_request | job_update | irrelevant)",
      "Extracts: client_name, property_address, trade_type, summary, urgency",
      "Rush detection: checks for keywords (rush, asap, urgent, emergency)",
      "new_work/quote_request → Create draft + attempt auto-job",
      "job_update → Link to existing job by address match",
      "irrelevant → Skip (don't store thread)",
    ],
    tables: ["work_order_drafts (insert draft)", "jobs (search existing)"],
    outputs: ["Draft created → confidence scoring", "Job linked → notification"],
    safety: ["Irrelevant emails never stored", "Questions ('?') flagged for human review"],
    links_to: ["auto_job_creation", "draft_review"],
    lane: "jobs",
  },
  {
    id: "auto_job_creation",
    title: "Auto-Create Job",
    subtitle: "High-confidence emails skip review",
    icon: <Zap className="w-5 h-5" />,
    color: "from-amber-500 to-orange-500",
    trigger: "Confidence ≥ 85% AND sender is known contact",
    automation: "autoCreateJobFromDraft() — scores extraction quality, creates job if confident",
    what_happens: [
      "Score extraction: known sender (+30), matched property (+20), recognized trade (+20), good description (+15), all fields present (+15)",
      "Trusted senders get additional +30 bonus (auto-trusted after 5+ conversions)",
      "Check for duplicate jobs: same address + trade in last 7 days",
      "If score ≥ 85 + known sender → auto-create via convertDraftToJob()",
      "If 60-84 → draft marked 'needs_review' (shown in inbox)",
      "If < 60 → draft marked 'needs_review' with warning badge",
    ],
    tables: [
      "work_order_drafts (update confidence + status)",
      "email_sender_rules (check trusted, increment count)",
      "contacts (check known sender)",
      "properties (check address match)",
      "jobs (insert new job)",
      "job_tasks (insert tasks)",
      "job_events (log auto_created_from_email)",
    ],
    outputs: ["Job created → notification to Frank", "Or: Draft queued for manual review"],
    safety: [
      "Never auto-create if content is primarily questions",
      "Duplicate detection (same address + trade in 7 days)",
      "If Frank deletes auto-job within 24h → sender trust reduced",
      "Frank can toggle trusted_sender per email pattern",
    ],
    links_to: ["scheduling"],
    lane: "jobs",
  },
  {
    id: "draft_review",
    title: "Manual Draft Review",
    subtitle: "Frank reviews low-confidence extractions",
    icon: <FileText className="w-5 h-5" />,
    color: "from-slate-500 to-slate-600",
    trigger: "Email classified as new_work but confidence < 85%",
    automation: "None — Frank reviews in /ops/work-orders inbox and edits fields before converting",
    what_happens: [
      "Draft appears in inbox with confidence score badge",
      "Frank can edit: client name, address, trade type, description, tasks",
      "convertDraftToJob() creates job with Frank's corrections",
      "Email thread auto-linked to new job",
    ],
    tables: ["work_order_drafts (read + update)", "jobs (insert)", "job_email_links (insert)"],
    outputs: ["Job created → enters scheduling pipeline"],
    safety: ["Human in the loop for uncertain extractions"],
    links_to: ["scheduling"],
    lane: "jobs",
  },
  {
    id: "scheduling",
    title: "Smart Scheduling",
    subtitle: "Auto-schedule urgent, suggest for others",
    icon: <Calendar className="w-5 h-5" />,
    color: "from-green-500 to-emerald-500",
    trigger: "Job reaches 'incoming' status (manual or auto-created)",
    automation: "autoScheduleJob() + findAvailableSlots() + weekly auto-plan (Sunday 6 PM cron)",
    what_happens: [
      "Compute urgency: fire (≤3 days to move-in), hot (≤7d), warm (≤14d), cool",
      "Estimate job size from task count: 1-2 tasks=2hr, 3-5=4hr, 6+=full day",
      "Find available slots: check GCal + existing scheduled jobs",
      "Fire/Hot → auto-schedule into earliest slot",
      "Warm/Cool → send suggestion notification, don't auto-schedule",
      "Sunday cron: auto-plan fills unscheduled jobs into next week's calendar",
    ],
    tables: [
      "jobs (read urgency, update dates + status→scheduled)",
      "turnovers (read move_in_date)",
      "gcal_tokens (read for calendar sync)",
    ],
    outputs: [
      "scheduleJob() called → GCal event created, work order seeded",
      "Or: suggestion notification → Frank confirms or picks different slot",
    ],
    safety: ["Skip today after 2 PM", "Respect weekends (unless fire urgency)", "Never double-book"],
    links_to: ["auto_dispatch"],
    lane: "jobs",
  },
  {
    id: "auto_dispatch",
    title: "Sub Dispatch",
    subtitle: "Notify subs automatically when booked",
    icon: <Users className="w-5 h-5" />,
    color: "from-teal-500 to-teal-600",
    trigger: "scheduleJob() called — either with manual sub IDs or zero subs",
    automation: "If subs assigned → dispatch email to each. If none → POST /api/jobs/auto-dispatch (AI scoring)",
    what_happens: [
      "Manually assigned subs: send dispatch email with magic link via Resend",
      "No subs assigned: AI scores available subs by specialty match + availability",
      "Create job_assignments record + sub_portal_tokens for magic link",
      "Email: 'You're booked — [trade] at [address] on [date]'",
      "Track confirmation: sub replies YES or clicks confirm in portal",
      "If no confirmation in 24h → notification to Frank to reassign",
    ],
    tables: [
      "subcontractors (read specialty, availability)",
      "job_assignments (insert/update, track confirmed_at)",
      "sub_portal_tokens (insert magic link)",
    ],
    outputs: ["Dispatch emails sent", "Confirmation tracked", "GCal attendees added"],
    safety: ["Magic link tokens for secure sub portal access", "24h no-confirm alert"],
    links_to: ["work_execution"],
    lane: "jobs",
  },
  {
    id: "work_execution",
    title: "Work in Progress",
    subtitle: "Frank and subs do the work",
    icon: <Hammer className="w-5 h-5" />,
    color: "from-orange-500 to-orange-600",
    trigger: "Job status → in_progress (manual or via FSM)",
    automation: "Status transition email sent to client. Progress photos captured via FAB.",
    what_happens: [
      "Status email: 'Work has started at [address]'",
      "Frank uses receipt FAB to capture material purchases on-the-go",
      "Progress photos uploaded via job detail page",
      "Work order tasks checked off as completed (toggleTaskComplete)",
      "Sub portal: subs can view their tasks + mark complete",
    ],
    tables: ["jobs (status=in_progress)", "work_order_tasks (status updates)", "receipts (new captures)", "job_photos (uploads)"],
    outputs: ["Tasks completing → triggers auto-invoice check", "Receipt captured → OCR pipeline"],
    safety: ["FSM validates all transitions", "Deposit gate: can't complete if deposit pending"],
    links_to: ["task_completion", "receipt_capture"],
    lane: "jobs",
  },
  {
    id: "task_completion",
    title: "Task Completion",
    subtitle: "Check off tasks, trigger automations",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
    trigger: "toggleTaskComplete(taskId, true) — checkbox on work order",
    automation: "Three automations fire on completion: sub payout queue, auto-invoice check, turnover advance",
    what_happens: [
      "Mark work_order_tasks status → 'Completed', set completed_at",
      "If task has subcontractor + cost_estimate > 0 → queue payout in sub_payouts",
      "Check allComplete: are ALL tasks in this work order done?",
      "If allComplete → trigger auto-invoice (Automation 4)",
      "If work order linked to turnover unit → check stage advancement (Automation 7)",
    ],
    tables: [
      "work_order_tasks (update status)",
      "sub_payouts (upsert pending payout)",
      "job_invoices (create if allComplete)",
    ],
    outputs: ["Sub payout queued", "Invoice created/sent (if allComplete)", "Turnover stage advanced"],
    safety: ["Upsert prevents duplicate sub payouts", "Invoice only created once per work order"],
    links_to: ["auto_invoice", "turnover_automation"],
    lane: "jobs",
  },
  {
    id: "turnover_automation",
    title: "Turnover Auto-Advance",
    subtitle: "Paint done → cleaner notified automatically",
    icon: <RotateCcw className="w-5 h-5" />,
    color: "from-violet-500 to-violet-600",
    trigger: "All tasks matching current turnover stage are complete",
    automation: "advanceTurnoverStage() — checks stage→trade mapping, advances, dispatches next sub",
    what_happens: [
      "Stage order: notice → vacated → inspection → in_progress → paint → clean → final_qc → ready",
      "Map tasks to stages by trade_type keywords (paint→paint stage, clean→clean stage, etc.)",
      "If all current-stage tasks complete → advance to next stage",
      "Auto-dispatch subs assigned to next-stage tasks",
      "Chain relay: painter done → cleaner gets email → cleaner done → QC gets email",
      "Final stage (ready) → mark turnover complete, update unit status",
    ],
    tables: [
      "turnovers (update stage, completed_at)",
      "turnover_tasks (read status by stage)",
      "turnover_events (log stage_changed)",
      "units (update status → ready when done)",
    ],
    outputs: ["Stage advanced", "Next sub dispatched", "Or: turnover complete → unit ready"],
    safety: ["Only advances when ALL stage tasks complete/skipped", "Stage order is fixed constant"],
    links_to: [],
    lane: "jobs",
  },
  {
    id: "auto_invoice",
    title: "Auto-Invoice",
    subtitle: "All tasks done → invoice created and sent",
    icon: <Send className="w-5 h-5" />,
    color: "from-emerald-500 to-emerald-600",
    trigger: "All work_order_tasks marked complete (allComplete=true)",
    automation: "createInvoiceFromWorkOrder() + sendInvoice() — respects org auto_invoice toggle",
    what_happens: [
      "Build line items from work_order_tasks (trade_type + cost_estimate)",
      "Calculate subtotal + HST 13% + total",
      "Create job_invoices record (due date = 30 days)",
      "If org.auto_invoice=true AND billing_contact exists → send via Resend",
      "If no billing_contact → notification: 'Add billing contact to send'",
      "If auto_invoice=false → create as draft, notify Frank to review",
      "Update job status → invoiced, set final_invoice_amount",
    ],
    tables: [
      "work_order_tasks (read for line items)",
      "job_invoices (insert)",
      "invoice_send_log (insert on send)",
      "organizations (read auto_invoice setting)",
      "jobs (update status→invoiced)",
    ],
    outputs: ["Invoice emailed to billing contact", "Or: draft created for Frank to review"],
    safety: [
      "Only fires once per work order (duplicate check)",
      "Never sends $0 invoices",
      "Org toggle to disable auto-send",
    ],
    links_to: ["payment_tracking"],
    lane: "jobs",
  },
  {
    id: "invoice_delivery",
    title: "Invoice Email",
    subtitle: "Trail Boss themed invoice via Resend",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: "from-orange-500 to-red-500",
    trigger: "sendInvoice(invoiceId) — auto or manual",
    automation: "Sends styled HTML email (dark theme, ember orange) with line items, HST, total, due date",
    what_happens: [
      "Look up billing contact email (or fall back to client email)",
      "Build HTML invoice: FHI branding, line items table, HST 13%, total",
      "Send via Resend API",
      "Log in invoice_send_log (resend_message_id for tracking)",
      "Update invoice status → sent",
    ],
    tables: ["job_invoices (update status→sent)", "invoice_send_log (insert)", "contacts (read email)"],
    outputs: ["Email delivered to billing contact"],
    safety: ["Falls back to client email if billing contact missing", "Logged for audit"],
    links_to: ["payment_tracking"],
    lane: "jobs",
  },
  {
    id: "payment_tracking",
    title: "Payment Tracking",
    subtitle: "Invoice → Paid lifecycle",
    icon: <DollarSign className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
    trigger: "Job status transitions: invoiced → paid",
    automation: "updateJobStatus(jobId, 'paid') → records revenue, triggers post-completion",
    what_happens: [
      "Set paid_at timestamp on job",
      "recordJobRevenue() → creates positive finance_transaction",
      "Trigger POST /api/jobs/post-completion → review request + recurring work detection",
      "Post-completion: email client asking for review (stars/feedback)",
      "Detect if client is repeat (3+ completed jobs → loyal flag)",
    ],
    tables: [
      "jobs (update status→paid, paid_at)",
      "finance_transactions (insert revenue)",
      "tax_categories (lookup 'Sales / Revenue')",
      "job_events (log revenue_recorded)",
    ],
    outputs: ["Revenue recorded", "Review request sent", "Recurring work flagged"],
    safety: ["Only records revenue if final_invoice_amount > 0", "FSM prevents invalid transitions"],
    links_to: ["deposit_matching", "end_of_job_autopilot"],
    lane: "finance",
  },
  {
    id: "deposit_matching",
    title: "Auto-Match Deposits",
    subtitle: "Bank deposits matched to invoices",
    icon: <CreditCard className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
    trigger: "Cron: 9 AM daily (GET /api/finance/auto-match) or after bank statement upload",
    automation: "autoMatchDeposits() — matches INGESTED deposits to sent invoices by amount",
    what_happens: [
      "Query all finance_transactions with status=INGESTED and amount > 0",
      "For each deposit: search job_invoices with status=sent and matching total (±1% or $1)",
      "Single match → auto-link: update transaction→CONFIRMED, invoice→paid, job→paid",
      "Multiple matches → flag as AMBIGUOUS (don't auto-match)",
      "No invoice match → try matching against jobs.final_invoice_amount",
      "Respects reconciliation_rejections: never re-propose rejected pairs",
    ],
    tables: [
      "finance_transactions (read INGESTED, update→CONFIRMED)",
      "job_invoices (read sent, update→paid)",
      "jobs (update→paid)",
      "reconciliation_rejections (check)",
    ],
    outputs: ["Matched: transaction linked, invoice paid, revenue recorded", "Ambiguous: flagged for manual review"],
    safety: [
      "1% or $1 tolerance (whichever larger)",
      "Never auto-match ambiguous (multiple invoices same amount)",
      "Rejection memory: if Frank unlinks, pair is blacklisted",
    ],
    links_to: ["tax_categories"],
    lane: "finance",
  },
  {
    id: "payment_reminders",
    title: "Payment Reminders",
    subtitle: "Drafts for Frank to review, never auto-sent",
    icon: <Bell className="w-5 h-5" />,
    color: "from-amber-500 to-amber-600",
    trigger: "Cron: 8:30 AM daily (GET /api/finance/reminder-drafts)",
    automation: "generatePaymentReminderDrafts() — 4-tier escalation as drafts, NOT auto-sent",
    what_happens: [
      "Scan all invoiced jobs with outstanding amounts",
      "Calculate days outstanding since invoiced_at",
      "Tier: friendly (7-14d), followup (21-35d), urgent (45-65d), final (90+d)",
      "Check dedup: skip if tier already sent or draft already exists",
      "Create draft in payment_reminder_drafts table",
      "Email Frank: summary of all pending reminders with Send/Edit/Skip buttons",
      "Frank reviews at /ops/finance/reminders → Send, Edit & Send, or Dismiss",
    ],
    tables: [
      "jobs (read invoiced with final_invoice_amount)",
      "payment_reminders (check already sent)",
      "payment_reminder_drafts (insert draft)",
    ],
    outputs: ["Drafts created", "Frank notified via email + in-app notification"],
    safety: [
      "NEVER auto-sent to clients — always draft for Frank",
      "Tier dedup: only one reminder per tier per job",
      "Frank can dismiss reminders he doesn't want to send",
    ],
    links_to: [],
    lane: "finance",
  },
  // ── LANE: FINANCE (Receipts → Categories → Tax) ──
  {
    id: "receipt_capture",
    title: "Receipt Capture",
    subtitle: "Snap receipt → instant upload via FAB",
    icon: <Camera className="w-5 h-5" />,
    color: "from-pink-500 to-rose-500",
    trigger: "Frank taps FAB → takes photo → quickCaptureReceipt()",
    automation: "Zero-friction flow: upload to Supabase Storage, create pending record, fire OCR in background",
    what_happens: [
      "Strip base64 prefix, convert to buffer",
      "Upload to 'receipts' storage bucket",
      "Create receipt record: status=processing, merchant='Processing...'",
      "Fire POST /api/receipts/ocr in background (non-blocking)",
      "Return immediately with receiptId (Frank sees confirmation instantly)",
    ],
    tables: ["receipts (insert processing)", "supabase storage (upload image)"],
    outputs: ["Receipt created → OCR pipeline triggered"],
    safety: ["Non-blocking: Frank doesn't wait for OCR", "Image stored permanently in Supabase"],
    links_to: ["receipt_ocr"],
    lane: "finance",
  },
  {
    id: "receipt_ocr",
    title: "Receipt OCR",
    subtitle: "Gemini extracts vendor, amount, date",
    icon: <Brain className="w-5 h-5" />,
    color: "from-indigo-500 to-indigo-600",
    trigger: "POST /api/receipts/ocr — fired by quickCaptureReceipt()",
    automation: "Gemini Vision OCR extracts structured data from receipt image",
    what_happens: [
      "Send image to Gemini Vision API",
      "Extract: merchant name, date, total, line items, payment method, tax",
      "Normalize merchant name (strip store numbers: 'HOME DEPOT #1234' → 'Home Depot')",
      "Auto-match to job: search active jobs within ±7 days by vendor/description",
      "Update receipt: merchant, total, date, line_items, ocr_raw",
      "Set status: auto_matched (if job found) or pending_review (if not)",
    ],
    tables: ["receipts (update with OCR results)", "jobs (search for auto-match)"],
    outputs: ["Receipt enriched → appears in review queue"],
    safety: ["Confidence score stored", "OCR raw data kept for audit"],
    links_to: ["receipt_matching"],
    lane: "finance",
  },
  {
    id: "receipt_matching",
    title: "Receipt Review & Match",
    subtitle: "Swipe to confirm, auto-learns patterns",
    icon: <Receipt className="w-5 h-5" />,
    color: "from-rose-500 to-pink-600",
    trigger: "Frank opens /ops/receipts/review → swipe right to confirm, left to reassign",
    automation: "confirmReceiptMatch() — links receipt to job AND triggers categorization learning",
    what_happens: [
      "Confirm: receipt.status → matched, receipt.job_id → selected job",
      "Learning trigger: count how many times this vendor→category confirmed",
      "If vendor confirmed to same category 3+ times → auto-create finance_rules entry",
      "Rule: CONTAINS match on normalized vendor name → auto-assign category",
      "Future receipts from this vendor auto-categorized without asking",
      "Batch confirm: confirmAllAutoMatched() for one-tap approve all AI matches",
    ],
    tables: [
      "receipts (update status→matched, job_id)",
      "finance_rules (insert learned rule)",
    ],
    outputs: ["Receipt matched to job", "Categorization rule learned (if 3+ confirmations)"],
    safety: ["Rules can be edited/deleted in finance settings", "Badge shows which receipts were auto-filed by rule vs. AI"],
    links_to: ["categorization_learning"],
    lane: "finance",
  },
  {
    id: "categorization_learning",
    title: "Auto-Categorization",
    subtitle: "Learned rules auto-file transactions",
    icon: <Brain className="w-5 h-5" />,
    color: "from-cyan-500 to-cyan-600",
    trigger: "After 3+ receipt confirmations for same vendor→category, OR manual rule creation",
    automation: "categorize_transactions() SQL function — runs rules lowest-to-highest priority, last match wins",
    what_happens: [
      "finance_rules table: pattern + match_type (CONTAINS/EXACT/STARTS_WITH) + category",
      "SQL function iterates all active rules ordered by priority",
      "Matches against transaction descriptions",
      "Updates status → AUTO_CLASSIFIED, sets category_id + rationale",
      "Higher priority rules overwrite lower ones (last write wins)",
      "Runs automatically after any new rule is created",
    ],
    tables: [
      "finance_rules (read active rules)",
      "finance_transactions (update category + status)",
    ],
    outputs: ["Transactions auto-classified", "Reduced manual categorization work over time"],
    safety: ["Never touches CONFIRMED transactions (user decisions respected)", "Re-classifies INGESTED + AMBIGUOUS + AUTO_CLASSIFIED"],
    links_to: ["tax_categories"],
    lane: "finance",
  },
  {
    id: "tax_categories",
    title: "Tax Categories",
    subtitle: "CRA-ready categories for year-end",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: "from-slate-500 to-slate-600",
    trigger: "Transactions categorized (auto or manual)",
    automation: "Each transaction tagged with a tax_categories entry (Sales/Revenue, Contract Labor, Supplies, etc.)",
    what_happens: [
      "Categories include: Sales / Revenue, Contract Labor, Materials & Supplies, Vehicle, Office, Insurance, etc.",
      "Each has: is_deductible flag, posture (NEUTRAL)",
      "Finance overview view aggregates by category per period",
      "revenue = sum(amount > 0), expenses = sum(amount < 0), net = sum(all)",
      "Uncategorized count tracked as 'clean books' metric",
    ],
    tables: [
      "tax_categories (reference data)",
      "finance_transactions (categorized records)",
      "finance_overview (materialized view)",
    ],
    outputs: ["Categorized transaction data ready for year-end"],
    safety: ["System categories can't be deleted", "Org can add custom categories"],
    links_to: ["year_end"],
    lane: "finance",
  },
  {
    id: "year_end",
    title: "Year-End Tax Summary",
    subtitle: "Export categorized data for accountant",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "from-green-600 to-emerald-600",
    trigger: "Frank navigates to /ops/finance at year-end",
    automation: "finance_overview view + getFinanceStats() provides real-time aggregation",
    what_happens: [
      "Revenue by category (job revenue, other income)",
      "Expenses by category (contract labor, materials, vehicle, office, etc.)",
      "Each category maps to CRA T2125 line items",
      "Net income = revenue - expenses",
      "Pending/uncategorized items flagged for cleanup",
      "Receipt images linked to transactions for audit trail",
      "Job profit summaries: revenue vs. payouts per job",
    ],
    tables: [
      "finance_overview (view)",
      "finance_transactions (all confirmed)",
      "tax_categories (category metadata)",
      "job_profit_summary (view)",
    ],
    outputs: ["Category totals for accountant", "Receipt audit trail", "Profit per job"],
    safety: ["Flagging uncategorized forces cleanup before filing", "All transactions traceable to source (receipt, invoice, bank)"],
    links_to: [],
    lane: "finance",
  },
  // ── AUTOMATION EXTRAS ──
  {
    id: "end_of_job_autopilot",
    title: "End-of-Job Autopilot",
    subtitle: "Complete → invoice → photos → review in one shot",
    icon: <Zap className="w-5 h-5" />,
    color: "from-yellow-500 to-orange-500",
    trigger: "updateJobStatus(jobId, 'completed')",
    automation: "Runs sequential steps: auto-invoice, share photos, post-completion, status email",
    what_happens: [
      "Step 1: Find linked work order → createInvoiceFromWorkOrder() + sendInvoice()",
      "Step 2: If job has photos → sharePhotosWithClient() via Resend",
      "Step 3: Post-completion webhook → review request + recurring work detection",
      "Step 4: Status transition email → 'Work completed at [address]'",
      "Each step logged as separate job_event for timeline visibility",
      "If any step fails → continue with remaining steps",
    ],
    tables: ["job_invoices (create)", "job_photos (read)", "photo_share_log (insert)", "job_events (log each step)"],
    outputs: ["Invoice sent, photos shared, review requested, Frank notified of all steps"],
    safety: [
      "Skip invoice if no work order or no tasks",
      "Skip photos if none exist",
      "Skip invoice send if no billing contact or auto_invoice disabled",
      "Each step independent — failure doesn't block others",
    ],
    links_to: [],
    lane: "automation",
  },
  {
    id: "weekly_digest",
    title: "Weekly Digest",
    subtitle: "Sunday evening summary email",
    icon: <FileText className="w-5 h-5" />,
    color: "from-indigo-500 to-blue-500",
    trigger: "Cron: Sunday 6 PM (GET /api/digest/weekly)",
    automation: "Aggregates past 7 days + previews next week, sends Trail Boss styled email",
    what_happens: [
      "This Week: completed jobs, revenue collected, new jobs, receipts captured",
      "Action Needed: receipts to review, reminders to send, payouts pending",
      "Next Week: scheduled jobs with dates, turnover deadlines",
      "Money: revenue this week, total outstanding, pending sub payouts",
      "Each section links to relevant app page",
      "Trail Boss design: dark background, ember orange accents, grid stats",
    ],
    tables: ["jobs", "finance_transactions", "job_invoices", "receipts", "turnovers", "sub_payouts", "payment_reminder_drafts"],
    outputs: ["Styled summary email to Frank"],
    safety: ["Only sends if org.digest_enabled=true", "Configurable recipient email"],
    links_to: [],
    lane: "automation",
  },
];

// ─── LANE CONFIG ────────────────────────────────────────────

const LANES = {
  jobs: {
    label: "Job Lifecycle",
    description: "Email → Work → Invoice → Paid",
    color: "border-orange-500/30",
    stages: [
      "email_ingestion",
      "ai_classification",
      "auto_job_creation",
      "draft_review",
      "scheduling",
      "auto_dispatch",
      "work_execution",
      "task_completion",
      "turnover_automation",
      "auto_invoice",
      "invoice_delivery",
    ],
  },
  finance: {
    label: "Money Flow",
    description: "Payments → Receipts → Categories → Tax",
    color: "border-green-500/30",
    stages: [
      "payment_tracking",
      "deposit_matching",
      "payment_reminders",
      "receipt_capture",
      "receipt_ocr",
      "receipt_matching",
      "categorization_learning",
      "tax_categories",
      "year_end",
    ],
  },
  automation: {
    label: "Automations",
    description: "Background systems that tie it all together",
    color: "border-purple-500/30",
    stages: ["end_of_job_autopilot", "weekly_digest"],
  },
};

// ─── COMPONENTS ────────────────────────────────────────────

function StageCard({
  stage,
  isActive,
  onClick,
}: {
  stage: WorkflowStage;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left rounded-xl border transition-all duration-200 p-3 ${
        isActive
          ? "border-[#ff6b00]/50 bg-[#ff6b00]/10 shadow-[0_0_20px_-4px_rgba(255,107,0,0.3)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center flex-shrink-0`}
        >
          {stage.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">
            {stage.title}
          </div>
          <div className="text-xs text-white/40 truncate">{stage.subtitle}</div>
        </div>
        <ChevronRight
          className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#ff6b00]" : "text-white/20"}`}
        />
      </div>
    </motion.button>
  );
}

function StageDetail({ stage, onClose }: { stage: WorkflowStage; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${stage.color} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center">
            {stage.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{stage.title}</h2>
            <p className="text-sm text-white/70">{stage.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center hover:bg-black/40 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Trigger */}
        <Section
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          title="Trigger"
          color="amber"
        >
          <p className="text-sm text-white/70">{stage.trigger}</p>
        </Section>

        {/* Automation */}
        <Section
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
          title="How It Works"
          color="purple"
        >
          <p className="text-sm text-white/70">{stage.automation}</p>
        </Section>

        {/* What Happens */}
        <Section
          icon={<ArrowDown className="w-4 h-4 text-blue-400" />}
          title="Step by Step"
          color="blue"
        >
          <ol className="space-y-1.5">
            {stage.what_happens.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <span className="text-blue-400/60 font-mono text-xs mt-0.5 flex-shrink-0">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Tables */}
        <Section
          icon={<FileSpreadsheet className="w-4 h-4 text-green-400" />}
          title="Database Tables"
          color="green"
        >
          <div className="flex flex-wrap gap-1.5">
            {stage.tables.map((table, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400/80 text-xs font-mono border border-green-500/20"
              >
                {table}
              </span>
            ))}
          </div>
        </Section>

        {/* Outputs */}
        <Section
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          title="Outputs"
          color="emerald"
        >
          <ul className="space-y-1">
            {stage.outputs.map((output, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <ChevronRight className="w-3 h-3 mt-1 text-emerald-400/60 flex-shrink-0" />
                <span>{output}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Safety */}
        <Section
          icon={<Shield className="w-4 h-4 text-red-400" />}
          title="Safety Rails"
          color="red"
        >
          <ul className="space-y-1">
            {stage.safety.map((rail, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <Shield className="w-3 h-3 mt-1 text-red-400/60 flex-shrink-0" />
                <span>{rail}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Links */}
        {stage.links_to.length > 0 && (
          <Section
            icon={<ChevronRight className="w-4 h-4 text-orange-400" />}
            title="Flows Into"
            color="orange"
          >
            <div className="flex flex-wrap gap-1.5">
              {stage.links_to.map((linkId) => {
                const linked = STAGES.find((s) => s.id === linkId);
                if (!linked) return null;
                return (
                  <span
                    key={linkId}
                    className="px-2 py-1 rounded-lg bg-[#ff6b00]/10 text-[#ff6b00] text-xs font-medium border border-[#ff6b00]/20"
                  >
                    → {linked.title}
                  </span>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </motion.div>
  );
}

function Section({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="ml-6">{children}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────

export function WorkflowExplorer() {
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [activeLane, setActiveLane] = useState<"jobs" | "finance" | "automation">("jobs");

  const activeStageData = STAGES.find((s) => s.id === activeStage);
  const laneConfig = LANES[activeLane];
  const laneStages = STAGES.filter((s) =>
    laneConfig.stages.includes(s.id),
  );

  return (
    <div className="space-y-6">
      {/* Lane Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.entries(LANES) as [keyof typeof LANES, typeof LANES["jobs"]][]).map(
          ([key, lane]) => (
            <button
              key={key}
              onClick={() => {
                setActiveLane(key);
                setActiveStage(null);
              }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                activeLane === key
                  ? "bg-[#ff6b00]/10 border-[#ff6b00]/30 text-[#ff6b00]"
                  : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white/70 hover:border-white/10"
              }`}
            >
              <div>{lane.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{lane.description}</div>
            </button>
          ),
        )}
      </div>

      {/* Cron Schedule Banner */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-white/40" />
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Automated Schedule
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="text-blue-400 font-mono">8:00 AM</span>
            <span className="text-white/40 ml-1">Gmail poll</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 font-mono">8:30 AM</span>
            <span className="text-white/40 ml-1">Reminders</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-green-400 font-mono">9:00 AM</span>
            <span className="text-white/40 ml-1">Deposit match</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 font-mono">Sun 6PM</span>
            <span className="text-white/40 ml-1">Auto-plan</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-indigo-400 font-mono">Sun 6PM</span>
            <span className="text-white/40 ml-1">Digest</span>
          </div>
        </div>
      </div>

      {/* Stage Grid + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage List */}
        <div className="space-y-2">
          {laneStages.map((stage, i) => (
            <div key={stage.id}>
              <StageCard
                stage={stage}
                isActive={activeStage === stage.id}
                onClick={() =>
                  setActiveStage(activeStage === stage.id ? null : stage.id)
                }
              />
              {/* Arrow between stages */}
              {i < laneStages.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-3 h-3 text-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <AnimatePresence mode="wait">
            {activeStageData ? (
              <StageDetail
                key={activeStageData.id}
                stage={activeStageData}
                onClose={() => setActiveStage(null)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-white/10 p-8 text-center"
              >
                <Sparkles className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">
                  Tap a stage to see how it works
                </p>
                <p className="text-white/20 text-xs mt-1">
                  Triggers, data flow, tables, and safety rails
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
