-- Legal acceptance tracking on profiles + server-side enforcement

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_user_terms BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_user_terms_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_user_terms_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_privacy_policy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_privacy_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_privacy_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_refund_policy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_refund_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_refund_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_medical_disclaimer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_medical_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_medical_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_account_deletion_policy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_account_deletion_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_account_deletion_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_grievance_policy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_grievance_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_grievance_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_practitioner_agreement BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_practitioner_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_practitioner_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_seller_agreement BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_seller_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_seller_timestamp TIMESTAMPTZ;

-- Seed default legal versions into platform_settings (merge if row exists)
UPDATE public.platform_settings
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'legalVersions', jsonb_build_object(
    'user_terms', 'v1.0',
    'privacy_policy', 'v1.0',
    'refund_policy', 'v1.0',
    'medical_disclaimer', 'v1.0',
    'account_deletion_policy', 'v1.0',
    'grievance_policy', 'v1.0',
    'practitioner_agreement', 'v1.0',
    'seller_agreement', 'v1.0'
  )
)
WHERE id = 'default';

INSERT INTO public.platform_settings (id, settings)
SELECT 'default', jsonb_build_object(
  'legalVersions', jsonb_build_object(
    'user_terms', 'v1.0',
    'privacy_policy', 'v1.0',
    'refund_policy', 'v1.0',
    'medical_disclaimer', 'v1.0',
    'account_deletion_policy', 'v1.0',
    'grievance_policy', 'v1.0',
    'practitioner_agreement', 'v1.0',
    'seller_agreement', 'v1.0'
  )
)
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE id = 'default');

