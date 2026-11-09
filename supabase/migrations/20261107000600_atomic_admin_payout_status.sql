-- Admin payout status changes and rejection wallet restoration must commit together.
-- This migration is intentionally not applied automatically to any environment.

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.practitioner_payouts
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS seller_payouts_status_check;
ALTER TABLE public.seller_payouts
  ADD CONSTRAINT seller_payouts_status_check
  CHECK (status IN ('Pending', 'Under Review', 'Processing', 'Completed', 'Rejected', 'Failed', 'Cancelled'));

ALTER TABLE public.practitioner_payouts
  DROP CONSTRAINT IF EXISTS practitioner_payouts_status_check;
ALTER TABLE public.practitioner_payouts
  ADD CONSTRAINT practitioner_payouts_status_check
  CHECK (status IN ('Pending', 'Under Review', 'Processing', 'Completed', 'Rejected', 'Failed', 'Cancelled'));

CREATE OR REPLACE FUNCTION public.admin_update_payout_status(
  p_payout_type TEXT,
  p_payout_id UUID,
  p_status TEXT,
  p_admin_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_amount NUMERIC(12,2);
  v_current_status TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_payout_type NOT IN ('seller', 'practitioner') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid payout type');
  END IF;
  IF p_status NOT IN ('Under Review', 'Processing', 'Completed', 'Rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;

  IF p_payout_type = 'seller' THEN
    SELECT wallet_id, amount, status INTO v_wallet_id, v_amount, v_current_status
      FROM seller_payouts WHERE id = p_payout_id FOR UPDATE;
  ELSE
    SELECT wallet_id, amount, status INTO v_wallet_id, v_amount, v_current_status
      FROM practitioner_payouts WHERE id = p_payout_id FOR UPDATE;
  END IF;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout not found');
  END IF;

  IF v_current_status = p_status THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;
  IF v_current_status IN ('Completed', 'Rejected', 'Failed', 'Cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout is already in a terminal state');
  END IF;

  IF p_status = 'Rejected' THEN
    IF p_payout_type = 'seller' THEN
      UPDATE seller_wallets
        SET available_balance = available_balance + v_amount,
            pending_payout = pending_payout - v_amount
        WHERE id = v_wallet_id AND pending_payout >= v_amount;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Seller wallet not found or reserved payout balance is insufficient');
      END IF;
      INSERT INTO wallet_transactions(wallet_id, payout_id, type, category, amount, description, is_released)
        VALUES (v_wallet_id, p_payout_id, 'credit', 'payout_reversal', v_amount,
          COALESCE(p_rejection_reason, 'Payout rejected — funds returned'), true);
      UPDATE seller_payouts
        SET status = p_status, processed_by = p_admin_id,
            rejection_reason = COALESCE(p_rejection_reason, 'Rejected by admin'),
            updated_at = v_now
        WHERE id = p_payout_id;
    ELSE
      UPDATE practitioner_wallets
        SET available_balance = available_balance + v_amount,
            pending_payout = pending_payout - v_amount
        WHERE id = v_wallet_id AND pending_payout >= v_amount;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found or reserved payout balance is insufficient');
      END IF;
      INSERT INTO practitioner_wallet_transactions(wallet_id, payout_id, type, category, amount, description, is_released)
        VALUES (v_wallet_id, p_payout_id, 'credit', 'payout_reversal', v_amount,
          COALESCE(p_rejection_reason, 'Payout rejected — funds returned'), true);
      UPDATE practitioner_payouts
        SET status = p_status, processed_by = p_admin_id,
            rejection_reason = COALESCE(p_rejection_reason, 'Rejected by admin'),
            updated_at = v_now
        WHERE id = p_payout_id;
    END IF;
  ELSE
    -- A completed payout has left the wallet; clear its reserved pending amount.
    IF p_status = 'Completed' THEN
      IF p_payout_type = 'seller' THEN
        UPDATE seller_wallets
          SET pending_payout = GREATEST(0, pending_payout - v_amount)
          WHERE id = v_wallet_id;
        IF NOT FOUND THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Seller wallet not found');
        END IF;
      ELSE
        UPDATE practitioner_wallets
          SET pending_payout = GREATEST(0, pending_payout - v_amount)
          WHERE id = v_wallet_id;
        IF NOT FOUND THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found');
        END IF;
      END IF;
    END IF;

    IF p_payout_type = 'seller' THEN
      UPDATE seller_payouts SET status = p_status, processed_by = p_admin_id,
        completed_at = CASE WHEN p_status = 'Completed' THEN v_now ELSE completed_at END,
        updated_at = v_now WHERE id = p_payout_id;
    ELSE
      UPDATE practitioner_payouts SET status = p_status, processed_by = p_admin_id,
        completed_at = CASE WHEN p_status = 'Completed' THEN v_now ELSE completed_at END,
        updated_at = v_now WHERE id = p_payout_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already_applied', false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_payout_status(TEXT, UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payout_status(TEXT, UUID, TEXT, UUID, TEXT) TO service_role;
