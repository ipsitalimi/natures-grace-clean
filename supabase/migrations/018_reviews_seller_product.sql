-- Phase A: seller product review replies and order linkage

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS seller_reply TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_order_product_idx
  ON public.reviews (user_id, order_id)
  WHERE order_id IS NOT NULL AND target_type = 'product';

CREATE INDEX IF NOT EXISTS reviews_product_id_idx
  ON public.reviews (product_id, created_at DESC)
  WHERE product_id IS NOT NULL;

-- Sellers read/update reviews on their own catalog products
CREATE POLICY "reviews_select_seller_products"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    target_type = 'product'
    AND product_id IN (
      SELECT p.id FROM public.products p
      INNER JOIN public.sellers s ON s.id = p.seller_id
      WHERE s.profile_id = auth.uid()
    )
  );

CREATE POLICY "reviews_update_seller_reply"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    target_type = 'product'
    AND product_id IN (
      SELECT p.id FROM public.products p
      INNER JOIN public.sellers s ON s.id = p.seller_id
      WHERE s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    target_type = 'product'
    AND product_id IN (
      SELECT p.id FROM public.products p
      INNER JOIN public.sellers s ON s.id = p.seller_id
      WHERE s.profile_id = auth.uid()
    )
  );
