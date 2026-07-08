-- Practitioner specialties: multiple (category, subcategory) pairs per profile.
-- Supports multi-subcategory applications and separate category approvals.

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS specialties JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from legacy single category + subcategory.
UPDATE public.practitioners p
SET specialties = jsonb_build_array(
  jsonb_build_object('category', p.category, 'subcategory', p.subcategory)
)
WHERE (p.specialties IS NULL OR p.specialties = '[]'::jsonb)
  AND COALESCE(trim(p.subcategory), '') <> ''
  AND COALESCE(trim(p.category), '') <> '';

CREATE OR REPLACE FUNCTION public.parse_practitioner_subcategories_from_form(p_form JSONB)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_raw TEXT;
  v_subs TEXT[];
BEGIN
  IF jsonb_typeof(p_form->'subcategories') = 'array' THEN
    SELECT COALESCE(array_agg(DISTINCT trim(x)), '{}'::text[])
    INTO v_subs
    FROM jsonb_array_elements_text(p_form->'subcategories') AS x
    WHERE trim(x) <> '';
    IF array_length(v_subs, 1) IS NOT NULL THEN
      RETURN v_subs;
    END IF;
  END IF;

  v_raw := COALESCE(NULLIF(trim(p_form->>'subcategories'), ''), '');
  IF v_raw <> '' THEN
    SELECT COALESCE(array_agg(DISTINCT trim(x)), '{}'::text[])
    INTO v_subs
    FROM unnest(string_to_array(v_raw, ',')) AS x
    WHERE trim(x) <> '';
    IF array_length(v_subs, 1) IS NOT NULL THEN
      RETURN v_subs;
    END IF;
  END IF;

  IF COALESCE(trim(p_form->>'subcategory'), '') <> '' THEN
    RETURN ARRAY[trim(p_form->>'subcategory')];
  END IF;

  IF COALESCE(trim(p_form->>'sessionTypes'), '') <> '' THEN
    SELECT COALESCE(array_agg(DISTINCT trim(x)), '{}'::text[])
    INTO v_subs
    FROM unnest(string_to_array(p_form->>'sessionTypes', ',')) AS x
    WHERE trim(x) <> '';
    RETURN COALESCE(v_subs, '{}'::text[]);
  END IF;

  RETURN '{}'::text[];
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_practitioner_specialties(
  p_practitioner_id UUID,
  p_category TEXT,
  p_subcategories TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing JSONB;
  v_merged JSONB := '[]'::jsonb;
  v_sub TEXT;
  v_cat TEXT;
  v_pair JSONB;
  v_seen TEXT[] := '{}'::text[];
  v_key TEXT;
  v_elem JSONB;
BEGIN
  v_cat := COALESCE(NULLIF(trim(p_category), ''), 'Healings');

  SELECT COALESCE(specialties, '[]'::jsonb) INTO v_existing
  FROM public.practitioners
  WHERE id = p_practitioner_id;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_existing)
  LOOP
    v_key := lower(trim(v_elem->>'category')) || '::' || trim(v_elem->>'subcategory');
    IF trim(v_elem->>'subcategory') <> '' AND NOT (v_key = ANY (v_seen)) THEN
      v_merged := v_merged || jsonb_build_array(v_elem);
      v_seen := array_append(v_seen, v_key);
    END IF;
  END LOOP;

  FOREACH v_sub IN ARRAY COALESCE(p_subcategories, '{}'::text[])
  LOOP
    v_sub := trim(v_sub);
    IF v_sub = '' THEN
      CONTINUE;
    END IF;
    v_key := lower(v_cat) || '::' || v_sub;
    IF v_key = ANY (v_seen) THEN
      CONTINUE;
    END IF;
    v_pair := jsonb_build_object('category', v_cat, 'subcategory', v_sub);
    v_merged := v_merged || jsonb_build_array(v_pair);
    v_seen := array_append(v_seen, v_key);
  END LOOP;

  RETURN v_merged;
END;
$$;

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
  v_subs TEXT[];
  v_merged JSONB;
  v_primary_sub TEXT;
