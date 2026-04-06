-- ============================================================
-- WORKFLOW AUTOMATION MIGRATION
-- Supports all 10 automation systems
-- ============================================================

BEGIN;

-- ============================================================
-- AUTOMATION 1: Auto-Create Jobs from Email
-- ============================================================

-- Add confidence scoring and auto-conversion tracking to work_order_drafts
ALTER TABLE public.work_order_drafts
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_converted BOOLEAN DEFAULT FALSE;

-- Add trusted_sender flag to email_sender_rules
ALTER TABLE public.email_sender_rules
  ADD COLUMN IF NOT EXISTS trusted_sender BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS converted_job_count INTEGER DEFAULT 0;

-- Add manage policy for email_sender_rules (only SELECT existed)
DROP POLICY IF EXISTS "Users manage own org sender rules" ON email_sender_rules;
CREATE POLICY "Users manage own org sender rules"
  ON email_sender_rules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- AUTOMATION 3: Auto-Dispatch Subs — confirmation tracking
-- ============================================================

ALTER TABLE public.job_assignments
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ============================================================
-- AUTOMATION 4: Auto-Invoice on Completion — org toggle
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT TRUE;

-- ============================================================
-- AUTOMATION 5: Auto-Match Bank Deposits
-- ============================================================

-- Index for fast deposit matching
CREATE INDEX IF NOT EXISTS idx_finance_txn_ingested_deposits
  ON finance_transactions(amount, status)
  WHERE status = 'INGESTED' AND amount > 0;

CREATE INDEX IF NOT EXISTS idx_job_invoices_sent_total
  ON job_invoices(total, status)
  WHERE status = 'sent';

-- ============================================================
-- AUTOMATION 6: Payment Reminder Drafts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_reminder_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  tier TEXT NOT NULL CHECK (tier IN ('friendly', 'followup', 'urgent', 'final')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  amount NUMERIC(12,2),
  days_outstanding INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'dismissed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminder_drafts_org
  ON payment_reminder_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_drafts_status
  ON payment_reminder_drafts(status)
  WHERE status = 'draft';

ALTER TABLE payment_reminder_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org reminder drafts"
  ON payment_reminder_drafts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users manage own org reminder drafts"
  ON payment_reminder_drafts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- AUTOMATION 7: Auto-Advance Turnover Stages
-- (Uses existing turnovers + turnover_tasks tables, no new schema needed)
-- ============================================================

-- ============================================================
-- AUTOMATION 9: Weekly Digest — org email preference
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS digest_email TEXT,
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT TRUE;

COMMIT;
