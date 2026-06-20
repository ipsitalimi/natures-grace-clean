-- Phase A: admin / global promo codes (distinct from seller_promos)

CREATE TABLE IF NOT EXISTS public.platform_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_order NUMERIC(12, 2),
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_promo_codes_status_idx ON public.platform_promo_codes (status);

DROP TRIGGER IF EXISTS platform_promo_codes_updated_at ON public.platform_promo_codes;
CREATE TRIGGER platform_promo_codes_updated_at
  BEFORE UPDATE ON public.platform_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Columns must exist before policies that reference cart_sessions.platform_promo_id.
ALTER TABLE public.cart_sessions
  ADD COLUMN IF NOT EXISTS platform_promo_id UUID REFERENCES public.platform_promo_codes(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_promo_id UUID REFERENCES public.platform_promo_codes(id) ON DELETE SET NULL;

ALTER TABLE public.platform_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_promo_codes_admin_all"
  ON public.platform_promo_codes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "platform_promo_codes_select_active_checkout"
  ON public.platform_promo_codes FOR SELECT TO authenticated
  USING (
    status = 'Active'
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  );

CREATE POLICY "platform_promo_codes_select_applied_own_cart"
  ON public.platform_promo_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.user_id = auth.uid() AND cs.platform_promo_id = platform_promo_codes.id
    )
  );