BEGIN
  v_category := COALESCE(NULLIF(trim(p_form->>'category'), ''), 'Healings');
  v_subs := public.parse_practitioner_subcategories_from_form(p_form);
  v_primary_sub := COALESCE(v_subs[1], '');

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = p_user_id
  LIMIT 1;

  IF v_practitioner_id IS NULL THEN
    INSERT INTO public.practitioners (
      profile_id, name, category, subcategory, bio, experience, certifications,
      rating, review_count, price_per_session, approval_status, is_verified, featured, is_active, specialties
    ) VALUES (
      p_user_id,
      COALESCE(NULLIF(trim(p_form->>'fullName'), ''), 'Practitioner'),
      v_category,
      v_primary_sub,
      COALESCE(p_form->>'bio', ''),
      COALESCE(p_form->>'experience', ''),
      COALESCE(
        (SELECT array_agg(trim(x)) FROM unnest(string_to_array(COALESCE(p_form->>'certifications', ''), ',')) AS x WHERE trim(x) <> ''),
        '{}'::text[]
      ),
      5, 0,
      COALESCE(NULLIF(regexp_replace(COALESCE(p_form->>'priceRange', ''), '[^0-9]', '', 'g'), '')::numeric, 0),
      'Approved', false, false, true,
      '[]'::jsonb
    )
    RETURNING id INTO v_practitioner_id;
  ELSE
    UPDATE public.practitioners
    SET
      name = COALESCE(NULLIF(trim(p_form->>'fullName'), ''), name),
      category = v_category,
      subcategory = COALESCE(NULLIF(v_primary_sub, ''), subcategory),
      bio = COALESCE(NULLIF(p_form->>'bio', ''), bio),
      experience = COALESCE(NULLIF(p_form->>'experience', ''), experience),
      price_per_session = COALESCE(
        NULLIF(regexp_replace(COALESCE(p_form->>'priceRange', ''), '[^0-9]', '', 'g'), '')::numeric,
        price_per_session
      ),
      approval_status = 'Approved',
      is_active = true,
      updated_at = NOW()
    WHERE id = v_practitioner_id;
  END IF;

  v_merged := public.merge_practitioner_specialties(v_practitioner_id, v_category, v_subs);

  UPDATE public.practitioners
  SET
    specialties = v_merged,
    subcategory = COALESCE(
      NULLIF(v_primary_sub, ''),
      NULLIF(trim(subcategory), ''),
      (SELECT trim(x->>'subcategory') FROM jsonb_array_elements(v_merged) x LIMIT 1),
      ''
    ),
    updated_at = NOW()
  WHERE id = v_practitioner_id;

  INSERT INTO public.practitioner_wallets (practitioner_id)
  SELECT v_practitioner_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.practitioner_wallets pw WHERE pw.practitioner_id = v_practitioner_id
  );

  RETURN v_practitioner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_practitioner_application(UUID, JSONB) TO authenticated;

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
    PERFORM public.apply_practitioner_application(v_app.user_id, v_form);
  ELSIF v_app.target_role = 'Seller' THEN
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE profile_id = v_app.user_id) THEN
      INSERT INTO public.sellers (profile_id, store_name, description, is_active)
      VALUES (
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
  SET status = 'Approved', reviewed_at = NOW(), reviewed_by = p_admin_id
  WHERE id = p_application_id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'approval_failed');
END;
$$;

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

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_practitioner_id IS NOT NULL THEN
    INSERT INTO public.practitioner_wallets (practitioner_id)
    SELECT v_practitioner_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.practitioner_wallets pw WHERE pw.practitioner_id = v_practitioner_id
    );
    RETURN v_practitioner_id;
  END IF;

  SELECT id, role, full_name INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT ra.* INTO v_app
  FROM public.role_applications ra
  WHERE ra.user_id = auth.uid()
    AND ra.target_role = 'Practitioner'
    AND ra.status = 'Approved'
  ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_profile.role <> 'Practitioner' THEN
      UPDATE public.profiles SET role = 'Practitioner', updated_at = NOW() WHERE id = auth.uid();
    END IF;
    RETURN public.apply_practitioner_application(auth.uid(), COALESCE(v_app.form_data, '{}'::jsonb));
  END IF;

  IF v_profile.role <> 'Practitioner' THEN
    RAISE EXCEPTION 'not_practitioner' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.apply_practitioner_application(
    auth.uid(),
    jsonb_build_object('fullName', COALESCE(v_profile.full_name, 'Practitioner'), 'category', 'Healings')
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
