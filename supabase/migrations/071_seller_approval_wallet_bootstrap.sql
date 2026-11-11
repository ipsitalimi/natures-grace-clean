-- Seller approval must provision the existing seller row, storefront defaults,
-- and seller wallet. This forward migration updates the shared approval RPC
-- without introducing a second seller/profile system.

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
  IF NOT public.is_admin() OR p_admin_id IS DISTINCT FROM auth.uid() THEN
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
    -- Preserve the existing specialty-aware practitioner provisioning path.
    PERFORM public.apply_practitioner_application(v_app.user_id, v_form);
  ELSIF v_app.target_role = 'Seller' THEN
    SELECT id INTO v_seller_id
    FROM public.sellers
    WHERE profile_id = v_app.user_id
    LIMIT 1;

    IF v_seller_id IS NULL THEN
      INSERT INTO public.sellers (
        profile_id, store_name, description, philosophy, storefront_settings,
        is_active, is_verified
      ) VALUES (
        v_app.user_id,
        COALESCE(NULLIF(v_form->>'brandName', ''), NULLIF(v_form->>'fullName', ''), 'Store'),
        COALESCE(v_form->>'description', ''),
        COALESCE(v_form->>'philosophy', ''),
        jsonb_build_object(
          'accent_color', '#013220',
          'banner_theme_index', 0,
          'featured_product_ids', '[]'::jsonb,
          'onboarding_complete', false
        ),
        true,
        false
      )
      RETURNING id INTO v_seller_id;
    END IF;

    IF v_seller_id IS NOT NULL AND to_regclass('public.seller_wallets') IS NOT NULL THEN
      INSERT INTO public.seller_wallets (seller_id)
      VALUES (v_seller_id)
      ON CONFLICT (seller_id) WHERE seller_id IS NOT NULL DO NOTHING;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unsupported application role');
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

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_role_application_transaction(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_role_application_transaction(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
