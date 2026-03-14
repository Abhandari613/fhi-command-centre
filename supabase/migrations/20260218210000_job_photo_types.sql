-- Add type column to job_photos table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_photos' AND column_name = 'type') THEN 
        ALTER TABLE job_photos ADD COLUMN type text CHECK (type IN ('before', 'after', 'other')) DEFAULT 'other';
    END IF; 
END $$;
