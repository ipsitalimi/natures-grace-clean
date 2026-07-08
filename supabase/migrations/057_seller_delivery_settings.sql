-- Per-seller delivery tiers and per-seller selections in cart checkout.

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS delivery_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sellers.delivery_settings IS
  'JSON: standard/express/overnight tiers with enabled, minDays, maxDays, price (INR).';

ALTER TABLE public.cart_sessions
  ADD COLUMN IF NOT EXISTS seller_delivery_options JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cart_sessions.seller_delivery_options IS
  'JSON map of seller_id -> delivery tier id (standard|express|overnight).';
