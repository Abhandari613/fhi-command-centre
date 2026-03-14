-- Add workflow columns to jobs table to support Quote-to-Job automation

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS estimated_duration integer, -- Estimated days to complete
ADD COLUMN IF NOT EXISTS requires_supplies boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS supplies_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS deposit_status text CHECK (deposit_status IN ('pending', 'paid', 'waived')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS client_viewed_at timestamp with time zone;

-- Comments for documentation
COMMENT ON COLUMN public.jobs.estimated_duration IS 'Estimated duration of the job in days';
COMMENT ON COLUMN public.jobs.requires_supplies IS 'Flag indicating if client must provide supplies';
COMMENT ON COLUMN public.jobs.deposit_status IS 'Status of the initial deposit (pending, paid, waived)';
