-- Idempotent inventory decrement/restoration per paid store order.
CREATE TABLE IF NOT EXISTS public.store_order_stock_fulfillments (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  fulfilled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.decrement_paid_store_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_product RECORD;
BEGIN
  SELECT id, payment_status INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.payment_status <> 'Paid' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order must be paid before stock decrement');
  END IF;

  INSERT INTO store_order_stock_fulfillments(order_id)
  VALUES (p_order_id)
  ON CONFLICT (order_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_decremented', true);
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, stock INTO v_product
      FROM products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND OR v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id;
    END IF;

    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'already_decremented', false);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_store_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_fulfillment RECORD;
BEGIN
  SELECT * INTO v_fulfillment
    FROM store_order_stock_fulfillments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'restored', false, 'reason', 'stock was not decremented');
  END IF;
  IF v_fulfillment.restored_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'restored', true, 'already_restored', true);
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL AND v_item.quantity > 0 THEN
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE store_order_stock_fulfillments SET restored_at = NOW() WHERE order_id = p_order_id;
  RETURN jsonb_build_object('ok', true, 'restored', true, 'already_restored', false);
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_paid_store_order_stock(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_store_order_stock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_paid_store_order_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_store_order_stock(UUID) TO service_role;
