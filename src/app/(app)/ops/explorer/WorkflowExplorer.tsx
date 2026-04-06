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
    title: "Email Comes In",
    subtitle: "Your inbox gets checked automatically",
    icon: <Mail className="w-5 h-5" />,
    color: "from-blue-500 to-blue-600",
    trigger: "Every morning at 8, or whenever you hit the check-now button",
    automation: "Pulls the last 30 days of emails from your Gmail and only looks at new ones it hasn't seen yet.",
    what_happens: [
      "Checks your Gmail for any new emails from the last 30 days",
      "Skips anything it already looked at before",
      "Finds the actual message from the person who emailed you (ignores your own replies)",
      "Sends the subject, message, and sender info over to figure out what kind of email it is",
    ],
    tables: ["Your email connection info", "Emails the app has seen", "A log of every email check"],
    outputs: ["Each email gets sorted and sent to the next step based on what it's about"],
    safety: ["Locked down so only the app can trigger a check", "Only looks at emails other people sent you"],
    links_to: ["ai_classification"],
    lane: "jobs",
  },
  {
    id: "ai_classification",
    title: "The App Figures Out What It Is",
    subtitle: "Is it a real job, a quote, or junk?",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-purple-500 to-purple-600",
    trigger: "Right after a new email is picked up",
    automation: "The app reads who sent it, what the subject says, and what the message is about, then decides what kind of email it is.",
    what_happens: [
      "Decides if it's: a new job, a quote request, an update on an existing job, or something irrelevant",
      "Pulls out the client name, property address, type of work, a summary, and how urgent it is",
      "Flags anything marked rush, ASAP, urgent, or emergency",
      "New work or quote request? Creates a draft job for review or auto-creation",
      "Update on an existing job? Links it to that job automatically",
      "Junk or irrelevant? Ignores it completely",
    ],
    tables: ["Draft work orders", "Your existing jobs list"],
    outputs: ["A draft job is created with a confidence score", "Or an existing job gets the email attached to it"],
    safety: ["Junk emails are never saved", "Anything that looks like a question gets flagged for you to review personally"],
    links_to: ["auto_job_creation", "draft_review"],
    lane: "jobs",
  },
  {
    id: "auto_job_creation",
    title: "Auto-Create the Job",
    subtitle: "If the app is confident enough, it just makes the job for you",
    icon: <Zap className="w-5 h-5" />,
    color: "from-amber-500 to-orange-500",
    trigger: "When the app is very sure about the email AND it recognizes the sender",
    automation: "Scores how good the info is — if the sender, address, and trade all check out, it creates the job without you lifting a finger.",
    what_happens: [
      "Gives points for: known sender, recognized property, type of trade, clear description, and having all the details",
      "Senders you've worked with 5+ times get extra trust automatically",
      "Checks if there's already a job at the same address for the same trade in the last week",
      "High confidence + known sender? Job gets created automatically",
      "Medium confidence? Shows up in your inbox as a draft to review",
      "Low confidence? Still shows up, but with a warning flag",
    ],
    tables: [
      "Draft work orders",
      "Trusted sender list",
      "Your contacts",
      "Your properties",
      "Jobs list",
      "Task list for the job",
      "Activity log",
    ],
    outputs: ["Job created and you get a notification", "Or: Draft sits in your inbox waiting for you to review it"],
    safety: [
      "The app won't auto-create a job if the email is mostly questions",
      "The app won't create a duplicate if the same address + trade already exists this week",
      "If you delete an auto-created job within 24 hours, the app learns to trust that sender less",
      "You can manually mark any sender as trusted or untrusted",
    ],
    links_to: ["scheduling"],
    lane: "jobs",
  },
  {
    id: "draft_review",
    title: "You Review the Draft",
    subtitle: "When the app isn't sure, you take a quick look",
    icon: <FileText className="w-5 h-5" />,
    color: "from-slate-500 to-slate-600",
    trigger: "When the app picks up a job email but isn't confident enough to create it automatically",
    automation: "Nothing automatic here — it shows up in your inbox and you fix anything that looks off before approving it.",
    what_happens: [
      "The draft shows up in your inbox with a badge showing how confident the app was",
      "You can edit the client name, address, type of work, description, and tasks",
      "Once you approve it, the job gets created with your corrections",
      "The original email gets linked to the new job automatically",
    ],
    tables: ["Draft work orders", "Jobs list", "Email-to-job links"],
    outputs: ["Job created and ready to be scheduled"],
    safety: ["You always get the final say on anything the app isn't sure about"],
    links_to: ["scheduling"],
    lane: "jobs",
  },
  {
    id: "scheduling",
    title: "Smart Scheduling",
    subtitle: "Urgent jobs get booked right away, others get suggested times",
    icon: <Calendar className="w-5 h-5" />,
    color: "from-green-500 to-emerald-500",
    trigger: "When a new job comes in — whether you created it or the app did",
    automation: "Figures out how urgent it is, estimates how long it'll take, checks your calendar, and either books it or suggests a time.",
    what_happens: [
      "Rates urgency: fire (3 days or less to move-in), hot (a week), warm (two weeks), or cool (no rush)",
      "Estimates the job size from how many tasks there are: small (couple hours), medium (half day), big (full day)",
      "Looks at your calendar and existing jobs to find open time slots",
      "Fire or hot jobs? Books them into the earliest open slot automatically",
      "Warm or cool? Sends you a suggestion — you pick the time",
      "Every Sunday evening, your weekly calendar gets filled in with any unscheduled jobs for the week ahead",
    ],
    tables: [
      "Your jobs list",
      "Turnover move-in dates",
      "Your calendar",
    ],
    outputs: [
      "Job lands on your calendar and a work order gets created",
      "Or: you get a suggestion and pick the slot that works for you",
    ],
    safety: ["The app won't book anything same-day after 2 PM", "Respects weekends unless it's a fire emergency", "The app won't double-book you"],
    links_to: ["auto_dispatch"],
    lane: "jobs",
  },
  {
    id: "auto_dispatch",
    title: "Notify Your Subs",
    subtitle: "Your guys get an email as soon as the job is booked",
    icon: <Users className="w-5 h-5" />,
    color: "from-teal-500 to-teal-600",
    trigger: "When a job gets scheduled — whether you picked the subs or left it blank",
    automation: "If you assigned subs, they get an email right away. If you didn't, the app picks the best ones based on what kind of work it is and who's available.",
    what_happens: [
      "If you already picked your subs: each one gets a booking email with a link to see the job details",
      "If you didn't pick anyone: the app suggests the best subs based on their specialty and availability",
      "Each sub gets assigned to the job and gets their own private link",
      "The email says: 'You're booked — painting at 123 Main St on Tuesday'",
      "The sub confirms by replying or clicking the confirm button",
      "If nobody confirms within 24 hours, you get a heads-up to reassign",
    ],
    tables: [
      "Your subcontractors list",
      "Job assignments",
      "Sub portal access links",
    ],
    outputs: ["Booking emails sent to your subs", "Confirmations tracked", "Subs added to your calendar event"],
    safety: ["Subs get a secure private link — nobody else can see their jobs", "You get an alert if a sub doesn't confirm within 24 hours"],
    links_to: ["work_execution"],
    lane: "jobs",
  },
  {
    id: "work_execution",
    title: "Work in Progress",
    subtitle: "You and your subs are on the job",
    icon: <Hammer className="w-5 h-5" />,
    color: "from-orange-500 to-orange-600",
    trigger: "When you mark a job as started",
    automation: "The client gets an email that work has begun. You snap receipts and photos from the job site as you go.",
    what_happens: [
      "The client gets an email: 'Work has started at 123 Main St'",
      "You snap photos of receipts for materials right from the app — quick and easy",
      "You upload progress photos from the job page",
      "You and your subs check off tasks as they get done",
      "Your subs can see their tasks and mark them complete from their own portal",
    ],
    tables: ["Your jobs", "Work order tasks", "Receipts", "Job photos"],
    outputs: ["As tasks get done, the app checks if it's time to send an invoice", "Any receipt you snap gets read and filed automatically"],
    safety: ["The app makes sure jobs move through steps in the right order", "The app won't let you mark a job complete if a deposit is still pending"],
    links_to: ["task_completion", "receipt_capture"],
    lane: "jobs",
  },
  {
    id: "task_completion",
    title: "Tasks Get Checked Off",
    subtitle: "Every checkbox triggers the next thing automatically",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
    trigger: "When you or a sub checks off a task on the work order",
    automation: "Three things can happen automatically: sub gets queued for payment, invoice gets created, or the next turnover stage kicks off.",
    what_happens: [
      "The task gets marked done with a timestamp",
      "If a sub did that task and there's a cost attached, their payment gets queued up",
      "The app checks: are ALL tasks on this work order done now?",
      "If everything's done, an invoice gets created and sent automatically",
      "If this job is part of a turnover, the app checks if it's time to move to the next stage",
    ],
    tables: [
      "Work order tasks",
      "Sub payments pending",
      "Invoice records",
    ],
    outputs: ["Sub payment queued", "Invoice created and sent (if all tasks are done)", "Turnover moves to next stage"],
    safety: ["The app won't queue the same sub payment twice", "Only one invoice per work order — no duplicates"],
    links_to: ["auto_invoice", "turnover_automation"],
    lane: "jobs",
  },
  {
    id: "turnover_automation",
    title: "Turnover Relay",
    subtitle: "Painter done? Cleaner gets notified automatically",
    icon: <RotateCcw className="w-5 h-5" />,
    color: "from-violet-500 to-violet-600",
    trigger: "When all the tasks for the current stage of a turnover are done",
    automation: "Checks if the current stage is finished, moves to the next one, and emails the next sub in line.",
    what_happens: [
      "Turnovers follow a set order: notice → vacated → inspection → work starts → paint → clean → final check → ready",
      "Each task is tied to a stage based on what kind of work it is (painting = paint stage, cleaning = clean stage, etc.)",
      "When all tasks in the current stage are done, it automatically moves to the next stage",
      "The subs assigned to the next stage get their booking emails right away",
      "It's like a relay race: painter finishes → cleaner gets an email → cleaner finishes → inspector gets an email",
      "When the last stage is done, the unit is marked ready and the turnover is complete",
    ],
    tables: [
      "Turnover records",
      "Turnover tasks by stage",
      "Turnover activity log",
      "Unit status",
    ],
    outputs: ["Stage moves forward", "Next sub in line gets notified", "Or: turnover complete and unit is ready"],
    safety: ["The app won't advance until ALL tasks in the current stage are done or skipped", "The stage order is locked — no skipping ahead"],
    links_to: [],
    lane: "jobs",
  },
  {
    id: "auto_invoice",
    title: "Auto-Invoice",
    subtitle: "All tasks done? Invoice gets created and sent",
    icon: <Send className="w-5 h-5" />,
    color: "from-emerald-500 to-emerald-600",
    trigger: "When every task on the work order is checked off",
    automation: "Builds the invoice from your tasks and costs, adds HST, and emails it to the billing contact — or saves it as a draft if you prefer to review first.",
    what_happens: [
      "Pulls each task and its cost to build the invoice line items",
      "Calculates subtotal + 13% HST + total",
      "Creates the invoice with a 30-day due date",
      "If auto-invoicing is on and there's a billing contact, the invoice gets emailed right away",
      "If there's no billing contact, you get a reminder to add one",
      "If auto-invoicing is off, it saves as a draft for you to review and send yourself",
      "The job gets marked as invoiced with the final amount",
    ],
    tables: [
      "Work order tasks",
      "Invoice records",
      "Invoice send history",
      "Your company settings",
      "Jobs list",
    ],
    outputs: ["Invoice emailed to the billing contact", "Or: draft saved for you to review first"],
    safety: [
      "The app won't create a second invoice for the same work order",
      "The app won't send a $0 invoice",
      "You can turn off auto-send entirely in your settings",
    ],
    links_to: ["payment_tracking"],
    lane: "jobs",
  },
  {
    id: "invoice_delivery",
    title: "Invoice Email",
    subtitle: "Professional branded invoice lands in their inbox",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: "from-orange-500 to-red-500",
    trigger: "When an invoice is ready to send — automatically or when you hit Send",
    automation: "Sends a sharp-looking branded email with the full invoice breakdown: line items, HST, total, and due date.",
    what_happens: [
      "Finds the billing contact's email (or falls back to the client's email)",
      "Builds a professional invoice email with your FHI branding, every line item, 13% HST, and the total",
      "Sends the email",
      "Logs that it was sent so you have a record",
      "Marks the invoice as sent",
    ],
    tables: ["Invoice records", "Invoice send history", "Contact info"],
    outputs: ["Invoice email delivered to the billing contact"],
    safety: ["Falls back to the client's email if no billing contact is set", "Every send is logged so there's always a paper trail"],
    links_to: ["payment_tracking"],
    lane: "jobs",
  },
  {
    id: "payment_tracking",
    title: "Payment Tracking",
    subtitle: "From invoiced to paid — and everything that happens after",
    icon: <DollarSign className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
    trigger: "When you mark a job as paid",
    automation: "Records the revenue, sends the client a review request, and flags repeat customers.",
    what_happens: [
      "Stamps the job with the date it was paid",
      "Records the payment as revenue in your books",
      "Kicks off a few post-job actions automatically",
      "Sends the client an email asking for a review (stars and feedback)",
      "Checks if this client has had 3+ jobs — if so, flags them as a loyal customer",
    ],
    tables: [
      "Your jobs",
      "Bank transactions and revenue",
      "Tax categories",
      "Job activity log",
    ],
    outputs: ["Revenue recorded in your books", "Review request sent to the client", "Repeat customers get flagged"],
    safety: ["The app won't record revenue on a $0 invoice", "Jobs must follow the right steps — you can't skip from 'scheduled' to 'paid'"],
    links_to: ["deposit_matching", "end_of_job_autopilot"],
    lane: "finance",
  },
  {
    id: "deposit_matching",
    title: "Match Payments to Invoices",
    subtitle: "Bank deposits get matched to your outstanding invoices",
    icon: <CreditCard className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
    trigger: "Every morning at 9, or right after you upload a bank statement",
    automation: "Looks at all the deposits that just came in and tries to match each one to an outstanding invoice by the dollar amount.",
    what_happens: [
      "Looks at all the deposits that just came in from the bank",
      "For each deposit: searches your outstanding invoices for one with a matching amount (allows a tiny rounding difference)",
      "If there's one clear match, it links them automatically — deposit confirmed, invoice marked paid, job marked paid",
      "If there are multiple invoices with the same amount, it flags it for you to sort out manually",
      "If no invoice matches, it checks against your job totals as a backup",
      "If you previously unlinked a match, the app remembers and won't suggest that pairing again",
    ],
    tables: [
      "Your bank transactions and outstanding invoices",
      "Invoice records",
      "Your jobs",
      "Previous match rejections",
    ],
    outputs: ["Matched: deposit linked, invoice paid, revenue recorded", "Unclear: flagged for you to review manually"],
    safety: [
      "Allows a tiny rounding difference so it doesn't miss a match over pennies",
      "The app won't guess if there are multiple invoices for the same amount — it asks you",
      "If you undo a match, the app remembers and won't suggest that pairing again",
    ],
    links_to: ["tax_categories"],
    lane: "finance",
  },
  {
    id: "payment_reminders",
    title: "Payment Reminders",
    subtitle: "Drafts reminders for you — never sends them without your OK",
    icon: <Bell className="w-5 h-5" />,
    color: "from-amber-500 to-amber-600",
    trigger: "Every morning at 8:30, the app checks for overdue invoices",
    automation: "Writes reminder drafts that get progressively more firm — but never sends anything to a client without you reviewing it first.",
    what_happens: [
      "Scans all your invoiced jobs that haven't been paid yet",
      "Figures out how many days each invoice has been outstanding",
      "Picks the right tone: friendly nudge (1-2 weeks), follow-up (3-5 weeks), urgent (6-9 weeks), or final notice (90+ days)",
      "Skips any reminder that's already been sent or drafted at that level",
      "Creates a draft reminder for you to review",
      "Sends you an email summary of all pending reminders with Send, Edit, or Skip buttons",
      "You review them on the reminders page and decide which ones to send, edit, or toss",
    ],
    tables: [
      "Invoiced jobs with outstanding balances",
      "Previously sent reminders",
      "Reminder drafts",
    ],
    outputs: ["Drafts created for your review", "You get an email and in-app notification with the summary"],
    safety: [
      "The app NEVER sends a reminder to a client without you approving it first",
      "Only one reminder per level per job — no nagging",
      "You can dismiss any reminder you don't want to send",
    ],
    links_to: [],
    lane: "finance",
  },
  // ── LANE: FINANCE (Receipts → Categories → Tax) ──
  {
    id: "receipt_capture",
    title: "Snap a Receipt",
    subtitle: "Take a photo and it's saved instantly",
    icon: <Camera className="w-5 h-5" />,
    color: "from-pink-500 to-rose-500",
    trigger: "You tap the camera button, snap a photo of the receipt",
    automation: "One tap, done. The photo gets saved and the app starts reading it in the background — you don't have to wait around.",
    what_happens: [
      "The photo gets cleaned up and prepped",
      "It's uploaded and saved permanently",
      "A receipt record is created showing 'Processing...'",
      "The app starts reading the receipt details in the background",
      "You see a confirmation right away — no waiting",
    ],
    tables: ["Receipt records", "Your saved receipt photos"],
    outputs: ["Receipt saved and the app starts reading it automatically"],
    safety: ["You don't have to wait — the reading happens in the background", "The photo is saved permanently so you always have a copy"],
    links_to: ["receipt_ocr"],
    lane: "finance",
  },
  {
    id: "receipt_ocr",
    title: "Receipt Gets Read Automatically",
    subtitle: "The app reads the store, amount, and date off the photo",
    icon: <Brain className="w-5 h-5" />,
    color: "from-indigo-500 to-indigo-600",
    trigger: "Right after you snap the receipt photo",
    automation: "The app reads the receipt photo and pulls out the store name, date, total, what you bought, and how you paid.",
    what_happens: [
      "The photo gets scanned and read automatically",
      "Pulls out: store name, date, total, what was purchased, payment method, and tax",
      "Cleans up the store name (turns 'HOME DEPOT #1234' into just 'Home Depot')",
      "Tries to match the receipt to one of your active jobs based on the store and timing",
      "Updates the receipt with all the details it found",
      "If it found a matching job, it links them. If not, it puts the receipt in your review queue",
    ],
    tables: ["Receipt records", "Your active jobs"],
    outputs: ["Receipt filled in with all the details — shows up in your review queue"],
    safety: ["The app tracks how confident it is about what it read", "The raw scan is always kept so you can double-check"],
    links_to: ["receipt_matching"],
    lane: "finance",
  },
  {
    id: "receipt_matching",
    title: "Review & Match Receipts",
    subtitle: "Swipe to confirm, and the app learns your patterns",
    icon: <Receipt className="w-5 h-5" />,
    color: "from-rose-500 to-pink-600",
    trigger: "When you open the receipt review screen — swipe right to confirm, left to reassign",
    automation: "When you confirm a match, the receipt gets linked to the job. After you confirm the same store to the same category a few times, the app learns and does it automatically.",
    what_happens: [
      "You confirm the match and the receipt gets linked to the right job",
      "The app counts how many times you've confirmed this store to the same expense category",
      "After 3 confirmations for the same store + category, the app creates a rule to do it automatically",
      "The rule says: 'Anything from Home Depot goes under Materials & Supplies'",
      "From then on, receipts from that store get filed automatically without asking you",
      "You can also approve all the auto-matched receipts in one tap",
    ],
    tables: [
      "Receipt records",
      "Learned filing rules",
    ],
    outputs: ["Receipt matched to the right job", "Filing rule learned (after 3+ confirmations from the same store)"],
    safety: ["You can edit or delete any learned rule in your settings", "Receipts show whether they were filed by a rule or by you"],
    links_to: ["categorization_learning"],
    lane: "finance",
  },
  {
    id: "categorization_learning",
    title: "Auto-Filing",
    subtitle: "The app learns how you categorize and does it for you",
    icon: <Brain className="w-5 h-5" />,
    color: "from-cyan-500 to-cyan-600",
    trigger: "After you've confirmed the same store to the same category 3+ times, or when you create a rule manually",
    automation: "Runs through your filing rules in order and automatically categorizes transactions that match — the more you use it, the less you have to do by hand.",
    what_happens: [
      "Each rule says: 'If the description contains [store name], file it under [category]'",
      "The app goes through all your active rules in priority order",
      "Checks each transaction description against the rules",
      "Matches get automatically filed under the right expense category with a note explaining why",
      "Higher-priority rules take precedence if there's a conflict",
      "Runs automatically every time a new rule gets created",
    ],
    tables: [
      "Your filing rules",
      "Bank transactions and expenses",
    ],
    outputs: ["Transactions get categorized automatically", "Less manual sorting for you over time"],
    safety: ["The app won't override anything you've already confirmed manually", "Only touches new or unreviewed transactions"],
    links_to: ["tax_categories"],
    lane: "finance",
  },
  {
    id: "tax_categories",
    title: "Tax Categories",
    subtitle: "Everything sorted into CRA-ready buckets for your accountant",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: "from-slate-500 to-slate-600",
    trigger: "When transactions get categorized — either automatically or by you",
    automation: "Every transaction gets tagged with a tax category like Revenue, Contract Labour, Materials & Supplies, Vehicle, etc.",
    what_happens: [
      "Categories include: Sales / Revenue, Contract Labour, Materials & Supplies, Vehicle, Office, Insurance, and more",
      "Each category knows whether it's tax-deductible or not",
      "Your finance dashboard totals everything up by category for any time period",
      "Shows you: total revenue, total expenses, and net income at a glance",
      "Tracks how many transactions still need to be categorized — your 'clean books' score",
    ],
    tables: [
      "Tax category list",
      "All your categorized transactions",
      "Finance summary dashboard",
    ],
    outputs: ["All your transactions neatly sorted and ready for year-end"],
    safety: ["The built-in categories can't be accidentally deleted", "You can add your own custom categories"],
    links_to: ["year_end"],
    lane: "finance",
  },
  {
    id: "year_end",
    title: "Year-End Tax Summary",
    subtitle: "Hand your accountant a clean package",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "from-green-600 to-emerald-600",
    trigger: "When you open your finance page at year-end",
    automation: "Your finance dashboard gives you a real-time breakdown of everything — ready to hand to your accountant.",
    what_happens: [
      "Revenue broken down by category (job income, other income)",
      "Expenses broken down by category (contract labour, materials, vehicle, office, etc.)",
      "Each category lines up with the CRA T2125 tax form your accountant uses",
      "Shows your net income: revenue minus expenses",
      "Flags anything that still needs to be categorized so you can clean it up before filing",
      "Every transaction has its receipt photo attached for proof",
      "Shows profit per job: what you billed vs. what you paid out",
    ],
    tables: [
      "Finance summary dashboard",
      "All your confirmed transactions",
      "Tax category list",
      "Job profit breakdown",
    ],
    outputs: ["Category totals ready for your accountant", "Receipt photos as proof for every expense", "Profit breakdown per job"],
    safety: ["The app won't let you ignore uncategorized items — it flags them until they're cleaned up", "Every transaction can be traced back to a receipt, invoice, or bank deposit"],
    links_to: [],
    lane: "finance",
  },
  // ── AUTOMATION EXTRAS ──
  {
    id: "end_of_job_autopilot",
    title: "End-of-Job Autopilot",
    subtitle: "Mark it complete and everything else happens automatically",
    icon: <Zap className="w-5 h-5" />,
    color: "from-yellow-500 to-orange-500",
    trigger: "When you mark a job as completed",
    automation: "One click to finish. The app sends the invoice, shares the photos, asks for a review, and emails the client — all in order.",
    what_happens: [
      "Step 1: Creates the invoice from the work order and sends it to the billing contact",
      "Step 2: If you took job photos, they get shared with the client in an email",
      "Step 3: Sends the client a review request and checks if they're a repeat customer",
      "Step 4: Sends a status email: 'Work completed at 123 Main St'",
      "Every step gets logged on the job timeline so you can see what happened",
      "If any step can't run (no photos, no billing contact, etc.), it just skips that one and keeps going",
    ],
    tables: ["Invoice records", "Job photos", "Photo sharing log", "Job activity log"],
    outputs: ["Invoice sent, photos shared, review requested, and you get a summary of everything that ran"],
    safety: [
      "The app won't create an invoice if there's no work order or no tasks",
      "The app won't try to share photos if there aren't any",
      "The app won't send the invoice if there's no billing contact or auto-invoicing is off",
      "Each step runs on its own — if one fails, the rest still go through",
    ],
    links_to: [],
    lane: "automation",
  },
  {
    id: "weekly_digest",
    title: "Weekly Summary Email",
    subtitle: "Sunday evening recap of your whole week",
    icon: <FileText className="w-5 h-5" />,
    color: "from-indigo-500 to-blue-500",
    trigger: "Every Sunday at 6 PM",
    automation: "Wraps up the past week and previews the next one — all in one sharp-looking email.",
    what_happens: [
      "This Week: jobs completed, money collected, new jobs that came in, receipts captured",
      "Action Needed: receipts to review, reminders to send, sub payments pending",
      "Next Week: scheduled jobs with dates, turnover deadlines coming up",
      "Money: revenue this week, total outstanding, pending sub payouts",
      "Every section has a link that takes you right to that part of the app",
      "Branded design: dark background, orange accents, clean grid layout",
    ],
    tables: ["Your jobs", "Bank transactions", "Invoices", "Receipts", "Turnovers", "Sub payments", "Reminder drafts"],
    outputs: ["One clean summary email every Sunday evening"],
    safety: ["Only sends if you have weekly digests turned on in settings", "You choose which email address it goes to"],
    links_to: [],
    lane: "automation",
  },
];

// ─── LANE CONFIG ────────────────────────────────────────────

const LANES = {
  jobs: {
    label: "From Email to Payday",
    description: "Email comes in → work gets done → invoice goes out → you get paid",
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
    label: "Money In, Money Out",
    description: "Payments → receipts → expense categories → tax time",
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
    label: "Autopilot",
    description: "Things the app does for you in the background",
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
          title="What It Touches"
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
            Daily Autopilot Schedule
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="text-blue-400 font-mono">8:00 AM</span>
            <span className="text-white/40 ml-1">Check email</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 font-mono">8:30 AM</span>
            <span className="text-white/40 ml-1">Reminders</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-green-400 font-mono">9:00 AM</span>
            <span className="text-white/40 ml-1">Match payments</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 font-mono">Sun 6PM</span>
            <span className="text-white/40 ml-1">Plan the week</span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-indigo-400 font-mono">Sun 6PM</span>
            <span className="text-white/40 ml-1">Weekly summary</span>
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
                  Tap a step to see what happens behind the scenes
                </p>
                <p className="text-white/20 text-xs mt-1">
                  What kicks it off, what it does, and what guardrails are in place
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
