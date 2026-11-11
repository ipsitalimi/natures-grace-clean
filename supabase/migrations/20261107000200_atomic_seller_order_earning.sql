-- Atomic/idempotent seller earning credit.
CREATE OR REPLACE FUNCTION public.credit_seller_order_earning(
  p_order_id UUID,
  p_commission_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_net NUMERIC(12,2);
  v_rate NUMERIC(5,2);
BEGIN
  SELECT id, order_number, seller_id, payment_status, total, status
    INTO v_order
    FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND OR v_order.payment_status <> 'Paid' OR v_order.seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Paid order or seller not found');
  END IF;

  INSERT INTO seller_wallets (seller_id, commission_rate, bank_account_label, next_payout_date)
  VALUES (v_order.seller_id, p_commission_rate, NULL, NULL)
  ON CONFLICT (seller_id) WHERE seller_id IS NOT NULL DO NOTHING;

  SELECT * INTO v_wallet
    FROM seller_wallets WHERE seller_id = v_order.seller_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM wallet_transactions
     WHERE order_id = p_order_id AND category = 'order_earning'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_credited', true);
  END IF;

  v_rate := COALESCE(v_wallet.commission_rate, p_commission_rate);
  v_net := ROUND(v_order.total * (1 - v_rate / 100), 2);

  INSERT INTO wallet_transactions (
    wallet_id, order_id, type, category, amount, description, is_released
  ) VALUES (
    v_wallet.id, v_order.id, 'credit', 'order_earning', v_net,
    'Order ' || v_order.order_number || ' earning', false
  );

  UPDATE seller_wallets
     SET total_earned = total_earned + v_net,
         held_balance = held_balance + v_net
   WHERE id = v_wallet.id;

  RETURN jsonb_build_object('ok', true, 'already_credited', false, 'amount', v_net);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', true, 'already_credited', true);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_seller_order_earning(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_seller_order_earning(UUID, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
