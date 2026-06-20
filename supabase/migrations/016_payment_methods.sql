-- Phase A: saved payment methods (metadata / token refs only — no PAN or CVV)

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_token_id TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  last4 TEXT NOT NULL DEFAULT '',
  exp_month SMALLINT,
  exp_year SMALLINT,
  expiry_label TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_methods_last4_format CHECK (last4 ~ '^\d{4}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default_per_user_idx
  ON public.payment_methods (user_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS payment_methods_user_created_idx
  ON public.payment_methods (user_id, created_at DESC);

DROP TRIGGER IF EXISTS payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payment_methods_insert_own"
  ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_update_own"
  ON public.payment_methods FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods_delete_own"
  ON public.payment_methods FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payment_methods_select_admin"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (public.is_admin());