CREATE OR REPLACE FUNCTION public.get_legal_versions()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT settings->'legalVersions' FROM public.platform_settings WHERE id = 'default'),
    jsonb_build_object(
      'user_terms', 'v1.0',
      'privacy_policy', 'v1.0',
      'refund_policy', 'v1.0',
      'medical_disclaimer', 'v1.0',
      'account_deletion_policy', 'v1.0',
      'grievance_policy', 'v1.0',
      'practitioner_agreement', 'v1.0',
      'seller_agreement', 'v1.0'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.record_legal_acceptances(p_acceptances JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
  v_item JSONB;
  v_key TEXT;
  v_version TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  PERFORM set_config('app.recording_legal', 'true', true);

  IF p_acceptances IS NULL OR jsonb_typeof(p_acceptances) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid acceptances payload');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_acceptances)
  LOOP
    v_key := v_item->>'key';
    v_version := v_item->>'version';
    IF v_version IS NULL OR length(trim(v_version)) = 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Version required for each acceptance');
    END IF;

    CASE v_key
      WHEN 'user_terms' THEN
        UPDATE public.profiles SET
          accepted_user_terms = true,
          accepted_user_terms_version = v_version,
          accepted_user_terms_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'privacy_policy' THEN
        UPDATE public.profiles SET
          accepted_privacy_policy = true,
          accepted_privacy_version = v_version,
          accepted_privacy_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'refund_policy' THEN
        UPDATE public.profiles SET
          accepted_refund_policy = true,
          accepted_refund_version = v_version,
          accepted_refund_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'medical_disclaimer' THEN
        UPDATE public.profiles SET
          accepted_medical_disclaimer = true,
          accepted_medical_version = v_version,
          accepted_medical_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'account_deletion_policy' THEN
        UPDATE public.profiles SET
          accepted_account_deletion_policy = true,
          accepted_account_deletion_version = v_version,
          accepted_account_deletion_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'grievance_policy' THEN
        UPDATE public.profiles SET
          accepted_grievance_policy = true,
          accepted_grievance_version = v_version,
          accepted_grievance_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'practitioner_agreement' THEN
        UPDATE public.profiles SET
          accepted_practitioner_agreement = true,
          accepted_practitioner_version = v_version,
          accepted_practitioner_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'seller_agreement' THEN
        UPDATE public.profiles SET
          accepted_seller_agreement = true,
          accepted_seller_version = v_version,
          accepted_seller_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      ELSE
        RETURN jsonb_build_object('ok', false, 'error', format('Unknown legal key: %s', v_key));
    END CASE;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_legal_acceptances(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptances(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_direct_legal_column_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.recording_legal', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.accepted_user_terms IS DISTINCT FROM OLD.accepted_user_terms OR
    NEW.accepted_user_terms_version IS DISTINCT FROM OLD.accepted_user_terms_version OR
    NEW.accepted_user_terms_timestamp IS DISTINCT FROM OLD.accepted_user_terms_timestamp OR
    NEW.accepted_privacy_policy IS DISTINCT FROM OLD.accepted_privacy_policy OR
    NEW.accepted_privacy_version IS DISTINCT FROM OLD.accepted_privacy_version OR
    NEW.accepted_privacy_timestamp IS DISTINCT FROM OLD.accepted_privacy_timestamp OR
    NEW.accepted_refund_policy IS DISTINCT FROM OLD.accepted_refund_policy OR
    NEW.accepted_refund_version IS DISTINCT FROM OLD.accepted_refund_version OR
    NEW.accepted_refund_timestamp IS DISTINCT FROM OLD.accepted_refund_timestamp OR
    NEW.accepted_medical_disclaimer IS DISTINCT FROM OLD.accepted_medical_disclaimer OR
    NEW.accepted_medical_version IS DISTINCT FROM OLD.accepted_medical_version OR
    NEW.accepted_medical_timestamp IS DISTINCT FROM OLD.accepted_medical_timestamp OR
    NEW.accepted_account_deletion_policy IS DISTINCT FROM OLD.accepted_account_deletion_policy OR
    NEW.accepted_account_deletion_version IS DISTINCT FROM OLD.accepted_account_deletion_version OR
    NEW.accepted_account_deletion_timestamp IS DISTINCT FROM OLD.accepted_account_deletion_timestamp OR
    NEW.accepted_grievance_policy IS DISTINCT FROM OLD.accepted_grievance_policy OR
    NEW.accepted_grievance_version IS DISTINCT FROM OLD.accepted_grievance_version OR
    NEW.accepted_grievance_timestamp IS DISTINCT FROM OLD.accepted_grievance_timestamp OR
    NEW.accepted_practitioner_agreement IS DISTINCT FROM OLD.accepted_practitioner_agreement OR
    NEW.accepted_practitioner_version IS DISTINCT FROM OLD.accepted_practitioner_version OR
    NEW.accepted_practitioner_timestamp IS DISTINCT FROM OLD.accepted_practitioner_timestamp OR
    NEW.accepted_seller_agreement IS DISTINCT FROM OLD.accepted_seller_agreement OR
    NEW.accepted_seller_version IS DISTINCT FROM OLD.accepted_seller_version OR
    NEW.accepted_seller_timestamp IS DISTINCT FROM OLD.accepted_seller_timestamp
  ) THEN
    RAISE EXCEPTION 'Legal acceptances must be recorded via record_legal_acceptances RPC';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_direct_legal_update ON public.profiles;
CREATE TRIGGER profiles_prevent_direct_legal_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_legal_column_update();

CREATE OR REPLACE FUNCTION public.enforce_role_application_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_versions JSONB;
  v_required TEXT;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_versions := public.get_legal_versions();

  IF NEW.target_role = 'Practitioner' THEN
    v_required := v_versions->>'practitioner_agreement';
    IF NOT v_profile.accepted_practitioner_agreement
       OR v_profile.accepted_practitioner_version IS DISTINCT FROM v_required THEN
      RAISE EXCEPTION 'Practitioner Agreement must be accepted before applying';
    END IF;
  ELSIF NEW.target_role = 'Seller' THEN
    v_required := v_versions->>'seller_agreement';
    IF NOT v_profile.accepted_seller_agreement
       OR v_profile.accepted_seller_version IS DISTINCT FROM v_required THEN
      RAISE EXCEPTION 'Seller Agreement must be accepted before applying';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS role_applications_enforce_legal ON public.role_applications;
CREATE TRIGGER role_applications_enforce_legal
  BEFORE INSERT ON public.role_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_role_application_legal();

REVOKE ALL ON FUNCTION public.get_legal_versions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_legal_versions() TO authenticated, anon;
