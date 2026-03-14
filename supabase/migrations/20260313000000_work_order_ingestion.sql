-- Work Order Ingestion Module: jobs extensions, job_tasks, job_attachments, contacts
-- Migration: 20260313000000_work_order_ingestion.sql

BEGIN;

-- ============================================================
-- 1. Extend jobs table with ingestion-specific columns
-- ============================================================

-- Add job_number with auto-generation
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_number TEXT UNIQUE;

-- Add ingestion fields
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS property_address TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('standard', 'rush')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS requester_name TEXT,
ADD COLUMN IF NOT EXISTS requester_email TEXT,
ADD COLUMN IF NOT EXISTS source_email_subject TEXT,
ADD COLUMN IF NOT EXISTS source_email_body TEXT;

-- Expand status constraint to include new ingestion workflow statuses
-- Drop existing constraint and re-add with combined values
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'draft', 'sent', 'approved', 'active', 'scheduled', 'in_progress', 'completed', 'cancelled',
    'incoming', 'quoted', 'invoiced', 'paid'
  ));

-- Auto-generate job_number sequence
CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'FHI-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                      LPAD(nextval('job_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_number ON public.jobs;
CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.generate_job_number();

-- ============================================================
-- 2. job_tasks table (confirmed scope items from AI or manual)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job_tasks via jobs org"
  ON public.job_tasks FOR SELECT USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage job_tasks via jobs org"
  ON public.job_tasks FOR ALL USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 3. job_attachments table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('photo', 'pdf', 'email')) DEFAULT 'photo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job_attachments via jobs org"
  ON public.job_attachments FOR SELECT USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage job_attachments via jobs org"
  ON public.job_attachments FOR ALL USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. contacts table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('dispatcher', 'billing', 'client')) DEFAULT 'client',
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Contacts are shared / readable by all authenticated users
CREATE POLICY "Authenticated users can view contacts"
  ON public.contacts FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contacts"
  ON public.contacts FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. Seed contacts
-- ============================================================

INSERT INTO public.contacts (name, email, role, company) VALUES
  ('Neil Henderson', 'neilh@allprofessionaltrades.com', 'dispatcher', 'All Professional Trades Inc.'),
  ('Coady Gallant', 'coady@allprofessionaltrades.com', 'billing', 'All Professional Trades Inc.')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 6. Storage bucket for job attachments
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload job attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view job attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-attachments');

COMMIT;
