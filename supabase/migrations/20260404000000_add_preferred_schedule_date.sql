-- Add preferred_schedule_date column for client schedule picker
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_schedule_date DATE;

COMMENT ON COLUMN jobs.preferred_schedule_date IS 'Client-selected preferred date from portal schedule picker. Cleared when Frank confirms the schedule.';
