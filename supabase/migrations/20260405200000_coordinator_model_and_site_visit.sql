-- Migration: 20260405200000_coordinator_model_and_site_visit.sql
-- Purpose: Add 3-tier org model (Property Owner -> Coordinator -> Frank)
--          Add site_visit step to job FSM
--          Add billing_contact and coordinator fields to jobs

BEGIN;

-- ============================================================
-- 1. Scope contacts to organizations + add company linkage
-- ============================================================

-- Add organization_id to contacts (was previously global/unscoped)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add client_id to link contacts to a company (e.g., Neil -> APT client record)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Add phone for contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Expand contact roles to include coordinator
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_role_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_role_check
  CHECK (role IN ('dispatcher', 'billing', 'client', 'coordinator', 'property_manager'));

-- ============================================================
-- 2. Add coordinator fields to jobs
-- ============================================================

-- Who assigned this job (e.g., Neil Henderson)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS coordinator_contact_id UUID REFERENCES public.contacts(id);

-- Who gets the invoice (e.g., Coady Gallant) — separate from who assigned the work
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES public.contacts(id);

-- The property management company (e.g., MetCap) — the upstream client
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS property_owner_name TEXT;

-- ============================================================
-- 3. Add site_visit step to job FSM
-- ============================================================

-- Expand status constraint to include site_visit
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'incoming', 'site_visit', 'draft', 'quoted', 'sent', 'approved',
    'scheduled', 'in_progress', 'completed', 'invoiced', 'paid',
    'cancelled', 'active'
  ));

-- ============================================================
-- 4. Add coordinator fields to work_orders
-- ============================================================

ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS coordinator_contact_id UUID REFERENCES public.contacts(id);

ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES public.contacts(id);

-- ============================================================
-- 5. Update RLS for contacts (scope to org, keep backward compat)
-- ============================================================

-- Drop old global policies
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can manage contacts" ON public.contacts;

-- New policies: users can see contacts in their org OR unscoped contacts (legacy)
CREATE POLICY "Users can view contacts in their org or unscoped"
  ON public.contacts FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contacts in their org"
  ON public.contacts FOR ALL USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

COMMIT;
