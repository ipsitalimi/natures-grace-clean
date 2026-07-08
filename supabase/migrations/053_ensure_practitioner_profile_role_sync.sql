-- Sync profiles.role from approved Practitioner applications and provision
-- practitioner row + wallet when missing (fixes not_practitioner for approved apps
-- where profiles.role was never updated).

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
  v_form JSONB;
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
      SELECT 1
      FROM public.practitioner_wallets pw
      WHERE pw.practitioner_id = v_practitioner_id
    );

    RETURN v_practitioner_id;
  END IF;

  IF v_profile.role <> 'Practitioner' THEN
    SELECT ra.* INTO v_app
    FROM public.role_applications ra
    WHERE ra.user_id = auth.uid()
      AND ra.target_role = 'Practitioner'
      AND ra.status = 'Approved'
    ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'not_practitioner' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.profiles
    SET role = 'Practitioner', updated_at = NOW()
    WHERE id = auth.uid();

    v_profile.role := 'Practitioner';
  ELSE
    SELECT ra.* INTO v_app
    FROM public.role_applications ra
    WHERE ra.user_id = auth.uid()
      AND ra.target_role = 'Practitioner'
      AND ra.status = 'Approved'
    ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
    LIMIT 1;
  END IF;

  v_form := COALESCE(v_app.form_data, '{}'::jsonb);

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
  )
  VALUES (
    auth.uid(),
    COALESCE(
      NULLIF(trim(v_form->>'fullName'), ''),
      NULLIF(trim(v_profile.full_name), ''),
      'Practitioner'
    ),
    COALESCE(v_form->>'category', 'Healings'),
    COALESCE(NULLIF(v_form->>'subcategory', ''), NULLIF(v_form->>'sessionTypes', ''), ''),
    COALESCE(v_form->>'bio', ''),
    COALESCE(v_form->>'experience', '1+ years'),
    COALESCE(
      (SELECT array_agg(trim(x)) FROM unnest(string_to_array(COALESCE(v_form->>'certifications', ''), ',')) AS x WHERE trim(x) <> ''),
      '{}'::text[]
    ),
    5,
    0,
    COALESCE(NULLIF(regexp_replace(COALESCE(v_form->>'priceRange', ''), '[^0-9]', '', 'g'), '')::numeric, 1000),
    'Approved',
    false,
    false,
    true
  )
  RETURNING id INTO v_practitioner_id;

  INSERT INTO public.practitioner_wallets (practitioner_id)
  SELECT v_practitioner_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.practitioner_wallets pw
    WHERE pw.practitioner_id = v_practitioner_id
  );

  RETURN v_practitioner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_profile() TO authenticated;

NOTIFY pgrst, 'reload schema';
