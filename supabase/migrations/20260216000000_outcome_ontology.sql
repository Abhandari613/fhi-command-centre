-- ============================================================
-- OUTCOME ENGINE ONTOLOGY — Frank Home Improvement Instance
-- ============================================================

-- NOTE: organizations table should already exist. If not:
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 1. ENGAGEMENTS (client relationship container)
CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  client_name text NOT NULL,
  client_contact_name text,
  client_contact_email text,
  client_contact_phone text,
  industry_vertical text DEFAULT 'home_improvement',
  employee_count integer,
  phase text NOT NULL DEFAULT 'discovery'
    CHECK (phase IN ('discovery','proposal','active_build','measuring','compounding','paused','completed')),
  retainer_monthly numeric(10,2),
  owner_hourly_rate numeric(10,2),
  currency text DEFAULT 'GBP',
  health_score integer CHECK (health_score BETWEEN 1 AND 100),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_calibration_date date,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. OWNER DESIRES
CREATE TABLE IF NOT EXISTS public.owner_desires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  raw_statement text NOT NULL,
  value_layer text NOT NULL
    CHECK (value_layer IN ('functional','emotional','life_changing','legacy')),
  category text NOT NULL
    CHECK (category IN ('time_reclaim','confidence','freedom','growth','control',
      'simplification','financial_clarity','risk_reduction','delegation','legacy_continuity')),
  priority_score integer NOT NULL CHECK (priority_score BETWEEN 1 AND 10),
  emotional_weight integer CHECK (emotional_weight BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','partially_met','met','revised','withdrawn')),
  evidence_of_delivery text,
  captured_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. PROCESS ACTIVITIES
CREATE TABLE IF NOT EXISTS public.process_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  value_chain_stage text NOT NULL
    CHECK (value_chain_stage IN ('getting_work_in','quoting_selling','doing_the_work',
      'getting_paid','back_office','growing_the_business')),
  performed_by text,
  frequency text,
  estimated_hours_per_week numeric(6,2),
  is_owner_dependent boolean DEFAULT false,
  current_state_notes text,
  ideal_state_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. TOOLS
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('saas','desktop_software','spreadsheet','paper','messaging','manual_process','custom_build')),
  monthly_cost numeric(10,2) DEFAULT 0,
  user_count integer,
  integration_status text DEFAULT 'standalone'
    CHECK (integration_status IN ('standalone','partially_integrated','fully_integrated','to_be_replaced')),
  satisfaction_score integer CHECK (satisfaction_score BETWEEN 1 AND 5),
  intervention_action text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. FRICTION ITEMS
CREATE TABLE IF NOT EXISTS public.friction_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  owner_desire_id uuid REFERENCES public.owner_desires(id),
  process_activity_id uuid REFERENCES public.process_activities(id),
  description text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('admin_duplication','followup_failures','decision_latency',
      'scheduling_chaos','tool_fragmentation','manual_reporting','communication_overhead',
      'error_correction','compliance_risk','owner_dependency','revenue_leakage',
      'customer_experience_gap')),
  data_source text NOT NULL DEFAULT 'self_report'
    CHECK (data_source IN ('analytics','task_shadow','self_report','ai_inferred')),
  occurrences_per_week numeric(6,2),
  duration_minutes integer,
  weekly_time_cost_minutes integer GENERATED ALWAYS AS (
    CASE WHEN occurrences_per_week IS NOT NULL AND duration_minutes IS NOT NULL
      THEN CAST(ROUND(occurrences_per_week * duration_minutes) AS integer)
      ELSE NULL END
  ) STORED,
  cognitive_load_score integer CHECK (cognitive_load_score BETWEEN 1 AND 100),
  risk_probability integer CHECK (risk_probability BETWEEN 1 AND 5),
  risk_impact integer CHECK (risk_impact BETWEEN 1 AND 5),
  risk_score integer GENERATED ALWAYS AS (
    CASE WHEN risk_probability IS NOT NULL AND risk_impact IS NOT NULL
      THEN risk_probability * risk_impact ELSE NULL END
  ) STORED,
  composite_priority numeric(8,2),
  quadrant text CHECK (quadrant IN ('quick_win','strategic_investment','maintenance_fix','monitor_only')),
  status text NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified','scored','targeted','resolving','resolved','recurring','deferred')),
  self_report_haircut boolean DEFAULT false,
  notes text,
  discovered_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 6. INTERVENTIONS
CREATE TABLE IF NOT EXISTS public.interventions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL
    CHECK (type IN ('automation','integration','workflow_redesign','tool_replacement',
      'dashboard_build','training','documentation','custom_build')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','accepted','in_progress','deployed','measuring',
      'validated','underperforming','revised','cancelled')),
  phase integer DEFAULT 1,
  estimated_build_hours numeric(6,2),
  estimated_build_cost numeric(10,2),
  projected_weekly_hours_saved numeric(6,2),
  projected_monthly_value numeric(10,2),
  projection_band text DEFAULT 'conservative'
    CHECK (projection_band IN ('conservative','expected','optimistic')),
  deployment_date date,
  first_measurement_date date,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 7. RELIEF METRICS
