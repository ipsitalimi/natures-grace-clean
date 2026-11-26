-- Public event photo gallery. Uploads are restricted to administrators.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-photos',
  'event-photos',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "event_photos_public_read" ON storage.objects;
CREATE POLICY "event_photos_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "event_photos_admin_insert" ON storage.objects;
CREATE POLICY "event_photos_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND public.is_admin()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "event_photos_admin_delete" ON storage.objects;
CREATE POLICY "event_photos_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND public.is_admin()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
