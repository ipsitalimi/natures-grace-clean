CREATE OR REPLACE FUNCTION public.ensure_seller_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_seller_id UUID;
  v_app RECORD;
  v_form JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, role, full_name INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT id INTO v_seller_id
  FROM public.sellers
  WHERE profile_id = v_user_id
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    SELECT id, form_data
    INTO v_app
    FROM public.role_applications
    WHERE user_id = v_user_id
      AND target_role = 'Seller'
      AND status = 'Approved'
    ORDER BY reviewed_at DESC NULLS LAST, updated_at DESC NULLS LAST
    LIMIT 1;

    IF COALESCE(TRIM(v_profile.role), '') <> 'Seller' THEN
      IF v_app.id IS NULL THEN 
        RAISE EXCEPTION 'not_seller';
      END IF;
      UPDATE public.profiles
      SET role = 'Seller', updated_at = NOW()
      WHERE id = v_user_id;
      v_profile.role := 'Seller';
    END IF;

    v_form := COALESCE(v_app.form_data, '{}'::jsonb);

    INSERT INTO public.sellers (
      profile_id,
      store_name,
      description,
      philosophy,
      storefront_settings,
      is_active,
      is_verified
    ) VALUES (
      v_user_id,
      COALESCE(NULLIF(v_form->>'brandName', ''), NULLIF(v_form->>'fullName', ''), NULLIF(v_profile.full_name, ''), 'Store'),
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

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'seller_wallets'
  ) THEN
    INSERT INTO public.seller_wallets (seller_id)
    SELECT v_seller_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.seller_wallets sw WHERE sw.seller_id = v_seller_id
    );
  END IF;

  RETURN v_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_seller_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_seller_profile() TO authenticated;
