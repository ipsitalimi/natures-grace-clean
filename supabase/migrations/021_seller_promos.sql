-- Phase A: seller-owned promo codes (store checkout + seller dashboard)

CREATE TABLE IF NOT EXISTS public.seller_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_order NUMERIC(12, 2),
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, code)
);

CREATE INDEX IF NOT EXISTS seller_promos_seller_idx ON public.seller_promos (seller_id);

DROP TRIGGER IF EXISTS seller_promos_updated_at ON public.seller_promos;
CREATE TRIGGER seller_promos_updated_at
  BEFORE UPDATE ON public.seller_promos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Columns must exist before policies that reference cart_sessions.seller_promo_id.
ALTER TABLE public.cart_sessions
  ADD COLUMN IF NOT EXISTS seller_promo_id UUID REFERENCES public.seller_promos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (promo_discount >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_promo_id UUID REFERENCES public.seller_promos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (promo_discount >= 0);

ALTER TABLE public.seller_promos ENABLE ROW LEVEL SECURITY;

-- Sellers manage their own promos (match profile ↔ seller row).
CREATE POLICY "seller_promos_owner_all"
  ON public.seller_promos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_promos.seller_id AND s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_promos.seller_id AND s.profile_id = auth.uid()
    )
  );

-- Buyers (and sellers) may read redeemable promo rows at checkout validation.
CREATE POLICY "seller_promos_select_active"
  ON public.seller_promos FOR SELECT TO authenticated
  USING (
    status = 'Active'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  );

CREATE POLICY "seller_promos_admin_all"
  ON public.seller_promos FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Row attached to viewer's cart (recompute totals if seller paused the code).
CREATE POLICY "seller_promos_select_applied_own_cart"
  ON public.seller_promos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.user_id = auth.uid() AND cs.seller_promo_id = seller_promos.id
    )
  );
