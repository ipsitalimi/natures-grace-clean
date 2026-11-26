-- Return only busy booking intervals for public availability display.
-- Customer identity, payment identifiers and notes are deliberately excluded.
CREATE OR REPLACE FUNCTION public.get_practitioner_busy_slots(
  p_practitioner_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (
  session_date TEXT,
  session_time TEXT,
  duration_minutes INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.session_date,
    b.session_time,
    b.duration_minutes
  FROM public.practitioner_bookings AS b
  WHERE b.practitioner_id = p_practitioner_id
    AND b.session_date >= p_start_date
    AND b.session_date <= p_end_date
    AND b.booking_status IN ('Pending', 'Confirmed')
  ORDER BY b.session_date, b.session_time;
$$;

REVOKE ALL ON FUNCTION public.get_practitioner_busy_slots(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practitioner_busy_slots(UUID, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
