-- Finance bridge: job payouts + profit summary

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS final_invoice_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.job_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  subcontractor_id UUID REFERENCES public.subcontractors(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  paid_at TIMESTAMPTZ,
  finance_transaction_id UUID REFERENCES public.finance_transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage job payouts in their org"
  ON public.job_payouts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Profit summary view
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
  j.organization_id
FROM public.jobs j
LEFT JOIN public.job_payouts jp ON jp.job_id = j.id
WHERE j.status IN ('completed', 'invoiced', 'paid')
GROUP BY j.id;
