-- Add missing invoice/payment tracking columns to jobs table.
-- These columns are referenced by job-actions.ts and finance-bridge-actions.ts
-- but were never added via migration.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS final_invoice_amount numeric,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
