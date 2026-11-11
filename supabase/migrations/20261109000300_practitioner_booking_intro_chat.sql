-- Booking-specific 7-minute introductory chat. It is separate from paid session duration.
ALTER TABLE public.practitioner_bookings
  ADD COLUMN IF NOT EXISTS intro_chat_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_chat_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.practitioner_booking_intro_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.practitioner_bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practitioner_booking_intro_messages_booking_idx
  ON public.practitioner_booking_intro_messages (booking_id, created_at);

ALTER TABLE public.practitioner_booking_intro_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_intro_messages_select_participants ON public.practitioner_booking_intro_messages;
CREATE POLICY booking_intro_messages_select_participants
  ON public.practitioner_booking_intro_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_bookings b
      LEFT JOIN public.practitioners p ON p.id = b.practitioner_id
      WHERE b.id = practitioner_booking_intro_messages.booking_id
        AND (b.user_id = auth.uid() OR p.profile_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS booking_intro_messages_insert_participants ON public.practitioner_booking_intro_messages;
CREATE POLICY booking_intro_messages_insert_participants
  ON public.practitioner_booking_intro_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.practitioner_bookings b
      LEFT JOIN public.practitioners p ON p.id = b.practitioner_id
      WHERE b.id = booking_id
        AND b.payment_status = 'Paid'
        AND b.booking_status = 'Confirmed'
        AND b.intro_chat_ends_at > NOW()
        AND (b.user_id = auth.uid() OR p.profile_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.start_practitioner_booking_intro_chat(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT b.id, b.user_id, b.practitioner_id, b.payment_status, b.booking_status,
         b.intro_chat_started_at, b.intro_chat_ends_at, p.profile_id AS practitioner_profile_id
    INTO v_booking
    FROM public.practitioner_bookings b
    LEFT JOIN public.practitioners p ON p.id = b.practitioner_id
   WHERE b.id = p_booking_id
   FOR UPDATE OF b;

  IF NOT FOUND
     OR auth.uid() IS NULL
     OR (v_booking.user_id IS DISTINCT FROM auth.uid()
         AND v_booking.practitioner_profile_id IS DISTINCT FROM auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.payment_status <> 'Paid' OR v_booking.booking_status <> 'Confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Intro chat is available only for paid, confirmed bookings');
  END IF;

  IF v_booking.intro_chat_started_at IS NULL THEN
    UPDATE public.practitioner_bookings
       SET intro_chat_started_at = NOW(),
           intro_chat_ends_at = NOW() + INTERVAL '7 minutes'
     WHERE id = p_booking_id
     RETURNING intro_chat_started_at, intro_chat_ends_at
       INTO v_booking.intro_chat_started_at, v_booking.intro_chat_ends_at;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'started_at', v_booking.intro_chat_started_at,
    'ends_at', v_booking.intro_chat_ends_at,
    'remaining_seconds', GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_booking.intro_chat_ends_at - NOW()))))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_practitioner_booking_intro_chat(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_practitioner_booking_intro_chat(UUID) TO authenticated;
GRANT SELECT, INSERT ON public.practitioner_booking_intro_messages TO authenticated;

NOTIFY pgrst, 'reload schema';
