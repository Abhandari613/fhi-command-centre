-- Location Hierarchy: Property > Building > Unit > Turnover
-- Fixes broken FKs + adds multi-unit apartment turnover tracking
BEGIN;

-- ============================================================
-- 0. Fix: Create missing get_auth_user_org_id() function
--    (Referenced by work_order_drafts RLS but never created)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 1. Properties — top-level locations (apartment complexes, sites)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,                    -- e.g. "Maple Gardens", "Riverside Towers"
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org properties"
  ON public.properties FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org properties"
  ON public.properties FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_properties_org ON public.properties(organization_id);
CREATE INDEX idx_properties_client ON public.properties(client_id);

-- ============================================================
-- 2. Buildings — within a property complex
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,                    -- e.g. "Building C", "North Tower"
  code TEXT,                             -- short code e.g. "C", "NT"
  address TEXT,                          -- override if different from property
  floor_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org buildings"
  ON public.buildings FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org buildings"
  ON public.buildings FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_buildings_property ON public.buildings(property_id);
CREATE INDEX idx_buildings_org ON public.buildings(organization_id);

-- ============================================================
-- 3. Units — individual apartments/suites within a building
-- ============================================================
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  unit_number TEXT NOT NULL,             -- e.g. "204", "3B"
  floor INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  sqft INTEGER,
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN (
    'occupied', 'vacant', 'turnover', 'ready', 'offline'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org units"
  ON public.units FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org units"
  ON public.units FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_units_building ON public.units(building_id);
CREATE INDEX idx_units_org ON public.units(organization_id);
CREATE INDEX idx_units_status ON public.units(status) WHERE status IN ('vacant', 'turnover');

-- ============================================================
-- 4. Turnovers — unit make-ready lifecycle tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.turnovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  -- Dates
  move_out_date DATE,
  target_ready_date DATE,
  move_in_date DATE,
  -- Stage tracking
  stage TEXT NOT NULL DEFAULT 'notice' CHECK (stage IN (
    'notice',           -- Move-out notice received
    'vacated',          -- Tenant moved out
    'inspection',       -- Walk-through / punch list creation
    'in_progress',      -- Repairs underway
    'paint',            -- Painting phase
    'clean',            -- Deep clean phase
    'final_qc',         -- Final quality check
    'ready'             -- Move-in ready
  )),
  -- Assignment
  assigned_to UUID REFERENCES public.subcontractors(id),
  -- Financials
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  -- Linkage to job system
  job_id UUID REFERENCES public.jobs(id),
  -- Meta
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turnovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org turnovers"
  ON public.turnovers FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org turnovers"
  ON public.turnovers FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_turnovers_unit ON public.turnovers(unit_id);
CREATE INDEX idx_turnovers_org ON public.turnovers(organization_id);
CREATE INDEX idx_turnovers_stage ON public.turnovers(stage) WHERE is_active = TRUE;
CREATE INDEX idx_turnovers_dates ON public.turnovers(target_ready_date) WHERE is_active = TRUE;
CREATE INDEX idx_turnovers_move_in ON public.turnovers(move_in_date) WHERE is_active = TRUE;

-- ============================================================
-- 5. Turnover Tasks — individual tasks within a turnover
-- ============================================================
CREATE TABLE IF NOT EXISTS public.turnover_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_id UUID NOT NULL REFERENCES public.turnovers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  description TEXT NOT NULL,
  trade TEXT,                            -- e.g. 'painting', 'plumbing', 'cleaning', 'general'
  assigned_to UUID REFERENCES public.subcontractors(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turnover_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org turnover tasks"
  ON public.turnover_tasks FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org turnover tasks"
  ON public.turnover_tasks FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_turnover_tasks_turnover ON public.turnover_tasks(turnover_id);

-- ============================================================
-- 6. Turnover Templates — reusable task checklists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.turnover_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,                    -- e.g. "Standard 1BR Turn", "Full Reno 2BR"
  description TEXT,
  tasks JSONB NOT NULL DEFAULT '[]',     -- [{description, trade, estimated_cost, sort_order}]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turnover_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org turnover templates"
  ON public.turnover_templates FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage org turnover templates"
  ON public.turnover_templates FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 7. Fix: Point recurring_schedules.location_id to properties
--    (Was referencing non-existent public.locations)
-- ============================================================
ALTER TABLE public.recurring_schedules
  DROP CONSTRAINT IF EXISTS recurring_schedules_location_id_fkey;

ALTER TABLE public.recurring_schedules
  ADD CONSTRAINT recurring_schedules_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.properties(id);

-- ============================================================
-- 8. Add unit_id to jobs and work_orders for hierarchy linkage
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id),
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id),
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id);

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id),
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id),
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id);

-- ============================================================
-- 9. Views: Property overview with turnover counts
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
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'vacant') AS units_vacant,
  COUNT(DISTINCT t.id) FILTER (WHERE t.is_active AND t.stage NOT IN ('ready')) AS active_turnovers,
  COUNT(DISTINCT t.id) FILTER (WHERE t.is_active AND t.stage = 'ready') AS completed_turnovers
FROM public.properties p
LEFT JOIN public.buildings b ON b.property_id = p.id
LEFT JOIN public.units u ON u.building_id = b.id
LEFT JOIN public.turnovers t ON t.unit_id = u.id
WHERE p.is_active = TRUE
GROUP BY p.id;

COMMIT;
