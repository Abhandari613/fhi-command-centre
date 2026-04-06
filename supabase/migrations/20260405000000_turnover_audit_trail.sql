-- Turnover-Centric Redesign: Audit Trail, Unit Status Simplification, Workload Capacity
BEGIN;

-- ============================================================
-- 1. Turnover Events — full audit trail for every mutation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.turnover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_id UUID NOT NULL REFERENCES public.turnovers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'stage_changed',
    'task_added',
    'task_completed',
    'task_skipped',
    'assigned',
    'unassigned',
    'cost_updated',
    'note_added',
    'job_linked',
    'photo_added',
    'completed'
  )),
  previous_value JSONB,     -- e.g. {"stage": "inspection"}
  new_value JSONB,          -- e.g. {"stage": "in_progress"}
  metadata JSONB,           -- flexible extra context
  actor_id UUID,            -- user who triggered the event
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org turnover events"
  ON public.turnover_events FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org turnover events"
  ON public.turnover_events FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_turnover_events_turnover ON public.turnover_events(turnover_id);
CREATE INDEX idx_turnover_events_org ON public.turnover_events(organization_id);
CREATE INDEX idx_turnover_events_type ON public.turnover_events(event_type);

-- ============================================================
-- 2. Add completion tracking columns to turnovers
-- ============================================================
ALTER TABLE public.turnovers
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_ready_date DATE;

-- Duration in days (computed from created_at to completed_at)
-- Using a view or application-level calc since GENERATED ALWAYS
-- requires the expression to reference only the same row's columns
-- and completed_at may be null most of the time.

-- ============================================================
-- 3. Simplify unit status: replace occupied/vacant with idle
-- ============================================================

-- Drop the old CHECK constraint (name may vary, so drop by column)
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_status_check;

-- Migrate existing data
UPDATE public.units SET status = 'idle' WHERE status IN ('occupied', 'vacant');

-- Add new constraint with simplified statuses
ALTER TABLE public.units ADD CONSTRAINT units_status_check
  CHECK (status IN ('idle', 'turnover', 'ready', 'offline'));

-- Update default
ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'idle';

-- Update the status index to reflect new values
DROP INDEX IF EXISTS idx_units_status;
CREATE INDEX idx_units_status ON public.units(status) WHERE status IN ('idle', 'turnover');

-- ============================================================
-- 4. Add max_concurrent_tasks to subcontractors for capacity
-- ============================================================
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks INTEGER NOT NULL DEFAULT 5;

-- ============================================================
-- 5. Update property_turnover_summary view for new statuses
-- ============================================================
CREATE OR REPLACE VIEW public.property_turnover_summary AS
SELECT
  p.id AS property_id,
  p.name AS property_name,
  p.address AS property_address,
  p.organization_id,
  COUNT(DISTINCT b.id) AS building_count,
  COUNT(DISTINCT u.id) AS total_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'turnover') AS units_in_turnover,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'ready') AS units_ready,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'idle') AS units_idle,
  COUNT(DISTINCT t.id) FILTER (WHERE t.is_active AND t.stage NOT IN ('ready')) AS active_turnovers,
  COUNT(DISTINCT t.id) FILTER (WHERE t.is_active AND t.stage = 'ready') AS completed_turnovers
FROM public.properties p
LEFT JOIN public.buildings b ON b.property_id = p.id
LEFT JOIN public.units u ON u.building_id = b.id
LEFT JOIN public.turnovers t ON t.unit_id = u.id
WHERE p.is_active = TRUE
GROUP BY p.id;

-- ============================================================
-- 6. Useful views for workload queries
-- ============================================================

-- Subcontractor workload: active task count across all turnovers
CREATE OR REPLACE VIEW public.subcontractor_workload AS
SELECT
  s.id AS subcontractor_id,
  s.name AS subcontractor_name,
  s.organization_id,
  s.max_concurrent_tasks,
  COUNT(tt.id) FILTER (WHERE tt.status IN ('pending', 'in_progress')) AS active_task_count,
  COUNT(tt.id) FILTER (WHERE tt.status = 'completed') AS completed_task_count,
  CASE
    WHEN COUNT(tt.id) FILTER (WHERE tt.status IN ('pending', 'in_progress')) > s.max_concurrent_tasks
    THEN 'overloaded'
    WHEN COUNT(tt.id) FILTER (WHERE tt.status IN ('pending', 'in_progress')) = s.max_concurrent_tasks
    THEN 'at_capacity'
    ELSE 'available'
  END AS capacity_status
FROM public.subcontractors s
LEFT JOIN public.turnover_tasks tt ON tt.assigned_to = s.id
  AND tt.status IN ('pending', 'in_progress', 'completed')
LEFT JOIN public.turnovers t ON t.id = tt.turnover_id AND t.is_active = TRUE
WHERE s.status = 'active'
GROUP BY s.id;

COMMIT;
