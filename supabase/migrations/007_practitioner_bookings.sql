-- Phase A: practitioner offerings, bookings, earnings, payouts

CREATE TABLE IF NOT EXISTS public.practitioner_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 60,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practitioner_offerings_practitioner_idx
  ON public.practitioner_offerings (practitioner_id);

CREATE TABLE IF NOT EXISTS public.practitioner_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  offering_id UUID REFERENCES public.practitioner_offerings(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date TEXT,
  start_time TEXT NOT NULL DEFAULT '9:00 AM',
  end_time TEXT NOT NULL DEFAULT '5:00 PM',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practitioner_availability_practitioner_idx
  ON public.practitioner_availability (practitioner_id);

CREATE TABLE IF NOT EXISTS public.practitioner_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  offering_id UUID REFERENCES public.practitioner_offerings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  service_name TEXT NOT NULL DEFAULT '',
  session_date TEXT NOT NULL DEFAULT '',
  session_time TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 60,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  booking_status TEXT NOT NULL DEFAULT 'Confirmed'
    CHECK (booking_status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (payment_status IN ('Pending', 'Paid', 'Refunded')),
  razorpay_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS practitioner_bookings_practitioner_idx
  ON public.practitioner_bookings (practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS practitioner_bookings_user_idx
  ON public.practitioner_bookings (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.practitioner_session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.practitioner_bookings(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  service_name TEXT NOT NULL DEFAULT '',
  session_date TEXT NOT NULL DEFAULT '',
  session_time TEXT NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 60,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practitioner_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_wallets_practitioner_id_idx
  ON public.practitioner_wallets (practitioner_id)
  WHERE practitioner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.practitioner_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.practitioner_wallets(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.practitioner_bookings(id) ON DELETE SET NULL,
  payout_id UUID,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL CHECK (
    category IN ('booking_earning', 'earning_release', 'payout', 'refund', 'adjustment')
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  is_released BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS practitioner_wallet_txn_wallet_idx
  ON public.practitioner_wallet_transactions (wallet_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS practitioner_wallet_txn_booking_earning_idx
  ON public.practitioner_wallet_transactions (booking_id, category)
  WHERE category = 'booking_earning' AND booking_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.practitioner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.practitioner_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
  razorpay_payout_id TEXT,
  razorpay_fund_account_id TEXT,
  notes TEXT,
  failure_reason TEXT,
  last_webhook_event TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS practitioner_payouts_razorpay_id_unique
  ON public.practitioner_payouts (razorpay_payout_id)
  WHERE razorpay_payout_id IS NOT NULL;

ALTER TABLE public.practitioner_wallet_transactions
  ADD CONSTRAINT practitioner_wallet_txn_payout_fkey
  FOREIGN KEY (payout_id) REFERENCES public.practitioner_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practitioner_payouts_wallet_idx
  ON public.practitioner_payouts (wallet_id, created_at DESC);

DROP TRIGGER IF EXISTS practitioner_offerings_updated_at ON public.practitioner_offerings;
CREATE TRIGGER practitioner_offerings_updated_at
  BEFORE UPDATE ON public.practitioner_offerings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS practitioner_bookings_updated_at ON public.practitioner_bookings;
CREATE TRIGGER practitioner_bookings_updated_at
  BEFORE UPDATE ON public.practitioner_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS practitioner_wallets_updated_at ON public.practitioner_wallets;
CREATE TRIGGER practitioner_wallets_updated_at
  BEFORE UPDATE ON public.practitioner_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS practitioner_payouts_updated_at ON public.practitioner_payouts;
CREATE TRIGGER practitioner_payouts_updated_at
  BEFORE UPDATE ON public.practitioner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.practitioner_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_offerings_select"
  ON public.practitioner_offerings FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_bookings_select"
  ON public.practitioner_bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_session_history_select"
  ON public.practitioner_session_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_wallets_select"
  ON public.practitioner_wallets FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_wallet_txn_select"
  ON public.practitioner_wallet_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_payouts_select"
  ON public.practitioner_payouts FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_availability_select"
  ON public.practitioner_availability FOR SELECT TO authenticated USING (true);

CREATE POLICY "practitioner_offerings_practitioner_write"
  ON public.practitioner_offerings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_availability_practitioner_write"
  ON public.practitioner_availability FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_bookings_insert"
  ON public.practitioner_bookings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "practitioner_bookings_practitioner_update"
  ON public.practitioner_bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_session_history_practitioner_write"
  ON public.practitioner_session_history FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_wallets_practitioner_write"
  ON public.practitioner_wallets FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_wallet_txn_practitioner_write"
  ON public.practitioner_wallet_transactions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );

CREATE POLICY "practitioner_payouts_practitioner_write"
  ON public.practitioner_payouts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Practitioner', 'Admin'))
  );
