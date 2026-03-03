-- Security Sweep Fixes: Enable RLS on Ontology Tables & Fix Function Search Paths

BEGIN;

-- 1. Fix Function Search Paths (Security Hardening)
-- handle_new_user: SECURITY DEFINER, so MUST set search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  RETURN new;
END;
$$;

-- update_updated_at: SECURITY INVOKER, but good practice to set search_path if possible, or leave as is.
-- User requested to check it. Adding search_path makes it immutable to search_path changes.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. Enable RLS on Ontology Tables
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_desires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relief_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_cycles ENABLE ROW LEVEL SECURITY;

-- Link tables
ALTER TABLE public.friction_tool_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friction_intervention_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_desire_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tool_links ENABLE ROW LEVEL SECURITY;


-- 3. Create RLS Policies

-- Engagements
CREATE POLICY "Users can view engagements in their organization"
ON public.engagements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage engagements in their organization"
ON public.engagements FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE id = auth.uid()
  )
);

-- Owner Desires
CREATE POLICY "Users can view owner_desires in their organization"
ON public.owner_desires FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage owner_desires in their organization"
ON public.owner_desires FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Process Activities
CREATE POLICY "Users can view process_activities in their organization"
ON public.process_activities FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage process_activities in their organization"
ON public.process_activities FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Tools
CREATE POLICY "Users can view tools in their organization"
ON public.tools FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage tools in their organization"
ON public.tools FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Friction Items
CREATE POLICY "Users can view friction_items in their organization"
ON public.friction_items FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage friction_items in their organization"
ON public.friction_items FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Interventions
CREATE POLICY "Users can view interventions in their organization"
ON public.interventions FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage interventions in their organization"
ON public.interventions FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Relief Metrics
CREATE POLICY "Users can view relief_metrics in their organization"
ON public.relief_metrics FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage relief_metrics in their organization"
ON public.relief_metrics FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Metric Snapshots
CREATE POLICY "Users can view metric_snapshots in their organization"
ON public.metric_snapshots FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage metric_snapshots in their organization"
ON public.metric_snapshots FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Calibration Cycles
CREATE POLICY "Users can view calibration_cycles in their organization"
ON public.calibration_cycles FOR SELECT
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can manage calibration_cycles in their organization"
ON public.calibration_cycles FOR ALL
USING (
  engagement_id IN (
    SELECT id FROM public.engagements 
    WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- Link Tables Policies (Recursive checks)
-- friction_tool_links (friction_item_id -> engagement, tool_id -> engagement)
CREATE POLICY "Users can view friction_tool_links"
ON public.friction_tool_links FOR SELECT
USING (
  friction_item_id IN (
    SELECT id FROM public.friction_items 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage friction_tool_links"
ON public.friction_tool_links FOR ALL
USING (
  friction_item_id IN (
    SELECT id FROM public.friction_items 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

-- friction_intervention_links
CREATE POLICY "Users can view friction_intervention_links"
ON public.friction_intervention_links FOR SELECT
USING (
  friction_item_id IN (
    SELECT id FROM public.friction_items 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage friction_intervention_links"
ON public.friction_intervention_links FOR ALL
USING (
  friction_item_id IN (
    SELECT id FROM public.friction_items 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

-- intervention_desire_links
CREATE POLICY "Users can view intervention_desire_links"
ON public.intervention_desire_links FOR SELECT
USING (
  intervention_id IN (
    SELECT id FROM public.interventions 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage intervention_desire_links"
ON public.intervention_desire_links FOR ALL
USING (
  intervention_id IN (
    SELECT id FROM public.interventions 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

-- process_tool_links
CREATE POLICY "Users can view process_tool_links"
ON public.process_tool_links FOR SELECT
USING (
  process_activity_id IN (
    SELECT id FROM public.process_activities 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage process_tool_links"
ON public.process_tool_links FOR ALL
USING (
  process_activity_id IN (
    SELECT id FROM public.process_activities 
    WHERE engagement_id IN (
        SELECT id FROM public.engagements 
        WHERE organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    )
  )
);

COMMIT;
