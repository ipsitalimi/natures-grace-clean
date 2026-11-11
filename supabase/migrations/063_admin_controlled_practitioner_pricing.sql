-- Practitioner application pricing must never set practitioner pricing.
-- Session prices are controlled by Admin, not applicant form data.

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
      0,
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

NOTIFY pgrst, 'reload schema';