CREATE TABLE IF NOT EXISTS public.relief_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  intervention_id uuid REFERENCES public.interventions(id),
  name text NOT NULL,
  metric_type text NOT NULL
    CHECK (metric_type IN ('time_reclaimed','monetary_value','cognitive_load','risk_reduction',
      'error_rate','task_count','response_time','satisfaction','engagement_roi')),
  unit text NOT NULL,
  direction text NOT NULL DEFAULT 'decrease'
    CHECK (direction IN ('decrease','increase')),
  baseline_value numeric(12,2) NOT NULL,
  baseline_date date NOT NULL,
  baseline_source text NOT NULL
    CHECK (baseline_source IN ('analytics','task_shadow','self_report','ai_inferred')),
  target_value numeric(12,2) NOT NULL,
  current_value numeric(12,2),
  "current_date" date,
  confidence_level text DEFAULT 'low'
    CHECK (confidence_level IN ('low','medium','high')),
  measurement_method text,
  measurement_frequency text DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'awaiting_baseline'
    CHECK (status IN ('awaiting_baseline','baselined','tracking','validated','stale')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 8. METRIC SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.metric_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  relief_metric_id uuid REFERENCES public.relief_metrics(id) ON DELETE CASCADE NOT NULL,
  engagement_id uuid REFERENCES public.engagements(id) NOT NULL,
  calibration_cycle_id uuid,
  measured_value numeric(12,2) NOT NULL,
  projected_value numeric(12,2),
  variance_pct numeric(6,2),
  source text NOT NULL
    CHECK (source IN ('analytics','task_shadow','self_report','automated')),
  notes text,
  measured_at timestamptz DEFAULT now() NOT NULL
);

-- 9. CALIBRATION CYCLES
CREATE TABLE IF NOT EXISTS public.calibration_cycles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  cycle_number integer NOT NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','skipped')),
  overall_projection_accuracy numeric(6,2),
  new_friction_count integer DEFAULT 0,
  owner_satisfaction_score integer CHECK (owner_satisfaction_score BETWEEN 1 AND 10),
  owner_satisfaction_notes text,
  confidence_adjustment text
    CHECK (confidence_adjustment IN ('tightened','unchanged','widened')),
  recommendations text,
  health_score_calculated integer CHECK (health_score_calculated BETWEEN 1 AND 100),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE metric_snapshots
  ADD CONSTRAINT fk_snapshots_cycle
  FOREIGN KEY (calibration_cycle_id) REFERENCES calibration_cycles(id);

-- JOIN TABLES
CREATE TABLE IF NOT EXISTS public.friction_tool_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  friction_item_id uuid REFERENCES public.friction_items(id) ON DELETE CASCADE NOT NULL,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE NOT NULL,
  relationship text CHECK (relationship IN ('causes_friction','worsens_friction','missing_tool')),
  UNIQUE(friction_item_id, tool_id)
);

CREATE TABLE IF NOT EXISTS public.friction_intervention_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  friction_item_id uuid REFERENCES public.friction_items(id) ON DELETE CASCADE NOT NULL,
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(friction_item_id, intervention_id)
);

CREATE TABLE IF NOT EXISTS public.intervention_desire_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE CASCADE NOT NULL,
  owner_desire_id uuid REFERENCES public.owner_desires(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(intervention_id, owner_desire_id)
);

CREATE TABLE IF NOT EXISTS public.process_tool_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  process_activity_id uuid REFERENCES public.process_activities(id) ON DELETE CASCADE NOT NULL,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE NOT NULL,
  usage_notes text,
  UNIQUE(process_activity_id, tool_id)
);

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'engagements','owner_desires','process_activities','tools',
    'friction_items','interventions','relief_metrics','calibration_cycles'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl
    );
  END LOOP;
END; $$;

-- INDEXES
CREATE INDEX idx_engagements_org ON engagements(organization_id);
CREATE INDEX idx_engagements_phase ON engagements(phase);
CREATE INDEX idx_owner_desires_engagement ON owner_desires(engagement_id);
CREATE INDEX idx_friction_engagement ON friction_items(engagement_id);
CREATE INDEX idx_friction_status ON friction_items(status);
CREATE INDEX idx_interventions_engagement ON interventions(engagement_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_relief_metrics_engagement ON relief_metrics(engagement_id);
CREATE INDEX idx_snapshots_metric ON metric_snapshots(relief_metric_id);
CREATE INDEX idx_snapshots_date ON metric_snapshots(measured_at);
CREATE INDEX idx_calibration_engagement ON calibration_cycles(engagement_id);
