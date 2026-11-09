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
