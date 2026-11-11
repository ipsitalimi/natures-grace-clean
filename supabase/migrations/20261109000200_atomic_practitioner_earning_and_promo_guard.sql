-- Atomic practitioner earning credit for wallet sync/reconciliation paths.
-- Booking checkout fulfillment already credits earning atomically in its own RPC.
-- This function covers the separate sync/manual credit path. Not applied to any DB.

CREATE OR REPLACE FUNCTION public.credit_practitioner_booking_earning(
  p_booking_id UUID,
  p_commission_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_wallet RECORD;
  v_net NUMERIC(12,2);
  v_rate NUMERIC(5,2);
BEGIN
  IF p_booking_id IS NULL OR p_commission_rate IS NULL
     OR p_commission_rate < 0 OR p_commission_rate > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid earning inputs');
  END IF;

  SELECT id, booking_number, practitioner_id, payment_status, booking_status,
         amount, service_name, razorpay_payment_id
    INTO v_booking
    FROM practitioner_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND OR v_booking.payment_status <> 'Paid'
     OR v_booking.practitioner_id IS NULL
     OR v_booking.razorpay_payment_id IS NULL
     THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Verified paid booking not found');
  END IF;

  INSERT INTO practitioner_wallets(practitioner_id, commission_rate, bank_account_label, next_payout_date)
  VALUES(v_booking.practitioner_id, p_commission_rate, NULL, NULL)
  ON CONFLICT (practitioner_id) DO NOTHING;

  SELECT * INTO v_wallet FROM practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found');
  END IF;

  IF EXISTS(SELECT 1 FROM practitioner_wallet_transactions
    WHERE wallet_id=v_wallet.id AND booking_id=p_booking_id AND category='booking_earning') THEN
    RETURN jsonb_build_object('ok', true, 'already_credited', true);
  END IF;

  v_rate := COALESCE(v_wallet.commission_rate, p_commission_rate);
  v_net := ROUND(v_booking.amount * (1 - v_rate / 100), 2);

  INSERT INTO practitioner_wallet_transactions(
    wallet_id, booking_id, type, category, amount, description, is_released
  ) VALUES (
    v_wallet.id, v_booking.id, 'credit', 'booking_earning', v_net,
    'Session ' || v_booking.booking_number || ' — ' || v_booking.service_name, false
  );

  UPDATE practitioner_wallets
     SET total_earned=total_earned+v_net, held_balance=held_balance+v_net
   WHERE id=v_wallet.id;

  RETURN jsonb_build_object('ok',true,'already_credited',false,'amount',v_net);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',true,'already_credited',true);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) TO service_role;

-- Fail closed if a referenced promo row is missing: do not retain a usage marker
-- for a counter that was not actually incremented.
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
  v_updated INTEGER;
BEGIN
  IF p_promo_type NOT IN ('seller','platform') THEN
    RETURN jsonb_build_object('ok',false,'error','Invalid promo type');
  END IF;

  INSERT INTO store_order_promo_usage(order_id,promo_id,promo_type)
  VALUES(p_order_id,p_promo_id,p_promo_type)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;

  IF v_inserted=0 THEN
    RETURN jsonb_build_object('ok',true,'already_applied',true);
  END IF;

  IF p_promo_type='seller' THEN
    UPDATE seller_promos SET usage_count=usage_count+1 WHERE id=p_promo_id;
  ELSE
    UPDATE platform_promo_codes SET usage_count=usage_count+1 WHERE id=p_promo_id;
  END IF;
  GET DIAGNOSTICS v_updated=ROW_COUNT;

  IF v_updated=0 THEN
    RAISE EXCEPTION 'Promo % not found; rolling back promo usage marker',p_promo_id;
  END IF;

  RETURN jsonb_build_object('ok',true,'already_applied',false);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_store_order_promo_usage(UUID, UUID, TEXT) TO service_role;
