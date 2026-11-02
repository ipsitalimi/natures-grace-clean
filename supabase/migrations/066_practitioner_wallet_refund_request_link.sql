-- Link practitioner wallet refund entries to the specific refund request.
-- This supports multiple partial refunds against one booking without relying
-- on the old booking-wide unique refund transaction assumption.

ALTER TABLE public.practitioner_wallet_transactions
  ADD COLUMN IF NOT EXISTS refund_request_id UUID
  REFERENCES public.refund_requests(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_wallet_txn_refund_request_unique
  ON public.practitioner_wallet_transactions (refund_request_id)
  WHERE refund_request_id IS NOT NULL AND category = 'refund';

NOTIFY pgrst, 'reload schema';
