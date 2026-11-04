-- Server-authoritative user rescheduling with the 36-hour cutoff.
CREATE OR REPLACE FUNCTION public.reschedule_user_practitioner_booking(
  p_booking_id UUID,
  p_user_id UUID,
  p_new_session_date TEXT,
  p_new_session_time TEXT,
  p_deadline_hours INTEGER DEFAULT 36
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_session_start TIMESTAMPTZ;
  v_new_date DATE;
BEGIN
  IF p_booking_id IS NULL OR p_user_id IS NULL
     OR NULLIF(BTRIM(p_new_session_date), '') IS NULL
     OR NULLIF(BTRIM(p_new_session_time), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking, user, date and time are required');
  END IF;

  BEGIN
    v_new_date := BTRIM(p_new_session_date)::DATE;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid reschedule date');
  END;

  SELECT id, user_id, booking_status, session_date, session_time
    INTO v_booking
    FROM public.practitioner_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND OR v_booking.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.booking_status NOT IN ('Pending', 'Confirmed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only upcoming bookings can be rescheduled');
  END IF;

  BEGIN
    IF UPPER(BTRIM(v_booking.session_time)) ~ '(AM|PM)$' THEN
      v_session_start := to_timestamp(
        v_booking.session_date::TEXT || ' ' || BTRIM(v_booking.session_time),
        'YYYY-MM-DD HH12:MI AM'
      );
    ELSE
      v_session_start := to_timestamp(
        v_booking.session_date::TEXT || ' ' || BTRIM(v_booking.session_time),
        'YYYY-MM-DD HH24:MI'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Could not determine current session time');
  END;

  IF v_session_start <= NOW() + make_interval(hours => GREATEST(0, p_deadline_hours)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rescheduling is only allowed at least 36 hours before the session');
  END IF;

  IF v_new_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'New session date must be in the future');
  END IF;

  UPDATE public.practitioner_bookings
     SET session_date = v_new_date::TEXT,
         session_time = BTRIM(p_new_session_time)
   WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'session_date', v_new_date::TEXT,
    'session_time', BTRIM(p_new_session_time)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_user_practitioner_booking(UUID, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_user_practitioner_booking(UUID, UUID, TEXT, TEXT, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
