-- Phase A: flash sale / bundle campaign variants on seller_promos

ALTER TABLE public.seller_promos
  ADD COLUMN IF NOT EXISTS promo_kind TEXT NOT NULL DEFAULT 'standard'
    CHECK (promo_kind IN ('standard', 'flash_sale', 'bundle')),
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS seller_promos_kind_idx ON public.seller_promos (seller_id, promo_kind);

-- Redeemable rows must respect optional start window.
DROP POLICY IF EXISTS "seller_promos_select_active" ON public.seller_promos;
CREATE POLICY "seller_promos_select_active"
  ON public.seller_promos FOR SELECT TO authenticated
  USING (
    status = 'Active'
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  );
