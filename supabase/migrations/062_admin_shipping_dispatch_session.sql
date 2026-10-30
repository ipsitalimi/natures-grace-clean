-- Product courier/shipping charge (separate from product price)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_charge NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Dispatch video on orders (seller packed flow)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispatch_video_url TEXT;

-- Storage bucket for order dispatch videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-dispatch-videos',
  'order-dispatch-videos',
  false,
  52428800,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Sellers can upload videos for their own orders; admins can read all
CREATE POLICY "order_dispatch_videos_seller_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-dispatch-videos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.sellers s ON s.id = o.seller_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND s.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_dispatch_videos_seller_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'order-dispatch-videos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.sellers s ON s.id = o.seller_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND s.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_dispatch_videos_admin_seller_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-dispatch-videos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.sellers s ON s.id = o.seller_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND s.profile_id = auth.uid()
      )
    )
  );

-- Widen activity_log action types for federated activity grouping (optional future writes)
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;
ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_action_type_check
  CHECK (action_type IN (
    'booking', 'user', 'review', 'event', 'store', 'settings',
    'login', 'order'
  ));
