-- Phase 3: Completion workflow — task-photo linking, completion reports, punch lists
BEGIN;

-- ============================================================
-- 1. Task-to-photo linking (reconciliation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_photo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.job_tasks(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.job_photos(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, photo_id)
);

ALTER TABLE public.task_photo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task_photo_links via job org"
  ON public.task_photo_links FOR SELECT USING (
    task_id IN (
      SELECT jt.id FROM public.job_tasks jt
      JOIN public.jobs j ON j.id = jt.job_id
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage task_photo_links via job org"
  ON public.task_photo_links FOR ALL USING (
    task_id IN (
      SELECT jt.id FROM public.job_tasks jt
      JOIN public.jobs j ON j.id = jt.job_id
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 2. Completion reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'punch_list')) DEFAULT 'draft',
  sent_to TEXT[],
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view completion_reports via org"
  ON public.completion_reports FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage completion_reports via org"
  ON public.completion_reports FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 3. Punch list items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_report_id UUID NOT NULL REFERENCES public.completion_reports(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  resolved_photo_id UUID REFERENCES public.job_photos(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view punch_list_items via job org"
  ON public.punch_list_items FOR SELECT USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage punch_list_items via job org"
  ON public.punch_list_items FOR ALL USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. Expand photo types to include completion and punch_list
-- ============================================================
ALTER TABLE public.job_photos DROP CONSTRAINT IF EXISTS job_photos_type_check;
-- Note: job_photos may not have a named constraint. This is a safe no-op if not.
-- The type column accepts any text by default, which is fine for flexibility.

COMMIT;
