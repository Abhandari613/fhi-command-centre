-- Create "receipts" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects
-- We assume a folder structure of: {organization_id}/{user_id}/{filename} or just {organization_id}/{filename}
-- The plan specified org-level isolation, so matching the first path segment to the user's organization_id is robust.

-- 1. Allow Uploads (INSERT)
CREATE POLICY "Allow authenticated uploads to org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- 2. Allow Viewing (SELECT)
CREATE POLICY "Allow users to view files in org folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- 3. Allow Updates (UPDATE) - e.g. moving files, renaming
CREATE POLICY "Allow users to update files in org folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Allow Deletion (DELETE)
CREATE POLICY "Allow users to delete files in org folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);
