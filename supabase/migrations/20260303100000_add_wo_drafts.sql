CREATE TABLE IF NOT EXISTS public.work_order_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    source TEXT NOT NULL CHECK (source IN ('voice', 'email')),
    raw_content TEXT NOT NULL,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.work_order_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drafts in their organization"
    ON public.work_order_drafts FOR SELECT
    USING (organization_id = public.get_auth_user_org_id());

CREATE POLICY "Users can insert drafts in their organization"
    ON public.work_order_drafts FOR INSERT
    WITH CHECK (organization_id = public.get_auth_user_org_id());

CREATE POLICY "Users can update drafts in their organization"
    ON public.work_order_drafts FOR UPDATE
    USING (organization_id = public.get_auth_user_org_id());

CREATE POLICY "Users can delete drafts in their organization"
    ON public.work_order_drafts FOR DELETE
    USING (organization_id = public.get_auth_user_org_id());
