-- Email threads table: stores thread-level metadata from Gmail
-- Actual email content is fetched on-demand from Gmail API, not stored here.
-- This table enables fast listing, search, and linking threads to jobs.

create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  gmail_thread_id text not null,
  subject text,
  snippet text,
  last_message_date timestamptz,
  participants text[], -- email addresses involved
  classification text, -- new_work, quote_request, job_update, irrelevant
  job_id uuid references jobs(id),
  is_read boolean default false,
  message_count integer default 0,
  has_attachments boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(organization_id, gmail_thread_id)
);

-- Index for fast lookups
create index idx_email_threads_org_date
  on email_threads(organization_id, last_message_date desc);

create index idx_email_threads_gmail_id
  on email_threads(gmail_thread_id);

create index idx_email_threads_job
  on email_threads(job_id)
  where job_id is not null;

-- RLS
alter table email_threads enable row level security;

create policy "Users can view their org email threads"
  on email_threads for select
  using (
    organization_id in (
      select organization_id from user_profiles
      where id = auth.uid()
    )
  );

create policy "Service role can manage email threads"
  on email_threads for all
  using (true)
  with check (true);

-- Updated_at trigger
create or replace function update_email_threads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger email_threads_updated_at
  before update on email_threads
  for each row
  execute function update_email_threads_updated_at();
