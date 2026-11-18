-- Ensure paid checkout fee snapshot columns exist in production.
-- Keep amount as the practitioner commission base; customer total is stored separately.
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.practitioner_bookings'::regclass
      AND conname = 'practitioner_bookings_checkout_amounts_nonnegative'
  ) THEN
    ALTER TABLE public.practitioner_bookings
      ADD CONSTRAINT practitioner_bookings_checkout_amounts_nonnegative
      CHECK (
        amount >= 0
        AND platform_fee_inr >= 0
        AND platform_gst_inr >= 0
        AND total_paid_amount_inr >= amount
      );
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
