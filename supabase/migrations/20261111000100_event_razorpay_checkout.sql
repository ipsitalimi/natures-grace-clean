-- Support server-created Razorpay orders for paid community events.
-- Existing free RSVPs continue to use payment_status = 'None'.

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_amount NUMERIC(12, 2);

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_razorpay_order_id_uidx
  ON public.event_registrations (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

COMMENT ON COLUMN public.event_registrations.razorpay_order_id IS
  'Razorpay order used for the event registration checkout; written by the trusted API only.';
COMMENT ON COLUMN public.event_registrations.checkout_amount IS
  'Immutable INR amount snapshot used to verify the event payment; written by the trusted API only.';
