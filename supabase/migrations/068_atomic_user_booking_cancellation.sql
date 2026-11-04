-- Server-authoritative cancellation and refund request creation.
-- Both writes execute in one PostgreSQL transaction through this RPC.
CREATE OR REPLACE FUNCTION public.cancel_user_practitioner_booking(
  p_booking_id UUID,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL
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

  IF v_booking.payment_status = 'Paid' THEN
    SELECT id INTO v_refund_id
      FROM public.refund_requests
     WHERE booking_id = p_booking_id
       AND status IN ('pending', 'in_review', 'approved')
     LIMIT 1;

    IF v_refund_id IS NULL THEN
      INSERT INTO public.refund_requests (
        user_id, booking_id, reason, description
      ) VALUES (
        p_user_id,
        p_booking_id,
        'Session cancelled',
        COALESCE(NULLIF(BTRIM(p_description), ''), 'Session cancelled by user. Refund eligibility per cancellation policy.')
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

REVOKE ALL ON FUNCTION public.cancel_user_practitioner_booking(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_practitioner_booking(UUID, UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
