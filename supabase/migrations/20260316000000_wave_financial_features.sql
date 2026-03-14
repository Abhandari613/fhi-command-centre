-- Wave-inspired financial features: aged receivables, payment reminders,
-- recurring invoices, services catalog, customer statements
BEGIN;

-- ============================================================
-- 1. Aged Receivables View
--    Buckets invoiced-but-unpaid jobs by days since invoiced
-- ============================================================
CREATE OR REPLACE VIEW public.aged_receivables AS
WITH invoiced_jobs AS (
  SELECT
    j.id AS job_id,
    j.job_number,
    j.title,
    j.property_address,
    j.status,
    j.final_invoice_amount,
    j.organization_id,
    j.client_id,
    -- Use the most recent event timestamp for 'invoiced' status, fallback to updated_at
    COALESCE(
      (SELECT MAX(je.created_at) FROM public.job_events je
       WHERE je.job_id = j.id AND je.event_type = 'status_change'
       AND (je.metadata->>'new_status' = 'invoiced' OR je.metadata->>'status' = 'invoiced')),
      j.updated_at,
      j.created_at
    ) AS invoiced_at,
    c.name AS client_name,
    c.email AS client_email,
    c.phone AS client_phone
  FROM public.jobs j
  LEFT JOIN public.clients c ON c.id = j.client_id
  WHERE j.status = 'invoiced'
    AND j.final_invoice_amount > 0
)
SELECT
  ij.*,
  EXTRACT(DAY FROM NOW() - ij.invoiced_at)::INTEGER AS days_outstanding,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - ij.invoiced_at) <= 30 THEN 'current'
    WHEN EXTRACT(DAY FROM NOW() - ij.invoiced_at) <= 60 THEN '31-60'
    WHEN EXTRACT(DAY FROM NOW() - ij.invoiced_at) <= 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM invoiced_jobs ij;

-- ============================================================
-- 2. Payment Reminders tracking
--    Track when reminders were sent so we don't spam
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('friendly', 'followup', 'urgent', 'final')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT, -- email address
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org payment reminders"
  ON public.payment_reminders FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org payment reminders"
  ON public.payment_reminders FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_payment_reminders_job ON public.payment_reminders(job_id, sent_at DESC);

-- ============================================================
-- 3. Recurring Invoice Schedules
--    Auto-generate invoices for repeat clients/locations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  location_id UUID REFERENCES public.locations(id),
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  next_due DATE NOT NULL,
  end_date DATE, -- NULL = never ends
  is_active BOOLEAN DEFAULT TRUE,
  -- Template line items stored as JSONB
  line_items JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"description": "Lawn maintenance", "quantity": 1, "unit_price": 150}]
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_amount NUMERIC(10,2),
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org recurring schedules"
  ON public.recurring_schedules FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org recurring schedules"
  ON public.recurring_schedules FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_recurring_schedules_next ON public.recurring_schedules(next_due)
  WHERE is_active = TRUE;

-- ============================================================
-- 4. Services Catalog (enhance saved_rates)
--    Add category, description, default quantity, item type
-- ============================================================
ALTER TABLE public.saved_rates
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS default_quantity NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('labor', 'material', 'flat_rate')) DEFAULT 'labor',
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.tax_categories(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================
-- 5. Customer payment terms (default per client)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_terms TEXT CHECK (payment_terms IN (
    'due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60'
  )) DEFAULT 'due_on_receipt',
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12,2) DEFAULT 0;

-- ============================================================
-- 6. Add invoiced_at timestamp to jobs for accurate aging
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

-- ============================================================
-- 7. Customer financial summary view
-- ============================================================
CREATE OR REPLACE VIEW public.customer_financial_summary AS
SELECT
  c.id AS client_id,
  c.name AS client_name,
  c.email,
  c.phone,
  c.payment_terms,
  c.organization_id,
  COUNT(j.id) FILTER (WHERE j.status IN ('completed', 'invoiced', 'paid')) AS total_jobs,
  COUNT(j.id) FILTER (WHERE j.status = 'paid') AS paid_jobs,
  COUNT(j.id) FILTER (WHERE j.status = 'invoiced') AS unpaid_jobs,
  COALESCE(SUM(j.final_invoice_amount) FILTER (WHERE j.status = 'paid'), 0) AS total_paid,
  COALESCE(SUM(j.final_invoice_amount) FILTER (WHERE j.status = 'invoiced'), 0) AS total_outstanding,
  COALESCE(SUM(j.final_invoice_amount) FILTER (WHERE j.status IN ('completed', 'invoiced', 'paid')), 0) AS lifetime_revenue,
  MIN(j.created_at) AS first_job_date,
  MAX(j.created_at) AS last_job_date
FROM public.clients c
LEFT JOIN public.jobs j ON j.client_id = c.id
GROUP BY c.id;

COMMIT;
