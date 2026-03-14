-- Saved rates table for common task pricing defaults

BEGIN;

CREATE TABLE IF NOT EXISTS public.saved_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  task_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, task_name)
);

ALTER TABLE public.saved_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org saved_rates"
  ON public.saved_rates FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org saved_rates"
  ON public.saved_rates FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Seed default rates (will need org_id inserted at runtime)
-- These are inserted via the app on first use

COMMIT;
