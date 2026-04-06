-- ============================================================
-- SILENT MODE — Pre-production stealth fill
-- Adds a flag to suppress all outbound emails while the system
-- continues to poll, classify, and create jobs from real email
-- traffic. Flip to FALSE when ready to go live.
-- ============================================================

BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS silent_mode BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.organizations.silent_mode IS
  'When TRUE, all outbound emails (dispatch, quotes, completion reports, digests, reminders, status updates) are suppressed. Internal job creation and in-app notifications continue normally.';

COMMIT;
