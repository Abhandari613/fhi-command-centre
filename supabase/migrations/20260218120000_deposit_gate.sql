-- Enforce Deposit Gate: Prevent job scheduling if deposit is required but not paid

CREATE OR REPLACE FUNCTION public.check_job_schedule_enablement()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status is changing to 'scheduled'
    IF (NEW.status = 'scheduled' AND (OLD.status IS DISTINCT FROM 'scheduled')) THEN
        
        -- Check if deposit is required
        IF (NEW.deposit_required = true) THEN
            -- Check if deposit is NOT paid
            IF (NEW.deposit_status IS NULL OR NEW.deposit_status != 'paid') THEN
                RAISE EXCEPTION 'Deposit Gate: Cannot move job to scheduled status until deposit is marked as paid.';
            END IF;
        END IF;
        
    END IF;
    return NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_schedule_deposit_gate ON public.jobs;

CREATE TRIGGER enforce_schedule_deposit_gate
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.check_job_schedule_enablement();
