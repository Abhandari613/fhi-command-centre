BEGIN;

-- Add compliance_status to subcontractors
ALTER TABLE public.subcontractors 
ADD COLUMN compliance_status TEXT CHECK (compliance_status IN ('pending', 'verified', 'expired')) DEFAULT 'pending';

-- 1. Create work_orders
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    property_address_or_unit TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Scheduled', 'In Progress', 'Completed')) DEFAULT 'Draft',
    received_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org work_orders" ON public.work_orders FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org work_orders" ON public.work_orders FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 2. Create work_order_tasks
CREATE TABLE IF NOT EXISTS public.work_order_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    trade_type TEXT NOT NULL, -- e.g. 'Painting', 'Demo', 'Tiling'
    assigned_subcontractor_id UUID REFERENCES public.subcontractors(id),
    status TEXT NOT NULL CHECK (status IN ('Unassigned', 'Scheduled', 'In Progress', 'Completed')) DEFAULT 'Unassigned',
    cost_estimate NUMERIC(12,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: work_order_tasks
ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org work_order_tasks" ON public.work_order_tasks FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage org work_order_tasks" ON public.work_order_tasks FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 3. Modify finance_transactions to link to work orders
ALTER TABLE public.finance_transactions 
ADD COLUMN work_order_id UUID REFERENCES public.work_orders(id),
ADD COLUMN work_order_task_id UUID REFERENCES public.work_order_tasks(id);

COMMIT;
