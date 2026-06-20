-- Seller storefront: philosophy, theme, featured products (extends sellers)

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS philosophy TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS storefront_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sellers.philosophy IS 'Wellness philosophy / about text for seller storefront.';
COMMENT ON COLUMN public.sellers.storefront_settings IS 'JSON: accent_color, banner_theme_index, featured_product_ids (UUID[]).';
