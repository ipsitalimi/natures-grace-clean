-- Atomic, idempotent booking payment fulfillment.
-- This migration is intentionally not applied to any database by this commit.
CREATE UNIQUE INDEX IF NOT EXISTS practitioner_bookings_razorpay_payment_id_unique
  ON public.practitioner_bookings (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_paid_booking_checkout(
  p_user_id UUID,
  p_razorpay_order_id TEXT,
  p_payment_id TEXT,
  p_commission_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_draft JSONB;
  v_existing RECORD;
  v_booking RECORD;
  v_wallet RECORD;
  v_net NUMERIC(12,2);
  v_gross NUMERIC(12,2);
  v_commission NUMERIC(5,2);
  v_booking_number TEXT;
BEGIN
  IF p_user_id IS NULL OR p_razorpay_order_id IS NULL OR p_payment_id IS NULL
     OR p_commission_rate IS NULL OR p_commission_rate < 0 OR p_commission_rate > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid fulfillment inputs');
  END IF;

  SELECT * INTO v_pending
    FROM pending_booking_checkouts
   WHERE razorpay_order_id = p_razorpay_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pending checkout not found');
  END IF;

  IF v_pending.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Checkout does not belong to this account');
  END IF;

  IF v_pending.fulfilled_at IS NOT NULL AND v_pending.booking_id IS NOT NULL THEN
    SELECT id, booking_number INTO v_existing
      FROM practitioner_bookings WHERE id = v_pending.booking_id;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'booking_id', v_existing.id,
        'booking_number', v_existing.booking_number, 'already_paid', true);
    END IF;
  END IF;

  SELECT id, booking_number INTO v_existing
    FROM practitioner_bookings WHERE razorpay_payment_id = p_payment_id;
  IF FOUND THEN
    UPDATE pending_booking_checkouts
       SET fulfilled_at = COALESCE(fulfilled_at, NOW()), booking_id = v_existing.id
     WHERE razorpay_order_id = p_razorpay_order_id;
    RETURN jsonb_build_object('ok', true, 'booking_id', v_existing.id,
      'booking_number', v_existing.booking_number, 'already_paid', true);
  END IF;

  v_draft := v_pending.booking_draft;
  IF v_draft IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking draft missing');
  END IF;

  v_gross := ROUND((v_draft->>'amountInr')::NUMERIC, 2);
  IF v_gross <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid booking amount');
  END IF;

  v_booking_number := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO practitioner_bookings (
    booking_number, practitioner_id, offering_id, user_id, client_name, client_email,
    service_name, session_date, session_time, duration_minutes, amount,
    platform_fee_inr, platform_gst_inr, total_paid_amount_inr,
    booking_status, payment_status, razorpay_payment_id, notes
  ) VALUES (
    v_booking_number,
    (v_draft->>'practitionerId')::UUID,
    NULLIF(v_draft->>'offeringId', '')::UUID,
    p_user_id,
    COALESCE(v_draft->>'clientName', ''),
    NULLIF(v_draft->>'clientEmail', ''),
    COALESCE(v_draft->>'serviceName', ''),
    COALESCE(v_draft->>'sessionDate', ''),
    COALESCE(v_draft->>'sessionTime', ''),
    COALESCE((v_draft->>'durationMinutes')::INT, 60),
    v_gross,
    COALESCE((v_draft->'feeBreakdown'->>'platformFeeInr')::NUMERIC, 0),
    COALESCE((v_draft->'feeBreakdown'->>'platformGstInr')::NUMERIC, 0),
    COALESCE((v_draft->'feeBreakdown'->>'totalInr')::NUMERIC, v_gross),
    'Confirmed', 'Paid', p_payment_id, NULLIF(v_draft->>'notes', '')
  )
  RETURNING id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name
    INTO v_booking;

  SELECT * INTO v_wallet
    FROM practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO practitioner_wallets (practitioner_id, commission_rate, bank_account_label, next_payout_date)
    VALUES (v_booking.practitioner_id, p_commission_rate, NULL, NULL)
    RETURNING * INTO v_wallet;
  END IF;

  v_commission := COALESCE(v_wallet.commission_rate, p_commission_rate);
  v_net := ROUND(v_gross * (1 - v_commission / 100), 2);

  INSERT INTO practitioner_wallet_transactions (
    wallet_id, booking_id, type, category, amount, description, is_released
  ) VALUES (
    v_wallet.id, v_booking.id, 'credit', 'booking_earning', v_net,
    'Session ' || v_booking.booking_number || ' — ' || v_booking.service_name, false
  );

  UPDATE practitioner_wallets
     SET total_earned = total_earned + v_net,
         held_balance = held_balance + v_net
   WHERE id = v_wallet.id;

  UPDATE pending_booking_checkouts
     SET fulfilled_at = NOW(), booking_id = v_booking.id
   WHERE razorpay_order_id = p_razorpay_order_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking.id,
    'booking_number', v_booking.booking_number, 'already_paid', false);
EXCEPTION WHEN unique_violation THEN
  -- Unique payment ID ensures concurrent webhook/confirm attempts cannot create
  -- two paid bookings. Caller can retry and read the committed existing booking.
  RETURN jsonb_build_object('ok', false, 'error', 'Payment fulfillment already in progress; retry');
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
