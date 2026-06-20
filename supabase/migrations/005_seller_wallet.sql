-- Phase A: seller wallet ledger + payouts (RazorpayX fields reserved, no API yet)

CREATE TABLE IF NOT EXISTS public.seller_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pending_payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
  held_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10,
  bank_account_label TEXT DEFAULT 'HDFC Bank ···· 4821',
  next_payout_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_wallets_seller_id_idx
  ON public.seller_wallets (seller_id)
  WHERE seller_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.seller_wallets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payout_id UUID,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL CHECK (
    category IN ('order_earning', 'earning_release', 'payout', 'refund', 'adjustment')
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  is_released BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx
  ON public.wallet_transactions (wallet_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_order_earning_idx
  ON public.wallet_transactions (order_id, category)
  WHERE category = 'order_earning' AND order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.seller_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
  razorpay_payout_id TEXT,
  razorpay_fund_account_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES public.seller_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS seller_payouts_wallet_id_idx
  ON public.seller_payouts (wallet_id, created_at DESC);

DROP TRIGGER IF EXISTS seller_wallets_updated_at ON public.seller_wallets;
CREATE TRIGGER seller_wallets_updated_at
  BEFORE UPDATE ON public.seller_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS seller_payouts_updated_at ON public.seller_payouts;
CREATE TRIGGER seller_payouts_updated_at
  BEFORE UPDATE ON public.seller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_wallets_select_authenticated"
  ON public.seller_wallets FOR SELECT TO authenticated USING (true);

CREATE POLICY "wallet_transactions_select_authenticated"
  ON public.wallet_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "seller_payouts_select_authenticated"
  ON public.seller_payouts FOR SELECT TO authenticated USING (true);

CREATE POLICY "seller_wallets_admin_all"
  ON public.seller_wallets FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "wallet_transactions_admin_all"
  ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "seller_payouts_admin_all"
  ON public.seller_payouts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "seller_wallets_seller_write"
  ON public.seller_wallets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  );

CREATE POLICY "seller_wallets_seller_update"
  ON public.seller_wallets FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  );

CREATE POLICY "wallet_transactions_seller_insert"
  ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  );

CREATE POLICY "seller_payouts_seller_insert"
  ON public.seller_payouts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  );

CREATE POLICY "seller_payouts_seller_update"
  ON public.seller_payouts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Seller', 'Admin'))
  );
