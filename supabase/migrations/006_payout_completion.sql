-- Phase B: payout completion lifecycle (RazorpayX webhook fields)

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_webhook_event TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_razorpay_payout_id_unique
  ON public.seller_payouts (razorpay_payout_id)
  WHERE razorpay_payout_id IS NOT NULL;
