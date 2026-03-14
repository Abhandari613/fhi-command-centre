-- Google Calendar integration: token storage and scheduling columns

CREATE TABLE IF NOT EXISTS public.gcal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Add GCal event tracking to jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

-- Add scheduling columns to job_assignments
ALTER TABLE public.job_assignments
ADD COLUMN IF NOT EXISTS gcal_event_id TEXT,
ADD COLUMN IF NOT EXISTS scheduled_start DATE,
ADD COLUMN IF NOT EXISTS scheduled_end DATE;

-- RLS
ALTER TABLE public.gcal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own gcal tokens"
  ON public.gcal_tokens
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
