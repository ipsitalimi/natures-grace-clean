-- Persist checkout fee breakdown separately from the service amount.
-- practitioner_bookings.amount remains the practitioner earning/commission base.
ALTER TABLE public.practitioner_bookings
  ADD COLUMN IF NOT EXISTS platform_fee_inr numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_gst_inr numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_amount_inr numeric(12,2);

UPDATE public.practitioner_bookings
SET total_paid_amount_inr = amount
WHERE total_paid_amount_inr IS NULL;

ALTER TABLE public.practitioner_bookings
  ALTER COLUMN total_paid_amount_inr SET NOT NULL,
  ALTER COLUMN total_paid_amount_inr SET DEFAULT 0;

ALTER TABLE public.practitioner_bookings
  ADD CONSTRAINT practitioner_bookings_checkout_amounts_nonnegative
  CHECK (
    amount >= 0
    AND platform_fee_inr >= 0
    AND platform_gst_inr >= 0
    AND total_paid_amount_inr >= amount
  );
