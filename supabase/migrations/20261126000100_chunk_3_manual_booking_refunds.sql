-- Chunk 3: practitioner booking cancellations and manually transferred refunds.
-- This migration does not modify checkout, payment verification, webhooks, or seller refunds.

ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_status_check;

ALTER TABLE public.refund_requests
  ADD CONSTRAINT refund_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'paid'::text]));

ALTER TABLE public.practitioner_wallet_transactions
  ADD COLUMN IF NOT EXISTS refund_request_id UUID
  REFERENCES public.refund_requests(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_wallet_txn_refund_request_unique
  ON public.practitioner_wallet_transactions (refund_request_id)
  WHERE refund_request_id IS NOT NULL AND category = 'refund';

COMMENT ON COLUMN public.refund_requests.bank_transfer_reference IS
  'Reference supplied by an admin after manually transferring a practitioner-booking refund to the customer.';
COMMENT ON COLUMN public.refund_requests.paid_at IS
  'Timestamp an admin recorded the manual bank transfer as completed.';
COMMENT ON COLUMN public.refund_requests.paid_by IS
  'Admin user who recorded the manual bank transfer.';

-- Atomic cancellation + refund-request creation. No payment provider is called here.
CREATE OR REPLACE FUNCTION public.cancel_user_practitioner_booking(
  p_booking_id UUID,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL,
  p_cancellation_policy_snapshot JSONB DEFAULT NULL,
  p_refund_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_refund_id UUID;
BEGIN
  IF p_booking_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking and user are required');
  END IF;

  SELECT id, user_id, booking_status, payment_status
    INTO v_booking
    FROM public.practitioner_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND OR v_booking.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.booking_status NOT IN ('Pending', 'Confirmed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only upcoming bookings can be cancelled');
  END IF;

  IF v_booking.payment_status = 'Paid' AND COALESCE(p_refund_amount, 0) > 0 THEN
    SELECT id INTO v_refund_id
      FROM public.refund_requests
     WHERE booking_id = p_booking_id
       AND status IN ('pending', 'in_review', 'approved')
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_refund_id IS NULL THEN
      INSERT INTO public.refund_requests (
        user_id, booking_id, reason, description,
        cancellation_policy_snapshot, refund_amount
      ) VALUES (
        p_user_id,
        p_booking_id,
        'Session cancelled',
        COALESCE(NULLIF(BTRIM(p_description), ''), 'Session cancelled by user. Refund requires manual admin review.'),
        p_cancellation_policy_snapshot,
        ROUND(p_refund_amount, 2)
      )
      RETURNING id INTO v_refund_id;
    END IF;
  END IF;

  UPDATE public.practitioner_bookings
     SET booking_status = 'Cancelled'
   WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'refund_request_id', v_refund_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_user_practitioner_booking(UUID, UUID, TEXT, JSONB, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_practitioner_booking(UUID, UUID, TEXT, JSONB, NUMERIC) TO service_role;

-- Reverse the practitioner share only after an admin confirms the manual transfer.
-- The refund_request_id unique index makes retries idempotent.
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
  v_refund RECORD;
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

  SELECT id, booking_id, status, refund_amount
    INTO v_refund
    FROM public.refund_requests
   WHERE id = p_refund_request_id
   FOR UPDATE;

  IF NOT FOUND OR v_refund.booking_id <> p_booking_id OR v_refund.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Refund request is not approved for this booking');
  END IF;

  IF ROUND(COALESCE(v_refund.refund_amount, 0), 2) <> ROUND(p_refund_amount_inr, 2) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Refund amount does not match the approved request');
  END IF;

  SELECT id, practitioner_id, amount, booking_number
    INTO v_booking
    FROM public.practitioner_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND OR v_booking.practitioner_id IS NULL OR v_booking.amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking or practitioner not found');
  END IF;

  IF p_refund_amount_inr > p_customer_total_paid_inr THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Refund exceeds customer payment');
  END IF;

  SELECT id, available_balance, held_balance, total_earned
    INTO v_wallet
    FROM public.practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found');
  END IF;

  SELECT id, amount
    INTO v_existing
    FROM public.practitioner_wallet_transactions
   WHERE refund_request_id = p_refund_request_id
     AND category = 'refund'
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true,
      'reversed_amount', v_existing.amount);
  END IF;

  SELECT id, amount, is_released
    INTO v_earning
    FROM public.practitioner_wallet_transactions
   WHERE wallet_id = v_wallet.id
     AND booking_id = p_booking_id
     AND category = 'booking_earning'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Original booking earning not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_already_reversed
    FROM public.practitioner_wallet_transactions
   WHERE wallet_id = v_wallet.id
     AND booking_id = p_booking_id
     AND category = 'refund';

  v_remaining := GREATEST(0, ROUND(v_earning.amount, 2) - ROUND(v_already_reversed, 2));
  v_requested := ROUND(ROUND(v_earning.amount, 2) * p_refund_amount_inr / p_customer_total_paid_inr, 2);
  v_reversal := LEAST(v_remaining, v_requested);

  IF v_reversal <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', false, 'reversed_amount', 0);
  END IF;

  INSERT INTO public.practitioner_wallet_transactions (
    wallet_id, booking_id, refund_request_id, type, category, amount,
    description, is_released
  ) VALUES (
    v_wallet.id, p_booking_id, p_refund_request_id, 'debit', 'refund', v_reversal,
    'Manual refund reversal — ' || v_booking.booking_number || ' (request ' || p_refund_request_id || ')',
    true
  );

  UPDATE public.practitioner_wallets
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

REVOKE ALL ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
