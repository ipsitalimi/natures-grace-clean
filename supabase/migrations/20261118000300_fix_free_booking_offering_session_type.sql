-- Fix free practitioner booking RPC: include session_type in the selected offering record.
-- The function uses v_offering.session_type when populating practitioner_bookings.service_name.

CREATE OR REPLACE FUNCTION public.create_free_practitioner_booking(
  p_user_id UUID,
  p_booking JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id UUID;
  v_offering_id UUID;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_date TEXT;
  v_time TEXT;
  v_duration INTEGER;
  v_offering RECORD;
  v_existing RECORD;
BEGIN
  IF p_user_id IS NULL OR p_booking IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid booking details');
  END IF;

  v_practitioner_id := NULLIF(p_booking->>'practitionerId', '')::UUID;
  v_offering_id := NULLIF(p_booking->>'offeringId', '')::UUID;
  v_date := NULLIF(p_booking->>'sessionDate', '');
  v_time := NULLIF(p_booking->>'sessionTime', '');
  v_duration := NULLIF(p_booking->>'durationMinutes', '')::INTEGER;

  IF v_practitioner_id IS NULL OR v_offering_id IS NULL
     OR v_date IS NULL OR v_time IS NULL OR v_duration IS NULL OR v_duration <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A valid offering, date, time and duration are required');
  END IF;

  SELECT id, practitioner_id, session_type, duration_minutes, price, is_active
    INTO v_offering
    FROM public.practitioner_offerings
   WHERE id = v_offering_id;

  IF NOT FOUND OR v_offering.practitioner_id <> v_practitioner_id
     OR v_offering.is_active IS NOT TRUE
     OR v_offering.price <> 0
     OR v_offering.duration_minutes <> v_duration THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Selected offering is not an active free offering');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_practitioner_id::TEXT),
    hashtext(v_date || '|' || v_time)
  );

  SELECT id, booking_number INTO v_existing
    FROM public.practitioner_bookings
   WHERE practitioner_id = v_practitioner_id
     AND session_date = v_date
     AND session_time = v_time
     AND booking_status IN ('Pending', 'Confirmed')
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This session time is already booked');
  END IF;

  v_booking_number := 'BK-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12));

  INSERT INTO public.practitioner_bookings (
    booking_number, practitioner_id, offering_id, user_id,
    client_name, client_email, service_name, session_date, session_time,
    duration_minutes, amount, booking_status, payment_status, razorpay_payment_id, notes
  ) VALUES (
    v_booking_number,
    v_practitioner_id,
    v_offering_id,
    p_user_id,
    COALESCE(NULLIF(p_booking->>'clientName', ''), 'Guest'),
    NULLIF(p_booking->>'clientEmail', ''),
    COALESCE(NULLIF(p_booking->>'serviceName', ''), v_offering.session_type),
    v_date,
    v_time,
    v_duration,
    0,
    'Confirmed',
    'Free',
    NULL,
    NULLIF(p_booking->>'notes', '')
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number
  );
EXCEPTION
  WHEN invalid_text_representation OR not_null_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid booking details');
END;
$$;

REVOKE ALL ON FUNCTION public.create_free_practitioner_booking(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_free_practitioner_booking(UUID, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
