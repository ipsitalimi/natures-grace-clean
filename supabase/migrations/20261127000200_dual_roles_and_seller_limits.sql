-- Support additional practitioner specialties, seller listing-limit requests,
-- and independent Practitioner/Seller access on the same profile.

CREATE OR REPLACE FUNCTION public.apply_practitioner_application(
  p_user_id UUID,
  p_form JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id UUID;
  v_category TEXT;
  v_experience_category TEXT;
  v_subs TEXT[];
  v_merged JSONB;
  v_primary_sub TEXT;
  v_additional_category BOOLEAN := COALESCE(p_form->>'applicationType', '') = 'additional_category';
BEGIN
  v_category := COALESCE(NULLIF(trim(p_form->>'category'), ''), 'Healings');
  v_experience_category := NULLIF(trim(p_form->>'experienceCategory'), '');
  IF v_experience_category IS NOT NULL
     AND v_experience_category NOT IN ('0–5 years', '5–10 years', '10+ years') THEN
    RAISE EXCEPTION 'Invalid practitioner experience category';
  END IF;

  v_subs := public.parse_practitioner_subcategories_from_form(p_form);
  v_primary_sub := COALESCE(v_subs[1], '');

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = p_user_id
  LIMIT 1;

  IF v_additional_category AND v_practitioner_id IS NULL THEN
    RAISE EXCEPTION 'An existing practitioner profile is required for an additional category request';
  END IF;

  IF v_practitioner_id IS NULL THEN
    INSERT INTO public.practitioners (
      profile_id, name, category, subcategory, bio, experience, experience_category,
      certifications, rating, review_count, price_per_session, approval_status,
      is_verified, featured, is_active, specialties
    )
    VALUES (
      p_user_id,
      COALESCE(NULLIF(trim(p_form->>'fullName'), ''), 'Practitioner'),
      v_category,
      v_primary_sub,
      COALESCE(p_form->>'bio', ''),
      COALESCE(p_form->>'experience', ''),
      v_experience_category,
      COALESCE(
        (SELECT array_agg(trim(x))
         FROM unnest(string_to_array(COALESCE(p_form->>'certifications', ''), ',')) AS x
         WHERE trim(x) <> ''),
        '{}'::text[]
      ),
      5, 0, 0, 'Approved', false, false, true, '[]'::jsonb
    )
    RETURNING id INTO v_practitioner_id;
  ELSE
    UPDATE public.practitioners
    SET
      name = CASE WHEN v_additional_category THEN name
        ELSE COALESCE(NULLIF(trim(p_form->>'fullName'), ''), name) END,
      category = CASE WHEN v_additional_category THEN category ELSE v_category END,
      subcategory = CASE WHEN v_additional_category THEN subcategory
        ELSE COALESCE(NULLIF(v_primary_sub, ''), subcategory) END,
      bio = CASE WHEN v_additional_category THEN bio
        ELSE COALESCE(NULLIF(p_form->>'bio', ''), bio) END,
      experience = CASE WHEN v_additional_category THEN experience
        ELSE COALESCE(NULLIF(p_form->>'experience', ''), experience) END,
      experience_category = CASE WHEN v_additional_category THEN experience_category
        ELSE COALESCE(v_experience_category, experience_category) END,
      approval_status = 'Approved',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_practitioner_id;
  END IF;

  v_merged := public.merge_practitioner_specialties(v_practitioner_id, v_category, v_subs);
  UPDATE public.practitioners
  SET specialties = v_merged,
      subcategory = CASE WHEN v_additional_category THEN subcategory
        ELSE COALESCE(NULLIF(v_primary_sub, ''), NULLIF(trim(subcategory), ''),
          (SELECT trim(x->>'subcategory') FROM jsonb_array_elements(v_merged) x LIMIT 1), '') END,
      updated_at = NOW()
  WHERE id = v_practitioner_id;

  INSERT INTO public.practitioner_wallets(practitioner_id, commission_rate)
  SELECT v_practitioner_id, 30
  WHERE NOT EXISTS (
    SELECT 1 FROM public.practitioner_wallets pw
    WHERE pw.practitioner_id = v_practitioner_id
  );

  RETURN v_practitioner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM authenticated;

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
  v_requested_limit INTEGER;
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
    PERFORM public.apply_practitioner_application(v_app.user_id, v_form);
  ELSIF v_app.target_role = 'Seller' THEN
    SELECT id INTO v_seller_id
    FROM public.sellers
    WHERE profile_id = v_app.user_id
    LIMIT 1;

    IF COALESCE(v_form->>'applicationType', '') = 'product_limit_increase' THEN
      IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Seller profile not found');
      END IF;
      v_requested_limit := GREATEST(11, LEAST(100,
        COALESCE(NULLIF(v_form->>'requestedProductLimit', '')::INTEGER, 20)));
      UPDATE public.sellers
      SET storefront_settings = jsonb_set(
        COALESCE(storefront_settings, '{}'::jsonb),
        '{product_limit}',
        to_jsonb(v_requested_limit),
        true
      ),
      updated_at = NOW()
      WHERE id = v_seller_id;
    ELSE
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
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unsupported application role');
  END IF;

  -- Keep the first approved workspace as the primary landing role, while
  -- role-specific access is determined by the linked practitioner/seller row.
  UPDATE public.profiles
  SET
    role = CASE WHEN role IN ('Practitioner', 'Seller') THEN role ELSE v_app.target_role END,
    full_name = COALESCE(NULLIF(v_form->>'fullName', ''), full_name),
    phone = COALESCE(NULLIF(v_form->>'phone', ''), phone),
    updated_at = NOW()
  WHERE id = v_app.user_id;

  UPDATE public.role_applications
  SET status = 'Approved',
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

-- A practitioner workspace can be provisioned from its approved application
-- without changing a profile's primary role (which may be Seller).
CREATE OR REPLACE FUNCTION public.ensure_practitioner_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_practitioner_id UUID;
  v_app RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, role, full_name INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_practitioner_id IS NOT NULL THEN
    INSERT INTO public.practitioner_wallets (practitioner_id)
    SELECT v_practitioner_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.practitioner_wallets pw
      WHERE pw.practitioner_id = v_practitioner_id
    );
    RETURN v_practitioner_id;
  END IF;

  SELECT ra.* INTO v_app
  FROM public.role_applications ra
  WHERE ra.user_id = auth.uid()
    AND ra.target_role = 'Practitioner'
    AND ra.status = 'Approved'
  ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
  LIMIT 1;

  IF v_app.id IS NOT NULL THEN
    v_practitioner_id := public.apply_practitioner_application(
      auth.uid(), COALESCE(v_app.form_data, '{}'::jsonb)
    );
  ELSIF v_profile.role = 'Practitioner' THEN
    INSERT INTO public.practitioners (
      profile_id, name, category, subcategory, bio, experience, certifications,
      rating, review_count, price_per_session, approval_status, is_verified,
      featured, is_active
    ) VALUES (
      auth.uid(),
      COALESCE(NULLIF(trim(v_profile.full_name), ''), 'Practitioner'),
      'Healings', '', '', '1+ years', '{}'::text[],
      5, 0, 0, 'Approved', false, false, true
    )
    RETURNING id INTO v_practitioner_id;

    INSERT INTO public.practitioner_wallets (practitioner_id)
    VALUES (v_practitioner_id)
    ON CONFLICT (practitioner_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'not_practitioner' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_practitioner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_profile() TO authenticated;

-- Enforce each seller's approved product cap even if a client bypasses the UI.
CREATE OR REPLACE FUNCTION public.enforce_seller_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT GREATEST(1, LEAST(100,
    COALESCE(NULLIF(s.storefront_settings->>'product_limit', '')::INTEGER, 10)
  ))
  INTO v_limit
  FROM public.sellers s
  WHERE s.id = NEW.seller_id;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Seller profile not found';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.products p
  WHERE p.seller_id = NEW.seller_id
    AND (TG_OP <> 'UPDATE' OR p.id <> OLD.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Product limit reached (%). Request a higher limit from the seller dashboard.', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_seller_product_limit ON public.products;
CREATE TRIGGER enforce_seller_product_limit
  BEFORE INSERT OR UPDATE OF seller_id ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_seller_product_limit();

NOTIFY pgrst, 'reload schema';


-- Self-provisioning a second workspace must not replace the primary role.
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
    SELECT id, form_data INTO v_app
    FROM public.role_applications
    WHERE user_id = v_user_id
      AND target_role = 'Seller'
      AND status = 'Approved'
    ORDER BY reviewed_at DESC NULLS LAST, updated_at DESC NULLS LAST
    LIMIT 1;

    IF COALESCE(TRIM(v_profile.role), '') <> 'Seller' AND v_app.id IS NULL THEN
      RAISE EXCEPTION 'not_seller';
    END IF;

    v_form := COALESCE(v_app.form_data, '{}'::jsonb);

    INSERT INTO public.sellers (
      profile_id, store_name, description, philosophy, storefront_settings,
      is_active, is_verified
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

  IF to_regclass('public.seller_wallets') IS NOT NULL THEN
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

