-- Seller approval: onboarding flag, progress stage, wallet bootstrap, in-app notification helper

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
  v_seller_id UUID;
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
        COALESCE(v_form->>'sessionTypes', ''),
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
  ELSIF v_app.target_role = 'Seller' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sellers WHERE profile_id = v_app.user_id
    ) THEN
      INSERT INTO public.sellers (
        profile_id,
        store_name,
        description,
        philosophy,
        storefront_settings,
        is_active,
        is_verified
      ) VALUES (
        v_app.user_id,
        COALESCE(v_form->>'brandName', v_form->>'fullName', 'Store'),
        COALESCE(v_form->>'description', ''),
        '',
        jsonb_build_object('onboarding_complete', false),
        true,
        false
      )
      RETURNING id INTO v_seller_id;
    ELSE
      SELECT id INTO v_seller_id FROM public.sellers WHERE profile_id = v_app.user_id;
    END IF;

    IF v_seller_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'seller_wallets'
    ) THEN
      INSERT INTO public.seller_wallets (seller_id)
      SELECT v_seller_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.seller_wallets sw WHERE sw.seller_id = v_seller_id
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
    progress_stage = 'approved',
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_application_id;

  INSERT INTO public.notifications (user_id, message, is_read, link_route)
  VALUES (
    v_app.user_id,
    CASE
      WHEN v_app.target_role = 'Seller' THEN
        'Congratulations! Your seller application was approved. Set up your store to get started.'
      ELSE
        'Congratulations! Your practitioner application was approved.'
    END,
    false,
    CASE
      WHEN v_app.target_role = 'Seller' THEN 'SellerOnboarding'
      ELSE 'PractitionerMain'
    END
  );

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'approval_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_role_application_transaction(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_role_application_transaction(UUID, UUID) TO authenticated;
