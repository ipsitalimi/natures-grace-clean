-- Payment webhook support, pending booking checkouts, account deletion, admin role provisioning

-- ---------------------------------------------------------------------------
-- Pending booking checkouts (survive app crash between Razorpay pay and confirm)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_booking_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  booking_draft JSONB NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  booking_id UUID REFERENCES public.practitioner_bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_booking_checkouts_user_idx
  ON public.pending_booking_checkouts (user_id, created_at DESC);

ALTER TABLE public.pending_booking_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_booking_checkouts_service"
  ON public.pending_booking_checkouts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Account deletion requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (user_id)
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_deletion_select_own"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "account_deletion_insert_own"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "account_deletion_admin_update"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.account_deletion_requests (user_id, reason, status)
  VALUES (v_uid, NULLIF(trim(COALESCE(p_reason, '')), ''), 'pending')
  ON CONFLICT (user_id) DO UPDATE
  SET
    reason = EXCLUDED.reason,
    status = CASE
      WHEN public.account_deletion_requests.status = 'cancelled' THEN 'pending'
      ELSE public.account_deletion_requests.status
    END,
    requested_at = CASE
      WHEN public.account_deletion_requests.status = 'cancelled' THEN NOW()
      ELSE public.account_deletion_requests.requested_at
    END;

  UPDATE public.profiles
  SET status = 'Deletion Requested', updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin role provisioning (mirrors approval flow infrastructure)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_provision_user_role(
  p_user_id UUID,
  p_role TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_practitioner_id UUID;
BEGIN
  IF NOT public.is_admin() OR p_admin_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_role NOT IN ('User', 'Seller', 'Practitioner', 'Admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  IF p_role = 'Seller' THEN
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE profile_id = p_user_id) THEN
      INSERT INTO public.sellers (
        profile_id, store_name, description, philosophy, storefront_settings, is_active, is_verified
      ) VALUES (
        p_user_id,
        COALESCE((SELECT full_name FROM public.profiles WHERE id = p_user_id), 'Store'),
        '', '', jsonb_build_object('onboarding_complete', false), true, false
      )
      RETURNING id INTO v_seller_id;
    ELSE
      SELECT id INTO v_seller_id FROM public.sellers WHERE profile_id = p_user_id;
    END IF;

    IF v_seller_id IS NOT NULL THEN
      INSERT INTO public.seller_wallets (seller_id)
      SELECT v_seller_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.seller_wallets sw WHERE sw.seller_id = v_seller_id
      );
    END IF;
  ELSIF p_role = 'Practitioner' THEN
    IF NOT EXISTS (SELECT 1 FROM public.practitioners WHERE profile_id = p_user_id) THEN
      INSERT INTO public.practitioners (
        profile_id, name, category, subcategory, bio, experience, certifications,
        rating, review_count, price_per_session, approval_status, is_verified, featured, is_active
      )
      SELECT
        p_user_id,
        COALESCE(full_name, 'Practitioner'),
        'Healings', '', '', '1+ years', '{}'::text[],
        5, 0, 1000, 'Approved', false, false, true
      FROM public.profiles WHERE id = p_user_id
      RETURNING id INTO v_practitioner_id;
    ELSE
      SELECT id INTO v_practitioner_id FROM public.practitioners WHERE profile_id = p_user_id;
    END IF;

    IF v_practitioner_id IS NOT NULL THEN
      INSERT INTO public.practitioner_wallets (practitioner_id)
      SELECT v_practitioner_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.practitioner_wallets pw WHERE pw.practitioner_id = v_practitioner_id
      );
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'role', p_role);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'provision_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_provision_user_role(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_provision_user_role(UUID, TEXT, UUID) TO authenticated;
