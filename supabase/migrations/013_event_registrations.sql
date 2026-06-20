-- Phase A: event registrations and attendee tracking

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendee_name TEXT NOT NULL DEFAULT '',
  attendee_email TEXT NOT NULL DEFAULT '',
  attendee_phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Registered'
    CHECK (status IN ('Registered', 'Cancelled', 'Waitlist')),
  payment_status TEXT NOT NULL DEFAULT 'None'
    CHECK (payment_status IN ('None', 'Pending', 'Paid', 'Refunded')),
  razorpay_payment_id TEXT,
  amount_paid NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_active_user_event_idx
  ON public.event_registrations (event_id, user_id)
  WHERE status = 'Registered';

CREATE INDEX IF NOT EXISTS event_registrations_event_idx
  ON public.event_registrations (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_registrations_user_idx
  ON public.event_registrations (user_id, created_at DESC);

DROP TRIGGER IF EXISTS event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_registrations_select_own"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "event_registrations_select_admin"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "event_registrations_insert_own"
  ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_registrations_update_own"
  ON public.event_registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_registrations_update_admin"
  ON public.event_registrations FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "event_registrations_delete_admin"
  ON public.event_registrations FOR DELETE TO authenticated
  USING (public.is_admin());
