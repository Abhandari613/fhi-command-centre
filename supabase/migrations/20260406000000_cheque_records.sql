-- ============================================================
-- Cheque Records — stores scanned cheque stubs and line items
-- ============================================================

create table if not exists cheque_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  cheque_number text,
  cheque_date date,
  payer text,                          -- e.g. "All Professional Trades Services Inc."
  total_amount numeric(12,2) not null default 0,
  image_url text,                      -- storage path to the stub photo
  ocr_raw jsonb,                       -- full OCR extraction for audit
  status text not null default 'scanned' check (status in ('scanned', 'matched', 'partial_match', 'needs_review')),
  scanned_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cheque_records_org on cheque_records(organization_id);
create index if not exists idx_cheque_records_number on cheque_records(cheque_number);

alter table cheque_records enable row level security;

create policy "Users can view their org cheques" on cheque_records for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

create policy "Users can manage their org cheques" on cheque_records for all
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- ============================================================
-- Cheque Line Items — each reference/bill on the stub
-- ============================================================

create table if not exists cheque_line_items (
  id uuid primary key default gen_random_uuid(),
  cheque_id uuid not null references cheque_records(id) on delete cascade,
  reference_number text,               -- Frank's invoice number (e.g. "550", "597")
  bill_date date,
  original_amount numeric(12,2),
  discount numeric(12,2) default 0,
  payment_amount numeric(12,2) not null,
  -- Match results
  matched_invoice_id uuid references job_invoices(id),
  matched_job_id uuid references jobs(id),
  match_status text not null default 'pending' check (match_status in ('pending', 'matched', 'discrepancy', 'not_found')),
  discrepancy_amount numeric(12,2),    -- difference between invoice total and payment amount
  discrepancy_note text,
  created_at timestamptz default now()
);

create index if not exists idx_cheque_line_items_cheque on cheque_line_items(cheque_id);
create index if not exists idx_cheque_line_items_ref on cheque_line_items(reference_number);
create index if not exists idx_cheque_line_items_invoice on cheque_line_items(matched_invoice_id);

alter table cheque_line_items enable row level security;

create policy "Users can view their org cheque lines" on cheque_line_items for select
  using (
    cheque_id in (
      select id from cheque_records
      where organization_id in (
        select organization_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Users can manage their org cheque lines" on cheque_line_items for all
  using (
    cheque_id in (
      select id from cheque_records
      where organization_id in (
        select organization_id from user_profiles where id = auth.uid()
      )
    )
  );
