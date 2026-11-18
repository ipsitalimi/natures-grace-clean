-- Restore the atomic earning ledger functions required by practitioner and seller
-- wallet sync. Payout transfers remain manual; this migration does not create or
-- execute payouts.

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
     OR v_booking.razorpay_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Verified paid booking not found');
  END IF;

  INSERT INTO practitioner_wallets(practitioner_id, commission_rate, bank_account_label, next_payout_date)
  VALUES(v_booking.practitioner_id, p_commission_rate, NULL, NULL)
  ON CONFLICT (practitioner_id) DO NOTHING;

  SELECT * INTO v_wallet FROM practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM practitioner_wallet_transactions
     WHERE wallet_id = v_wallet.id AND booking_id = p_booking_id AND category = 'booking_earning'
  ) THEN
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
     SET total_earned = total_earned + v_net,
         held_balance = held_balance + v_net
   WHERE id = v_wallet.id;

  RETURN jsonb_build_object('ok', true, 'already_credited', false, 'amount', v_net);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', true, 'already_credited', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_wallet_earning(
  p_wallet_type TEXT,
  p_wallet_id UUID,
  p_order_or_booking_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earning RECORD;
  v_exists BOOLEAN;
BEGIN
  IF p_wallet_type = 'seller' THEN
    SELECT * INTO v_earning FROM wallet_transactions
     WHERE wallet_id = p_wallet_id AND order_id = p_order_or_booking_id
       AND category = 'order_earning' FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Earning not found'); END IF;
    PERFORM 1 FROM seller_wallets WHERE id = p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found'); END IF;
    SELECT EXISTS(SELECT 1 FROM wallet_transactions WHERE wallet_id=p_wallet_id
      AND order_id=p_order_or_booking_id AND category='earning_release') INTO v_exists;
    IF v_exists OR v_earning.is_released THEN
      RETURN jsonb_build_object('ok', true, 'already_released', true);
    END IF;
    INSERT INTO wallet_transactions(wallet_id,order_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,p_order_or_booking_id,'credit','earning_release',v_earning.amount,p_description,true);
    UPDATE wallet_transactions SET is_released=true WHERE id=v_earning.id;
    UPDATE seller_wallets SET held_balance=GREATEST(0,held_balance-v_earning.amount),
      available_balance=available_balance+v_earning.amount WHERE id=p_wallet_id;
  ELSIF p_wallet_type = 'practitioner' THEN
    SELECT * INTO v_earning FROM practitioner_wallet_transactions
     WHERE wallet_id = p_wallet_id AND booking_id = p_order_or_booking_id
       AND category = 'booking_earning' FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Earning not found'); END IF;
    PERFORM 1 FROM practitioner_wallets WHERE id = p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found'); END IF;
    SELECT EXISTS(SELECT 1 FROM practitioner_wallet_transactions WHERE wallet_id=p_wallet_id
      AND booking_id=p_order_or_booking_id AND category='earning_release') INTO v_exists;
    IF v_exists OR v_earning.is_released THEN
      RETURN jsonb_build_object('ok', true, 'already_released', true);
    END IF;
    INSERT INTO practitioner_wallet_transactions(wallet_id,booking_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,p_order_or_booking_id,'credit','earning_release',v_earning.amount,p_description,true);
    UPDATE practitioner_wallet_transactions SET is_released=true WHERE id=v_earning.id;
    UPDATE practitioner_wallets SET held_balance=GREATEST(0,held_balance-v_earning.amount),
      available_balance=available_balance+v_earning.amount WHERE id=p_wallet_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid wallet type');
  END IF;
  RETURN jsonb_build_object('ok', true, 'already_released', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_wallet_earning(
  p_wallet_type TEXT,
  p_wallet_id UUID,
  p_order_or_booking_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earning RECORD;
  v_exists BOOLEAN;
BEGIN
  IF p_wallet_type = 'seller' THEN
    SELECT * INTO v_earning FROM wallet_transactions
     WHERE wallet_id=p_wallet_id AND order_id=p_order_or_booking_id
       AND category='order_earning' FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'no_earning', true); END IF;
    PERFORM 1 FROM seller_wallets WHERE id=p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found'); END IF;
    SELECT EXISTS(SELECT 1 FROM wallet_transactions WHERE wallet_id=p_wallet_id
      AND order_id=p_order_or_booking_id AND category='refund') INTO v_exists;
    IF v_exists THEN RETURN jsonb_build_object('ok', true, 'already_reversed', true); END IF;
    INSERT INTO wallet_transactions(wallet_id,order_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,p_order_or_booking_id,'debit','refund',v_earning.amount,p_description,true);
    UPDATE seller_wallets SET total_earned=GREATEST(0,total_earned-v_earning.amount),
      available_balance=CASE WHEN v_earning.is_released THEN GREATEST(0,available_balance-v_earning.amount) ELSE available_balance END,
      held_balance=CASE WHEN NOT v_earning.is_released THEN GREATEST(0,held_balance-v_earning.amount) ELSE held_balance END
      WHERE id=p_wallet_id;
  ELSIF p_wallet_type = 'practitioner' THEN
    SELECT * INTO v_earning FROM practitioner_wallet_transactions
     WHERE wallet_id=p_wallet_id AND booking_id=p_order_or_booking_id
       AND category='booking_earning' FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'no_earning', true); END IF;
    PERFORM 1 FROM practitioner_wallets WHERE id=p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found'); END IF;
    SELECT EXISTS(SELECT 1 FROM practitioner_wallet_transactions WHERE wallet_id=p_wallet_id
      AND booking_id=p_order_or_booking_id AND category='refund') INTO v_exists;
    IF v_exists THEN RETURN jsonb_build_object('ok', true, 'already_reversed', true); END IF;
    INSERT INTO practitioner_wallet_transactions(wallet_id,booking_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,p_order_or_booking_id,'debit','refund',v_earning.amount,p_description,true);
    UPDATE practitioner_wallets SET total_earned=GREATEST(0,total_earned-v_earning.amount),
      available_balance=CASE WHEN v_earning.is_released THEN GREATEST(0,available_balance-v_earning.amount) ELSE available_balance END,
      held_balance=CASE WHEN NOT v_earning.is_released THEN GREATEST(0,held_balance-v_earning.amount) ELSE held_balance END
      WHERE id=p_wallet_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid wallet type');
  END IF;
  RETURN jsonb_build_object('ok', true, 'already_reversed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_wallet_earning(TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_wallet_earning(TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_wallet_earning(TEXT, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_wallet_earning(TEXT, UUID, UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
