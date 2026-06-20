-- Phase A: review ownership, targets, and user submission policies

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'practitioner'
    CHECK (target_type IN ('practitioner', 'product', 'event')),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.practitioner_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS reviews_user_id_idx
  ON public.reviews (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_booking_id_idx
  ON public.reviews (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique_idx
  ON public.reviews (booking_id)
  WHERE booking_id IS NOT NULL;

DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_select_own"
  ON public.reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'Pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());
