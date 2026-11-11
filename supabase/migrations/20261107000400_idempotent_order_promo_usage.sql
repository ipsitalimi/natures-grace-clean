-- Track per-order promo usage so webhook retries do not increment counters twice.
CREATE TABLE IF NOT EXISTS public.store_order_promo_usage (
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('seller', 'platform')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, promo_id, promo_type)
);

CREATE OR REPLACE FUNCTION public.apply_store_order_promo_usage(
  p_order_id UUID,
  p_promo_id UUID,
  p_promo_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  IF p_promo_type NOT IN ('seller', 'platform') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid promo type');
  END IF;

  INSERT INTO store_order_promo_usage(order_id, promo_id, promo_type)
  VALUES (p_order_id, p_promo_id, p_promo_type)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;

  IF p_promo_type = 'seller' THEN
    UPDATE seller_promos SET usage_count = usage_count + 1 WHERE id = p_promo_id;
  ELSE
    UPDATE platform_promo_codes SET usage_count = usage_count + 1 WHERE id = p_promo_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already_applied', false);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) TO service_role;
