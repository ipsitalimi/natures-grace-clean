-- Refunds may include platform fee/GST, while practitioner earnings are based on
-- the service amount only. Normalize customer refunds against total customer payment.
DROP FUNCTION IF EXISTS public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.apply_practitioner_booking_refund(
  p_refund_request_id UUID,
  p_booking_id UUID,
  p_refund_amount_inr NUMERIC,
  p_customer_total_paid_inr NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_wallet RECORD;
  v_earning RECORD;
  v_existing RECORD;
  v_already_reversed NUMERIC(12,2);
  v_remaining NUMERIC(12,2);
  v_requested NUMERIC(12,2);
  v_reversal NUMERIC(12,2);
BEGIN
  IF p_refund_request_id IS NULL OR p_booking_id IS NULL
     OR p_refund_amount_inr IS NULL OR p_refund_amount_inr <= 0
     OR p_customer_total_paid_inr IS NULL OR p_customer_total_paid_inr <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid refund inputs');
  END IF;

  IF p_refund_amount_inr > p_customer_total_paid_inr THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Refund exceeds customer payment');
  END IF;

  SELECT id, practitioner_id, amount, booking_number
    INTO v_booking
    FROM practitioner_bookings
   WHERE id = p_booking_id;

  IF NOT FOUND OR v_booking.practitioner_id IS NULL OR v_booking.amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking or practitioner not found');
  END IF;

  SELECT id, available_balance, held_balance, total_earned
    INTO v_wallet
    FROM practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found');
  END IF;

  SELECT id, amount, is_released
    INTO v_existing
    FROM practitioner_wallet_transactions
   WHERE refund_request_id = p_refund_request_id
     AND category = 'refund'
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true,
      'reversed_amount', v_existing.amount);
  END IF;

  SELECT id, amount, is_released
    INTO v_earning
    FROM practitioner_wallet_transactions
   WHERE wallet_id = v_wallet.id
     AND booking_id = p_booking_id
     AND category = 'booking_earning'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Original booking earning not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_already_reversed
    FROM practitioner_wallet_transactions
   WHERE wallet_id = v_wallet.id
     AND booking_id = p_booking_id
     AND category = 'refund';

  v_remaining := GREATEST(0, ROUND(v_earning.amount, 2) - ROUND(v_already_reversed, 2));
  v_requested := ROUND(ROUND(v_earning.amount, 2) * p_refund_amount_inr / p_customer_total_paid_inr, 2);
  v_reversal := LEAST(v_remaining, v_requested);

  IF v_reversal <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', false, 'reversed_amount', 0);
  END IF;

  INSERT INTO practitioner_wallet_transactions (
    wallet_id, booking_id, refund_request_id, type, category, amount,
    description, is_released
  ) VALUES (
    v_wallet.id, p_booking_id, p_refund_request_id, 'debit', 'refund', v_reversal,
    'Refund reversal — ' || v_booking.booking_number || ' (request ' || p_refund_request_id || ')',
    true
  );

  UPDATE practitioner_wallets
     SET total_earned = GREATEST(0, total_earned - v_reversal),
         available_balance = CASE WHEN v_earning.is_released
           THEN GREATEST(0, available_balance - v_reversal) ELSE available_balance END,
         held_balance = CASE WHEN NOT v_earning.is_released
           THEN GREATEST(0, held_balance - v_reversal) ELSE held_balance END
   WHERE id = v_wallet.id;

  RETURN jsonb_build_object('ok', true, 'already_applied', false,
    'reversed_amount', v_reversal);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
