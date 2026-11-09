-- Correct practitioner application approval to use the existing specialty-aware
-- provisioning function and ensure application form data never sets pricing.
-- Also enforce the 600-character public practitioner bio limit at the DB layer.

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
    -- The latest specialty-aware function uses only application identity,
    -- categories, experience and bio; it deliberately ignores priceRange.
    PERFORM public.apply_practitioner_application(v_app.user_id, v_form);
  ELSIF v_app.target_role = 'Seller' THEN
    -- Preserve the existing seller provisioning path unchanged.
    IF NOT EXISTS (
      SELECT 1 FROM public.sellers WHERE profile_id = v_app.user_id
    ) THEN
      INSERT INTO public.sellers (
        profile_id, store_name, description, is_active
      ) VALUES (
        v_app.user_id,
        COALESCE(v_form->>'brandName', v_form->>'fullName', 'Store'),
        COALESCE(v_form->>'description', ''),
        true
      );
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

CREATE OR REPLACE FUNCTION public.practitioners_bio_length_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.bio IS NOT NULL AND char_length(trim(NEW.bio)) > 600 THEN
    RAISE EXCEPTION 'Practitioner bio must be 600 characters or fewer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_bio_length_guard ON public.practitioners;
CREATE TRIGGER practitioners_bio_length_guard
  BEFORE INSERT OR UPDATE OF bio ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioners_bio_length_guard();

NOTIFY pgrst, 'reload schema';

-- Safe self-provisioning fallback for legacy approved accounts. Never parse
-- priceRange from role_applications into practitioner pricing.
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
  ELSE
    SELECT ra.* INTO v_app
    FROM public.role_applications ra
    WHERE ra.user_id = auth.uid()
      AND ra.target_role = 'Practitioner'
      AND ra.status = 'Approved'
    ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
    LIMIT 1;
  END IF;

  IF v_app.id IS NOT NULL THEN
    v_practitioner_id := public.apply_practitioner_application(
      auth.uid(), COALESCE(v_app.form_data, '{}'::jsonb)
    );
  ELSE
    -- Preserve the existing admin-assigned-role fallback without accepting
    -- applicant priceRange data.
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
  END IF;

  RETURN v_practitioner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_profile() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Only admins may change approved category/specialty, moderation, verification,
-- featured status, pricing, or meeting-link fields. Practitioners may still
-- edit their own public profile details and availability.
CREATE OR REPLACE FUNCTION public.practitioners_profile_field_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.profile_id := OLD.profile_id;
    NEW.category := OLD.category;
    NEW.subcategory := OLD.subcategory;
    NEW.specialties := OLD.specialties;
    NEW.approval_status := OLD.approval_status;
    NEW.is_verified := OLD.is_verified;
    NEW.featured := OLD.featured;
    NEW.price_per_session := OLD.price_per_session;
    NEW.meeting_link := OLD.meeting_link;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_profile_field_guard ON public.practitioners;
CREATE TRIGGER practitioners_profile_field_guard
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioners_profile_field_guard();

-- This helper is intentionally only called from trusted SECURITY DEFINER RPCs.
REVOKE ALL ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM authenticated;

NOTIFY pgrst, 'reload schema';
