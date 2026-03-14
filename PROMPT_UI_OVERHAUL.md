# FHI App — Total UI Overhaul + Financial Feature Integration

You are building the complete UI for Frank's Home Improvement (FHI), a job management app for a home improvement contractor. The app runs on Next.js 15 + Supabase + Tailwind CSS + Framer Motion.

## YOUR MISSION

Overhaul every page in the app to create a cohesive, production-quality interface that integrates 6 brand-new financial features into the existing 10-stop job workflow. Every page must use the Trail Boss design system consistently. No placeholder "Coming Soon" sections — everything gets real UI wired to real server actions.

---

## DESIGN SYSTEM: Trail Boss

The entire app uses an obsidian dark theme with ember (orange) accents. Think: blacked-out Chevy Trail Boss truck dashboard at night.

### Color Palette

- **Ember Orange (Primary)**: `#ff6b00` — buttons, accents, active states, glows
- **Obsidian Black**: `#0a0a0a` — base background
- **Steel Gray**: `#6b7280` — secondary text, borders
- **Glass surfaces**: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(24px)`
- **Status colors**: emerald (money/success), cyan (info), amber (warning), red (danger), blue (scheduled), purple (clients)

### Component Patterns

- **Cards**: Glass surfaces with inset highlight borders, subtle drop shadow. Use existing `GlassCard` component with intensity variants (normal/bright/panel/solid)
- **Buttons**: Use existing `AnimatedButton` with variants (primary/secondary/danger/ghost). Primary = ember gradient `from-primary to-[#e05e00]`
- **Animations**: Framer Motion throughout — `motion.div` with stagger children, spring transitions, `AnimatePresence` for mount/unmount
- **Layout**: Mobile-first (`max-w-lg mx-auto`), responsive grid on larger screens
- **Typography**: Geist Sans, monospace for numbers/codes. Large bold headers, muted secondary text with `text-white/50`
- **Navigation**: `BottomNav` component with 5 tabs + floating FAB. Tabs: Jobs, Work Orders, [+ FAB], Estimates, Finance

### Existing Utility Classes (defined in globals.css)

```
@utility steel — primary glass card
@utility glass / glass-bright / glass-panel / glass-solid — intensity variants
@utility ember-border-l / ember-border-t — glowing left/top borders
@utility ember-ring — focus glow ring
```

### Background

- `AuroraBackground` component: cycling truck photo slideshow with obsidian overlay + ember glow orbs
- Already mounted in root layout — pages just render content on top

---

## THE 10-STOP JOB WORKFLOW (FSM)

Every job flows through exactly these statuses:

```
incoming → draft → quoted → sent → approved → scheduled → in_progress → completed → invoiced → paid
```

The FSM is defined in `src/lib/fsm/job-state.ts`. Status transitions are enforced server-side. The dashboard groups jobs by status in a kanban view. Job detail pages show context-aware action buttons based on current status.

---

## CURRENT PAGE INVENTORY (what exists today)

### App Shell

- `(app)/layout.tsx` — AuroraBackground + BottomNav wrapper, `max-w-lg mx-auto`
- `BottomNav.tsx` — 5 tabs + FAB, obsidian bg, chrome trim line

### Dashboard / Home

- `(app)/page.tsx` — Command Centre: stat cards (Active/Drafts/Pipeline), work order list, quick action grid (Dispatch Subs, Snap Receipt, B2B Clients, Work Orders, Finance Hub)
- `(app)/dashboard/page.tsx` — Jobs kanban grouped by 10 statuses, advance buttons, job cards with quoted totals

### Job Operations

- `ops/jobs/[id]/page.tsx` — Job detail hub. Context-aware actions per status. Photos grid, confirmed tasks, rescope panel
- `ops/jobs/[id]/scope/page.tsx` — Task editor with AI photo extraction, confirm/add tasks
- `ops/jobs/[id]/quote/page.tsx` — Quote builder: line items, qty, pricing, send/PDF
- `ops/jobs/[id]/complete/page.tsx` — Completion report: task-photo linking, punch list, send report
- `ops/jobs/[id]/finance/page.tsx` — Job-level P&L: revenue, payouts, margin, payout form

### Schedule & Team

- `ops/schedule/page.tsx` — CalendarView component, monthly grid, GCal integration
- `ops/subs/page.tsx` — SubList component
- `ops/clients/page.tsx` — Client list with search + create modal

### Finance (NEEDS MAJOR WORK)

- `ops/finance/page.tsx` — CFO Dashboard: upload zone, transaction clearing house, job profitability. Has "Coming Soon" placeholders.
- `ops/finance/transactions/page.tsx` — Transaction list page

### Client Portal (external-facing)

- `portal/[id]/page.tsx` — 5-step progress stepper, quote approval, deposit payment, supplies confirmation, before/after slider

### Other

- `ingest/page.tsx` — New job from email
- `ops/work-orders/page.tsx` — B2B work orders
- `ops/receipts/page.tsx` — Receipt list
- `ops/receipts/upload/page.tsx` — Receipt upload form

---

## NEW BACKEND FEATURES (built, need UI)

These server actions and API routes are complete and ready to be wired into pages:

### 1. Aged Receivables

**Actions** (`src/app/actions/receivables-actions.ts`):

- `getAgedReceivables()` → `AgedReceivable[]` — all invoiced-but-unpaid jobs with `days_outstanding`, `aging_bucket` (current / 31-60 / 61-90 / 90+), client info
- `getAgingSummary()` → `AgingSummary` — bucket counts and totals + grand_total

**API**: `GET /api/finance/aged-receivables` — returns `{ summary, receivables }`

**UI needed**: Aged receivables card on finance dashboard showing 4 buckets with dollar totals. Click to expand into full table. Color code: current=emerald, 31-60=amber, 61-90=orange, 90+=red.

### 2. Payment Reminders

**Service** (`src/lib/services/payment-reminders.ts`):

- 4-tier escalation: friendly (7d), followup (21d), urgent (45d), final (90d)
- Sends emails via Resend, creates notifications, records in `payment_reminders` table

**API**: `POST /api/finance/payment-reminders` — cron endpoint, processes all overdue

**Actions** (use notification-actions for viewing):

- `getRecentNotifications()` already returns `payment_reminder_sent` type notifications

**UI needed**: Payment reminders section in aged receivables view — show which jobs have had reminders sent, what tier, when. Manual "Send Reminder" button per job. Run-all button for cron.

### 3. Recurring Invoices

**Actions** (`src/app/actions/recurring-schedule-actions.ts`):

- `getRecurringSchedules()` → `RecurringSchedule[]`
- `createRecurringSchedule(input)` → `{ success, id }`
- `updateRecurringSchedule(id, updates)` → `{ success }`
- `deactivateRecurringSchedule(id)` → `{ success }`

**API**: `POST /api/finance/recurring-invoices` — cron endpoint, generates due jobs

**UI needed**: Recurring schedules management page. List view showing: client name, title, frequency badge, next due date, line items preview, active/paused toggle. Create form: pick client, set frequency, add line items, optional deposit. Could be a sub-page of finance or its own route.

### 4. Services Catalog

**Actions** (`src/app/actions/services-catalog-actions.ts`):

- `getServicesCatalog()` → `ServiceItem[]` — task_name, description, unit_price, default_quantity, item_type (labor/material/flat_rate), category_id, is_active
- `upsertServiceItem(input)` → `{ success, id }`
- `deactivateServiceItem(id)` → `{ success }`

**UI needed**: Services catalog page (reachable from finance). Card or table grid of services. Each shows: name, price, type badge (labor=blue, material=amber, flat_rate=emerald). Inline edit or modal for add/edit. Should also integrate into the quote builder — when adding line items, allow picking from catalog.

### 5. Customer Statements

**Actions** (`src/app/actions/customer-statement-actions.ts`):

- `getCustomerFinancialSummaries()` → `CustomerFinancialSummary[]` — per-client: total_jobs, paid_jobs, unpaid_jobs, total_paid, total_outstanding, lifetime_revenue
- `getCustomerStatement(clientId)` → `CustomerStatement` — full statement with line items (each job), totals

**API**: `GET /api/finance/customer-statement?clientId=xxx`

**UI needed**: Customer financial summary table on finance dashboard or clients page. Click a client to see full statement: header with client info, table of jobs with status/amounts, totals row. "Print/Export" button (window.print() with print styles is fine).

### 6. Customer Payment Terms

**Migration adds**: `payment_terms` column to clients table (due_on_receipt, net_15, net_30, net_45, net_60)

**UI needed**: Add payment terms dropdown to client create/edit forms. Show payment terms badge on client cards. Factor into aged receivables display.

---

## PAGES THAT NEED WORK (ordered by priority)

### P0 — Finance Dashboard Overhaul (`ops/finance/page.tsx`)

This is the most important page to rebuild. Currently has placeholder sections. Transform into a real CFO dashboard:

**Top row — 4 KPI cards:**

- Total Revenue (from job_profit_summary, status=paid)
- Outstanding (from aging summary grand_total)
- Profit Margin (avg from job_profit_summary)
- Pending Review (uncategorized transaction count)

**Section 1 — Aged Receivables**

- 4-bucket horizontal bar or card row: Current | 31-60 | 61-90 | 90+
- Each bucket shows count + dollar total
- Click to expand to full job list per bucket
- Per-job: job number, client name, address, amount, days outstanding, reminder status, "Send Reminder" button

**Section 2 — Job Profitability**

- Table or card grid of completed/invoiced/paid jobs
- Columns: Job #, Address, Revenue, Costs, Profit, Margin %
- Color-coded margins (green >20%, yellow 10-20%, red <10%)
- Already have `getCompletedJobsFinanceSummary()` for this

**Section 3 — Transaction Clearing House**

- Keep existing TransactionList + AutoCategorizeButton
- Add rule count badge

**Section 4 — Quick Links row**

- Recurring Schedules (link to new page)
- Services Catalog (link to new page)
- Customer Statements (link to new page)
- Upload Statements (existing upload zone)

### P1 — New Pages to Create

**`ops/finance/receivables/page.tsx`** — Full aged receivables page

- Expanded view of the dashboard card
- Table with all invoiced jobs, sortable by days outstanding
- Reminder history per job (expand row to see sent reminders)
- Bulk action: "Send All Due Reminders"
- Summary totals at top

**`ops/finance/recurring/page.tsx`** — Recurring schedules management

- List of all schedules with status toggles
- "New Schedule" button opens create form
- Schedule cards show: client, frequency, next due, line items count, total per cycle
- Edit inline or via modal

**`ops/finance/catalog/page.tsx`** — Services catalog

- Grid of service items
- Add/edit/deactivate
- Filter by type (labor/material/flat_rate)
- Prices displayed prominently

**`ops/finance/statements/page.tsx`** — Customer statements hub

- Table of all clients with financial summaries
- Click client → full statement view
- Columns: Client, Total Jobs, Total Paid, Outstanding, Lifetime Revenue
- Statement detail: print-friendly layout

### P2 — Existing Pages to Update

**`ops/clients/page.tsx`** — Add:

- Payment terms dropdown in create/edit modal
- Outstanding balance badge on client cards
- "View Statement" link per client

**`ops/jobs/[id]/quote/page.tsx`** — Add:

- "Pick from Catalog" button that opens services catalog picker
- When selected, auto-fills line item description, qty, price from catalog

**`(app)/page.tsx` (Command Centre)** — Add:

- Replace or enhance stat cards with: Active Jobs | Outstanding ($) | This Month Revenue
- Add "Overdue Invoices" alert card if aging summary shows 31+ day items

**`(app)/dashboard/page.tsx` (Jobs Kanban)** — Add:

- For invoiced-status cards: show days outstanding badge
- For paid-status cards: show paid_at date

**BottomNav.tsx** — The Finance tab should go to `ops/finance` (verify it does)

**NotificationBell.tsx** — Already handles new types (`payment_reminder_sent`, `recurring_job_created`). Verify they render correctly.

### P3 — Portal Updates

**`portal/[id]/page.tsx`** — Add:

- For invoiced status: show invoice amount, "Pay Now" button
- For paid status: show receipt/thank you message
- Payment terms display if client has non-default terms

---

## SERVER ACTIONS REFERENCE (complete list to wire up)

```typescript
// Aged Receivables
import {
  getAgedReceivables,
  getAgingSummary,
} from "@/app/actions/receivables-actions";

// Recurring Schedules
import {
  getRecurringSchedules,
  createRecurringSchedule,
  updateRecurringSchedule,
  deactivateRecurringSchedule,
} from "@/app/actions/recurring-schedule-actions";

// Customer Statements
import {
  getCustomerFinancialSummaries,
  getCustomerStatement,
} from "@/app/actions/customer-statement-actions";

// Services Catalog
import {
  getServicesCatalog,
  upsertServiceItem,
  deactivateServiceItem,
} from "@/app/actions/services-catalog-actions";

// Existing Finance
import {
  getCompletedJobsFinanceSummary,
  getJobProfitSummary,
  getJobPayouts,
  recordSubPayout,
  recordJobRevenue,
} from "@/app/actions/finance-bridge-actions";

// Existing Notifications (already handles new types)
import {
  getUnreadNotifications,
  getRecentNotifications,
  markNotificationRead,
} from "@/app/actions/notification-actions";

// Existing Dashboard
import {
  getDashboardJobs,
  advanceJobStatus,
} from "@/app/actions/dashboard-jobs-actions";
```

---

## IMPLEMENTATION RULES

1. **Use existing components** — GlassCard, AnimatedButton, BottomNav, NotificationBell are already built and themed. Use them.
2. **"use client"** for any page with useState/useEffect/onClick handlers. Server components only for pure data-fetch pages.
3. **Framer Motion** on all page transitions and list items. Use `motion.div` with stagger children pattern.
4. **Mobile-first** — everything must work in `max-w-lg` (phone width). Use responsive grid (`grid-cols-1 lg:grid-cols-2`) for larger screens.
5. **No placeholder UI** — every section must be wired to real data via the server actions listed above.
6. **Consistent status colors** — use the same color mapping across all pages:
   - incoming: gray, draft: white/50, quoted: blue, sent: cyan, approved: emerald
   - scheduled: blue, in_progress: amber, completed: cyan, invoiced: orange, paid: emerald
7. **Money formatting** — always use `$X,XXX.XX` format. Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
8. **Ember accents** — interactive elements get ember orange. Static/info elements stay neutral.
9. **Glass cards for data groups** — each logical section is a GlassCard. Use `ember-border-l` for the most important card in a section.
10. **Don't break existing functionality** — the job detail pages, portal, scope editor, quote builder, and completion flow all work. Enhance, don't replace.

---

## FILE STRUCTURE

```
src/app/(app)/
  page.tsx                          — Command Centre (UPDATE)
  dashboard/page.tsx                — Jobs Kanban (UPDATE)
  ops/
    finance/
      page.tsx                      — CFO Dashboard (REBUILD)
      receivables/page.tsx          — Aged Receivables (NEW)
      recurring/page.tsx            — Recurring Schedules (NEW)
      catalog/page.tsx              — Services Catalog (NEW)
      statements/page.tsx           — Customer Statements (NEW)
      transactions/page.tsx         — Transaction list (EXISTS)
    clients/page.tsx                — Client list (UPDATE - add payment terms)
    jobs/[id]/
      page.tsx                      — Job detail (EXISTS - minor updates)
      quote/page.tsx                — Quote builder (UPDATE - catalog picker)
      scope/page.tsx                — Scope editor (EXISTS)
      complete/page.tsx             — Completion report (EXISTS)
      finance/page.tsx              — Job finance (EXISTS)
    schedule/page.tsx               — Calendar (EXISTS)
    subs/page.tsx                   — Team (EXISTS)
    receipts/page.tsx               — Receipts (EXISTS)
    work-orders/page.tsx            — Work orders (EXISTS)

src/components/
  layout/BottomNav.tsx              — Bottom navigation (VERIFY)
  NotificationBell.tsx              — Notification dropdown (VERIFY)
  ui/GlassCard.tsx                  — Glass card component (EXISTS)
  ui/AnimatedButton.tsx             — Button component (EXISTS)
  finance/                          — NEW DIRECTORY
    AgingBuckets.tsx                — Aged receivables bucket display
    RecurringScheduleCard.tsx       — Schedule list item
    ServiceItemCard.tsx             — Catalog item card
    CustomerStatementTable.tsx      — Statement line items table
    KPICard.tsx                     — Dashboard metric card
```

---

## START HERE

1. Read the existing `ops/finance/page.tsx` to understand current state
2. Read `GlassCard.tsx` and `AnimatedButton.tsx` for component APIs
3. Build the new finance components in `src/components/finance/`
4. Rebuild the CFO dashboard (`ops/finance/page.tsx`)
5. Create the 4 new finance sub-pages
6. Update Command Centre, Jobs Kanban, and Clients pages
7. Update the quote builder with catalog integration
8. Verify BottomNav and NotificationBell handle new routes/types
9. Run `npx tsc --noEmit` after each major page to catch type errors
