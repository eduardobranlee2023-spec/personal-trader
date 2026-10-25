INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-images',
  'trade-images',
  false,
  10485760,
  ARRAY['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can view own trade images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trade-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_access(auth.uid())
  );

CREATE POLICY "Users can upload own trade images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trade-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_access(auth.uid())
  );

CREATE POLICY "Users can update own trade images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'trade-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_access(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'trade-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_access(auth.uid())
  );

CREATE POLICY "Users can delete own trade images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trade-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_access(auth.uid())
  );
