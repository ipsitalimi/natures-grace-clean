-- Idempotent promo counter reversal for refunded store orders.
ALTER TABLE public.store_order_promo_usage
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.restore_store_order_promo_usage(
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
  v_usage RECORD;
BEGIN
  SELECT * INTO v_usage
    FROM store_order_promo_usage
   WHERE order_id = p_order_id
     AND promo_id = p_promo_id
     AND promo_type = p_promo_type
   FOR UPDATE;

  IF NOT FOUND OR v_usage.restored_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_restored', true);
  END IF;

  IF p_promo_type = 'seller' THEN
    UPDATE seller_promos SET usage_count = GREATEST(0, usage_count - 1) WHERE id = p_promo_id;
  ELSIF p_promo_type = 'platform' THEN
    UPDATE platform_promo_codes SET usage_count = GREATEST(0, usage_count - 1) WHERE id = p_promo_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid promo type');
  END IF;

  UPDATE store_order_promo_usage SET restored_at = NOW()
   WHERE order_id = p_order_id AND promo_id = p_promo_id AND promo_type = p_promo_type;

  RETURN jsonb_build_object('ok', true, 'already_restored', false);
END;
$$;

REVOKE ALL ON FUNCTION public.restore_store_order_promo_usage(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_store_order_promo_usage(UUID, UUID, TEXT) TO service_role;
