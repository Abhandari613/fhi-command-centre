ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS expected_supplies jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.expected_supplies IS 'List of supplies the client is expected to purchase';
