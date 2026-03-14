-- Enable RLS on metric_snapshots
ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Users can view metric_snapshots in own org" ON public.metric_snapshots
    FOR ALL USING (relief_metric_id IN (
        SELECT id FROM public.relief_metrics WHERE engagement_id IN (
            SELECT id FROM public.engagements WHERE organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    ));
