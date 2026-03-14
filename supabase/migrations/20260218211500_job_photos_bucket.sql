-- Create "job_photos" bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('job_photos', 'job_photos', true) -- Public for now to simplify sharing, or secure if strictly authenticated
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for job_photos
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to job_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'job_photos' );

-- Allow authenticated users to view
CREATE POLICY "Allow authenticated view of job_photos"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'job_photos' );

-- Allow public view if we want clients to see them without auth (via signed URLs is better, but public bucket is easier for now)
-- Actually, let's keep it authenticated for now and use signed URLs or make the bucket public. 
-- The plan said "PublicUrl" in the action, so the bucket needs to be public OR we need to use getPublicUrl on a public bucket.
-- If bucket is public, we don't need RLS for SELECT for anon, but we do need it for INSERT.
