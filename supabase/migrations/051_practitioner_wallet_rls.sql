-- Practitioner wallet provisioning + RLS hardening
-- Client inserts were blocked by practitioner_wallets_write_practitioner (FOR ALL) when
-- practitioner_id did not match current_practitioner_id() or was null.

CREATE OR REPLACE FUNCTION public.ensure_practitioner_wallet(p_commission_rate NUMERIC DEFAULT 10)
RETURNS public.practitioner_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id UUID;
  v_wallet public.practitioner_wallets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  v_practitioner_id := public.current_practitioner_id();
  IF v_practitioner_id IS NULL THEN
    RAISE EXCEPTION 'practitioner_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_wallet
  FROM public.practitioner_wallets
  WHERE practitioner_id = v_practitioner_id;

  IF FOUND THEN
    RETURN v_wallet;
  END IF;

  INSERT INTO public.practitioner_wallets (
    practitioner_id,
    commission_rate,
    bank_account_label,
    next_payout_date
  ) VALUES (
    v_practitioner_id,
    COALESCE(NULLIF(p_commission_rate, 0), 10),
    NULL,
    NULL
  )
  RETURNING * INTO v_wallet;

  RETURN v_wallet;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_wallet
    FROM public.practitioner_wallets
    WHERE practitioner_id = v_practitioner_id;
    RETURN v_wallet;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_practitioner_wallet(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_wallet(NUMERIC) TO authenticated;

-- Backfill wallets for active practitioners missing one.
INSERT INTO public.practitioner_wallets (practitioner_id)
SELECT p.id
FROM public.practitioners p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.practitioner_wallets w
    WHERE w.practitioner_id = p.id
  );

-- Replace monolithic write policy with explicit insert/update (mirrors seller_wallets).
DROP POLICY IF EXISTS "practitioner_wallets_write_practitioner" ON public.practitioner_wallets;

CREATE POLICY "practitioner_wallets_insert_practitioner"
  ON public.practitioner_wallets FOR INSERT TO authenticated
  WITH CHECK (practitioner_id = public.current_practitioner_id());

CREATE POLICY "practitioner_wallets_update_practitioner"
  ON public.practitioner_wallets FOR UPDATE TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

-- Create wallet when a practitioner is approved via role application RPC.
CREATE OR REPLACE FUNCTION public.approve_role_application_transaction(
  p_application_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_form JSONB;
  v_practitioner_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_admin_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_app
  FROM public.role_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Application not found');
  END IF;

  IF v_app.status <> 'Pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Application is no longer pending');
  END IF;

  v_form := COALESCE(v_app.form_data, '{}'::jsonb);

  IF v_app.target_role = 'Practitioner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.practitioners WHERE profile_id = v_app.user_id
    ) THEN
      INSERT INTO public.practitioners (
        profile_id,
        name,
        category,
        subcategory,
        bio,
        experience,
        certifications,
        rating,
        review_count,
        price_per_session,
        approval_status,
        is_verified,
        featured,
        is_active
      ) VALUES (
        v_app.user_id,
        COALESCE(v_form->>'fullName', 'Practitioner'),
        COALESCE(v_form->>'category', 'Healings'),
        COALESCE(NULLIF(v_form->>'subcategory', ''), NULLIF(v_form->>'sessionTypes', ''), ''),
        COALESCE(v_form->>'bio', ''),
        COALESCE(v_form->>'experience', ''),
        COALESCE(
          (SELECT array_agg(trim(x)) FROM unnest(string_to_array(COALESCE(v_form->>'certifications', ''), ',')) AS x WHERE trim(x) <> ''),
          '{}'::text[]
        ),
        5,
        0,
        COALESCE(NULLIF(regexp_replace(COALESCE(v_form->>'priceRange', ''), '[^0-9]', '', 'g'), '')::numeric, 0),
        'Approved',
        false,
        false,
        true
      );
    END IF;

    SELECT id INTO v_practitioner_id
    FROM public.practitioners
    WHERE profile_id = v_app.user_id
    LIMIT 1;

    IF v_practitioner_id IS NOT NULL THEN
      INSERT INTO public.practitioner_wallets (practitioner_id)
      SELECT v_practitioner_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.practitioner_wallets pw WHERE pw.practitioner_id = v_practitioner_id
      );
    END IF;
  ELSIF v_app.target_role = 'Seller' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sellers WHERE profile_id = v_app.user_id
    ) THEN
      INSERT INTO public.sellers (
        profile_id,
        store_name,
        description,
        is_active
      ) VALUES (
        v_app.user_id,
        COALESCE(v_form->>'brandName', v_form->>'fullName', 'Store'),
        COALESCE(v_form->>'description', ''),
        true
      );
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    role = v_app.target_role,
    full_name = COALESCE(NULLIF(v_form->>'fullName', ''), full_name),
    phone = COALESCE(NULLIF(v_form->>'phone', ''), phone),
    updated_at = NOW()
  WHERE id = v_app.user_id;

  UPDATE public.role_applications
  SET
    status = 'Approved',
    reviewed_at = NOW(),
    reviewed_by = p_admin_id
  WHERE id = p_application_id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'approval_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_role_application_transaction(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_role_application_transaction(UUID, UUID) TO authenticated;
