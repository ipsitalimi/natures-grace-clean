-- Keep the 24-hour reschedule cutoff aligned with India-local booking times.
CREATE OR REPLACE FUNCTION public.reschedule_user_practitioner_booking(
  p_booking_id uuid,
  p_user_id uuid,
  p_new_session_date text,
  p_new_session_time text,
  p_deadline_hours integer DEFAULT 24
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_old_start timestamptz;
  v_new_start timestamptz;
  v_date date;
  v_new_minutes integer;
BEGIN
  SELECT * INTO v_booking
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
    v_date := btrim(p_new_session_date)::date;
    v_new_minutes := public.ng_time_minutes(p_new_session_time);
    v_old_start := (
      v_booking.session_date::date
      + make_interval(mins => public.ng_time_minutes(v_booking.session_time))
    ) AT TIME ZONE 'Asia/Kolkata';
    v_new_start := (
      v_date + make_interval(mins => v_new_minutes)
    ) AT TIME ZONE 'Asia/Kolkata';
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid date or session time');
  END;

  IF v_old_start <= now() + make_interval(hours => greatest(0, p_deadline_hours)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rescheduling is only allowed at least 24 hours before the session');
  END IF;

  IF v_new_start <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please choose a future session time');
  END IF;

  IF v_date < current_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'New session date must be in the future');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_booking.practitioner_id::text),
    hashtext(v_date::text)
  );

  IF NOT public.ng_booking_slot_is_available(
    v_booking.practitioner_id,
    v_booking.offering_id,
    p_new_session_date,
    p_new_session_time,
    v_booking.duration_minutes,
    v_booking.id,
    NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'The selected session slot is unavailable or already booked');
  END IF;

  UPDATE public.practitioner_bookings
     SET session_date = v_date::text,
         session_time = btrim(p_new_session_time)
   WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'session_date', v_date::text,
    'session_time', btrim(p_new_session_time)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
