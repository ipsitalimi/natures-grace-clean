-- Reserve payout funds, create payout record, and write debit ledger atomically.
CREATE OR REPLACE FUNCTION public.request_wallet_payout(
  p_payout_type TEXT,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT 'Manual withdrawal — processed by Nature''s Grace team within 3–7 business days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC(12,2);
  v_payout_id UUID;
BEGIN
  IF p_payout_type NOT IN ('seller', 'practitioner') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid payout type');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  IF p_payout_type = 'seller' THEN
    SELECT available_balance INTO v_available FROM seller_wallets
      WHERE id = p_wallet_id FOR UPDATE;
  ELSE
    SELECT available_balance INTO v_available FROM practitioner_wallets
      WHERE id = p_wallet_id FOR UPDATE;
  END IF;

  IF v_available IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found');
  END IF;
  IF v_available < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient available balance');
  END IF;

  IF p_payout_type = 'seller' THEN
    UPDATE seller_wallets SET available_balance = available_balance - p_amount,
      pending_payout = pending_payout + p_amount WHERE id = p_wallet_id;
    INSERT INTO seller_payouts(wallet_id, amount, status, notes)
      VALUES (p_wallet_id, p_amount, 'Pending', p_notes) RETURNING id INTO v_payout_id;
    INSERT INTO wallet_transactions(wallet_id,payout_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,v_payout_id,'debit','payout',p_amount,'Payout to Bank Account (pending)',true);
  ELSE
    UPDATE practitioner_wallets SET available_balance = available_balance - p_amount,
      pending_payout = pending_payout + p_amount WHERE id = p_wallet_id;
    INSERT INTO practitioner_payouts(wallet_id, amount, status, notes)
      VALUES (p_wallet_id, p_amount, 'Pending', p_notes) RETURNING id INTO v_payout_id;
    INSERT INTO practitioner_wallet_transactions(wallet_id,payout_id,type,category,amount,description,is_released)
      VALUES(p_wallet_id,v_payout_id,'debit','payout',p_amount,'Payout to Bank Account (pending)',true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'payout_id', v_payout_id);
END;
$$;

REVOKE ALL ON FUNCTION public.request_wallet_payout(TEXT, UUID, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_payout(TEXT, UUID, NUMERIC, TEXT) TO service_role;
