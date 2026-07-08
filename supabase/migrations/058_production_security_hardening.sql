-- Production security hardening: wallet write lockdown, booking insert restriction, seller wallet RPC.

-- ---------------------------------------------------------------------------
-- C2: Wallet / payout tables — read-only for authenticated clients (mutations via service role)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "seller_wallets_insert_seller" ON public.seller_wallets;
DROP POLICY IF EXISTS "seller_wallets_update_seller" ON public.seller_wallets;

DROP POLICY IF EXISTS "wallet_transactions_insert_seller" ON public.wallet_transactions;

DROP POLICY IF EXISTS "seller_payouts_insert_seller" ON public.seller_payouts;
DROP POLICY IF EXISTS "seller_payouts_update_seller" ON public.seller_payouts;

DROP POLICY IF EXISTS "practitioner_wallets_write_practitioner" ON public.practitioner_wallets;

DROP POLICY IF EXISTS "practitioner_wallet_txn_write_practitioner" ON public.practitioner_wallet_transactions;

DROP POLICY IF EXISTS "practitioner_payouts_write_practitioner" ON public.practitioner_payouts;

-- ---------------------------------------------------------------------------
-- Seller wallet provisioning (mirrors ensure_practitioner_wallet)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_seller_wallet(p_commission_rate NUMERIC DEFAULT 10)
RETURNS public.seller_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_wallet public.seller_wallets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  v_seller_id := public.current_seller_id();
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'seller_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_wallet
  FROM public.seller_wallets
  WHERE seller_id = v_seller_id;

  IF FOUND THEN
    RETURN v_wallet;
  END IF;

  INSERT INTO public.seller_wallets (
    seller_id,
    commission_rate,
    bank_account_label,
    next_payout_date
  ) VALUES (
    v_seller_id,
    COALESCE(NULLIF(p_commission_rate, 0), 10),
    NULL,
    NULL
  )
  RETURNING * INTO v_wallet;

  RETURN v_wallet;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_wallet
    FROM public.seller_wallets
    WHERE seller_id = v_seller_id;
    RETURN v_wallet;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_seller_wallet(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_seller_wallet(NUMERIC) TO authenticated;

-- ---------------------------------------------------------------------------
-- C5: Bookings — buyers may only insert Pending payment status
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "practitioner_bookings_insert_buyer" ON public.practitioner_bookings;

CREATE POLICY "practitioner_bookings_insert_buyer"
  ON public.practitioner_bookings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND payment_status = 'Pending'
    AND booking_status IN ('Pending', 'Confirmed')
  );
