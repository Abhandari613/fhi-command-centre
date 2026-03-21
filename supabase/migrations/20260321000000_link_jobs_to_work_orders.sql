BEGIN;

-- 1. Add job_id FK to work_orders (nullable — WOs can exist without a job for B2B direct dispatch)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON public.work_orders(job_id);

-- 2. Add work_order_id to job_photos (replaces the workaround of querying job_id = work_order.id)
ALTER TABLE public.job_photos
  ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_job_photos_work_order_id ON public.job_photos(work_order_id);

-- 3. Update job_profit_summary view to include linked work order estimated costs
CREATE OR REPLACE VIEW public.job_profit_summary AS
SELECT
  j.id AS job_id,
  j.job_number,
  j.property_address,
  j.status,
  j.final_invoice_amount AS revenue,
  COALESCE(SUM(jp.amount), 0) AS total_payouts,
  j.final_invoice_amount - COALESCE(SUM(jp.amount), 0) AS gross_profit,
  CASE WHEN j.final_invoice_amount > 0
    THEN ((j.final_invoice_amount - COALESCE(SUM(jp.amount), 0)) / j.final_invoice_amount * 100)
    ELSE 0 END AS margin_pct,
  j.organization_id,
  -- Estimated sub costs from linked work order tasks
  COALESCE((
    SELECT SUM(wot.cost_estimate)
    FROM public.work_orders wo
    JOIN public.work_order_tasks wot ON wot.work_order_id = wo.id
    WHERE wo.job_id = j.id
  ), 0) AS wo_estimated_costs,
  -- Work order completion tracking
  COALESCE((
    SELECT COUNT(*) FROM public.work_orders wo WHERE wo.job_id = j.id
  ), 0) AS linked_wo_count,
  COALESCE((
    SELECT COUNT(*) FROM public.work_orders wo WHERE wo.job_id = j.id AND wo.status = 'Completed'
  ), 0) AS completed_wo_count
FROM public.jobs j
LEFT JOIN public.job_payouts jp ON jp.job_id = j.id
WHERE j.status IN ('completed', 'invoiced', 'paid')
GROUP BY j.id;

COMMIT;
