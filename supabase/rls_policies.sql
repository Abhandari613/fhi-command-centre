-- Enable RLS on tables in public schema
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'jobs'
-- Allow read/write if the user belongs to the same organization
CREATE POLICY "Users can view jobs in their organization"
ON public.jobs
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE organization_id = jobs.organization_id
  )
);

CREATE POLICY "Users can insert jobs for their organization"
ON public.jobs
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE organization_id = jobs.organization_id
  )
);

CREATE POLICY "Users can update jobs in their organization"
ON public.jobs
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE organization_id = jobs.organization_id
  )
);

-- 2. Policies for 'subcontractors'
CREATE POLICY "Users can view subcontractors in their organization"
ON public.subcontractors
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE organization_id = subcontractors.organization_id
  )
);

CREATE POLICY "Users can manage subcontractors in their organization"
ON public.subcontractors
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE organization_id = subcontractors.organization_id
  )
);

-- 3. Policies for 'user_profiles'
-- Users can see their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Policies for 'quote_line_items' (via parent job relationship)
CREATE POLICY "Users can view line items for their organization's jobs"
ON public.quote_line_items
FOR SELECT
USING (
  exists (
    select 1 from public.jobs j
    where j.id = quote_line_items.job_id
    and auth.uid() in (
      select id from public.user_profiles where organization_id = j.organization_id
    )
  )
);

CREATE POLICY "Users can insert line items for their organization's jobs"
ON public.quote_line_items
FOR INSERT
WITH CHECK (
  exists (
    select 1 from public.jobs j
    where j.id = quote_line_items.job_id
    and auth.uid() in (
      select id from public.user_profiles where organization_id = j.organization_id
    )
  )
);
