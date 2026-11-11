-- Add server-side refund audit and processing fields.
-- This migration is additive; it does not process refunds or change existing requests.

ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.refund_requests.refund_amount IS
  'Actual refund amount in INR determined by server policy; null for legacy/unprocessed requests.';
COMMENT ON COLUMN public.refund_requests.razorpay_refund_id IS
  'Razorpay refund identifier returned by the gateway, for audit/reconciliation.';
COMMENT ON COLUMN public.refund_requests.cancellation_policy_snapshot IS
  'Policy and refund calculation captured when a booking refund is processed.';
COMMENT ON COLUMN public.refund_requests.processing_started_at IS
  'Timestamp when an admin refund processing attempt began.';
COMMENT ON COLUMN public.refund_requests.processed_at IS
  'Timestamp when refund processing completed successfully.';

NOTIFY pgrst, 'reload schema';
