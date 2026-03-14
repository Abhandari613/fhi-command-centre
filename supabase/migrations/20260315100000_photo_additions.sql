-- Phase 2: Photo additions & rescoping support
-- Adds scope_round and source tracking to job_tasks

BEGIN;

ALTER TABLE public.job_tasks
ADD COLUMN IF NOT EXISTS scope_round INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'initial'
  CHECK (source IN ('initial', 'on_site_photo', 'manual', 'punch_list'));

COMMIT;
