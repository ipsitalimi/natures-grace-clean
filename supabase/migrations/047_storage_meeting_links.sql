-- Storage buckets, session meeting links, product image support

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

ALTER TABLE public.practitioner_bookings
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- ---------------------------------------------------------------------------
-- Supabase Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'application-documents',
    'application-documents',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Product images: public read; sellers upload under own profile id prefix
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_seller_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_seller_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_seller_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Application documents: owner read/write under applications/{application_id}/...
CREATE POLICY "app_docs_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.role_applications ra
        WHERE ra.id::text = (storage.foldername(name))[1]
          AND ra.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "app_docs_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND EXISTS (
      SELECT 1 FROM public.role_applications ra
      WHERE ra.id::text = (storage.foldername(name))[1]
        AND ra.user_id = auth.uid()
    )
  );

CREATE POLICY "app_docs_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND EXISTS (
      SELECT 1 FROM public.role_applications ra
      WHERE ra.id::text = (storage.foldername(name))[1]
        AND ra.user_id = auth.uid()
    )
  );
