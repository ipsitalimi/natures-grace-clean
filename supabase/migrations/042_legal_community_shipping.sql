-- Support community_guidelines and shipping_policy in legal acceptance system

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_community_guidelines BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_community_guidelines_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_community_guidelines_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_shipping_policy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_shipping_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_shipping_timestamp TIMESTAMPTZ;

UPDATE public.platform_settings
SET settings = jsonb_set(
  jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{legalVersions,community_guidelines}',
    COALESCE(settings->'legalVersions'->'community_guidelines', '"v1.0"'::jsonb),
    true
  ),
  '{legalVersions,shipping_policy}',
  COALESCE(settings->'legalVersions'->'shipping_policy', '"v1.0"'::jsonb),
  true
)
WHERE id = 'default';

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
      'community_guidelines', 'v1.0',
      'shipping_policy', 'v1.0',
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
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;

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
      WHEN 'community_guidelines' THEN
        UPDATE public.profiles SET
          accepted_community_guidelines = true,
          accepted_community_guidelines_version = v_version,
          accepted_community_guidelines_timestamp = v_now,
          updated_at = v_now
        WHERE id = v_uid;
      WHEN 'shipping_policy' THEN
        UPDATE public.profiles SET
          accepted_shipping_policy = true,
          accepted_shipping_version = v_version,
          accepted_shipping_timestamp = v_now,
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

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'legal_acceptance_events'
    ) THEN
      INSERT INTO public.legal_acceptance_events (user_id, document_key, document_version, accepted_role)
      VALUES (v_uid, v_key, v_version, COALESCE(v_role, 'User'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

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
    NEW.accepted_community_guidelines IS DISTINCT FROM OLD.accepted_community_guidelines OR
    NEW.accepted_community_guidelines_version IS DISTINCT FROM OLD.accepted_community_guidelines_version OR
    NEW.accepted_community_guidelines_timestamp IS DISTINCT FROM OLD.accepted_community_guidelines_timestamp OR
    NEW.accepted_shipping_policy IS DISTINCT FROM OLD.accepted_shipping_policy OR
    NEW.accepted_shipping_version IS DISTINCT FROM OLD.accepted_shipping_version OR
    NEW.accepted_shipping_timestamp IS DISTINCT FROM OLD.accepted_shipping_timestamp OR
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
