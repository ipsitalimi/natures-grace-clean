-- Keep internal store-order bookkeeping accessible only to trusted backend code.
ALTER TABLE public.store_order_stock_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_promo_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.store_order_stock_fulfillments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.store_order_promo_usage FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.credit_seller_order_earning(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_paid_store_order_stock(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_store_order_stock(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_store_order_promo_usage(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_seller_order_earning(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_paid_store_order_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_store_order_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_store_order_promo_usage(UUID, UUID, TEXT) TO service_role;
