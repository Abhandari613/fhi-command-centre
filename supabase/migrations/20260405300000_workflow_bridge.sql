-- ============================================================
-- WORKFLOW BRIDGE MIGRATION
-- Closes all gaps between email/inbox system and job management
-- ============================================================

-- ============================================================
-- TRACK 0: Receipt Capture Enhancements
-- ============================================================

-- Add receipt capture fields for the enhanced pipeline
alter table receipts
  add column if not exists job_id uuid references jobs(id),
  add column if not exists confidence_score numeric(5,2),
  add column if not exists auto_match_job_id uuid references jobs(id),
  add column if not exists line_items jsonb default '[]'::jsonb,
  add column if not exists tax_amount numeric(12,2) default 0,
  add column if not exists payment_method text,
  add column if not exists thumbnail_url text,
  add column if not exists sync_status text default 'synced' check (sync_status in ('queued', 'uploading', 'synced', 'failed')),
  add column if not exists ocr_raw jsonb;

-- Receipt review statuses: pending_review, needs_review, auto_matched, confirmed, rejected
-- Existing statuses: processed, needs_review, matched — extend with new ones
-- (Using text column, no enum constraint to break)

-- Nudge tracking for smart receipt reminders
create table if not exists receipt_nudges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid not null references auth.users(id),
  nudge_type text not null, -- 'no_receipts', 'pending_review', 'weekly_reminder'
  shown_at timestamptz default now(),
  dismissed boolean default false
);

alter table receipt_nudges enable row level security;
create policy "Users see own nudges" on receipt_nudges for select
  using (user_id = auth.uid());
create policy "Service role manages nudges" on receipt_nudges for all
  using (true) with check (true);

-- ============================================================
-- TRACK 1: Draft Review + Convert to Job
-- ============================================================

-- Add converted_job_id to work_order_drafts for tracking conversion
alter table work_order_drafts
  add column if not exists converted_job_id uuid references jobs(id),
  add column if not exists email_thread_id uuid references email_threads(id);

create index if not exists idx_wo_drafts_converted
  on work_order_drafts(converted_job_id) where converted_job_id is not null;

-- ============================================================
-- TRACK 2: Email <-> Job Linking
-- ============================================================

-- The email_threads table already has a job_id column for 1:1 linking.
-- For many-to-many (multiple emails per job, or emails linked to multiple jobs):
create table if not exists job_email_links (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  thread_id uuid not null references email_threads(id) on delete cascade,
  gmail_thread_id text, -- denormalized for fast lookup
  linked_at timestamptz default now(),
  linked_by uuid references auth.users(id),
  unique(job_id, thread_id)
);

create index if not exists idx_job_email_links_job on job_email_links(job_id);
create index if not exists idx_job_email_links_thread on job_email_links(thread_id);

alter table job_email_links enable row level security;

create policy "Users can view their org job email links" on job_email_links for select
  using (
    job_id in (
      select j.id from jobs j
      join user_profiles up on up.organization_id = j.organization_id
      where up.id = auth.uid()
    )
  );

create policy "Users can manage their org job email links" on job_email_links for all
  using (
    job_id in (
      select j.id from jobs j
      join user_profiles up on up.organization_id = j.organization_id
      where up.id = auth.uid()
    )
  );

-- ============================================================
-- TRACK 3: Work Order Task Completion
-- ============================================================

-- Add completion tracking to work_order_tasks
alter table work_order_tasks
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id);

-- ============================================================
-- TRACK 4: Invoice from Work Order
-- ============================================================

-- Job invoices table for generated invoices
create table if not exists job_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  job_id uuid not null references jobs(id),
  work_order_id uuid,
  invoice_number text,
  billing_contact_id uuid references contacts(id),
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_at timestamptz,
  paid_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_job_invoices_job on job_invoices(job_id);
create index if not exists idx_job_invoices_org on job_invoices(organization_id);

alter table job_invoices enable row level security;

create policy "Users can view their org invoices" on job_invoices for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

create policy "Users can manage their org invoices" on job_invoices for all
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Invoice send log
create table if not exists invoice_send_log (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references job_invoices(id) on delete cascade,
  sent_to text not null, -- email address
  sent_at timestamptz default now(),
  method text default 'email', -- email, pdf_download
  resend_message_id text -- Resend API message ID
);

alter table invoice_send_log enable row level security;
create policy "Users view own org invoice logs" on invoice_send_log for select
  using (
    invoice_id in (
      select id from job_invoices
      where organization_id in (
        select organization_id from user_profiles where id = auth.uid()
      )
    )
  );

-- ============================================================
-- TRACK 5: Progress Photo Sharing
-- ============================================================

-- Photo share log
create table if not exists photo_share_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  photo_ids uuid[] not null,
  shared_with_email text not null,
  shared_at timestamptz default now(),
  portal_link text,
  resend_message_id text
);

alter table photo_share_log enable row level security;
create policy "Users view own org photo shares" on photo_share_log for select
  using (
    job_id in (
      select j.id from jobs j
      join user_profiles up on up.organization_id = j.organization_id
      where up.id = auth.uid()
    )
  );

-- ============================================================
-- TRACK 6: Scope Change from Email
-- ============================================================

-- Add change_order flag to quote_items
alter table quote_items
  add column if not exists is_change_order boolean default false,
  add column if not exists source_email_thread_id uuid references email_threads(id),
  add column if not exists added_at timestamptz default now();

-- ============================================================
-- TRACK 8: Sub Payout from Work Order
-- ============================================================

-- Sub payouts table
create table if not exists sub_payouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  subcontractor_id uuid not null,
  work_order_task_id uuid,
  job_id uuid references jobs(id),
  amount numeric(12,2) not null default 0,
  status text not null default 'pending_payout' check (status in ('pending_payout', 'approved', 'paid', 'cancelled')),
  payment_method text, -- 'e_transfer', 'cheque', 'cash'
  payment_reference text, -- e-transfer ref number
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_sub_payouts_org on sub_payouts(organization_id);
create index if not exists idx_sub_payouts_sub on sub_payouts(subcontractor_id);
create index if not exists idx_sub_payouts_status on sub_payouts(status);

alter table sub_payouts enable row level security;

create policy "Users view own org sub payouts" on sub_payouts for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

create policy "Users manage own org sub payouts" on sub_payouts for all
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- ============================================================
-- TRACK 10: Job Lifecycle Timeline (uses existing job_events, no new tables needed)
-- ============================================================

-- Add index for fast timeline queries
create index if not exists idx_job_events_job_created
  on job_events(job_id, created_at desc);

-- Invoice number sequence
create sequence if not exists invoice_number_seq start 1001;
