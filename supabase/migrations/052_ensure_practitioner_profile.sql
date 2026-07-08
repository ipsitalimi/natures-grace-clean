-- Self-service practitioner row provisioning for users with Practitioner role
-- but no practitioners row (e.g. manual role assignment, missed approval hook).
--
-- REQUIRED for client ensurePractitionerProfile() / resolvePractitionerId().
-- Apply via: supabase db push  OR  paste into Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.ensure_practitioner_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_practitioner_id UUID;
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

  IF v_profile.role <> 'Practitioner' THEN
    RAISE EXCEPTION 'not_practitioner' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = auth.uid()
  LIMIT 1;

  IF v_practitioner_id IS NULL THEN
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
    SELECT
      auth.uid(),
      COALESCE(NULLIF(trim(v_profile.full_name), ''), 'Practitioner'),
      'Healings',
      '',
      '',
      '1+ years',
      '{}'::text[],
      5,
      0,
      1000,
      'Approved',
      false,
      false,
      true
    RETURNING id INTO v_practitioner_id;
  END IF;

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

-- Refresh PostgREST schema cache so RPC is visible immediately.
NOTIFY pgrst, 'reload schema';
