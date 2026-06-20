-- Production polish: applications, refunds, shipping, legal history, push tokens, manual payouts

-- ---------------------------------------------------------------------------
-- Role applications: progress, rejection, reapply
-- ---------------------------------------------------------------------------
ALTER TABLE public.role_applications
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS progress_stage TEXT NOT NULL DEFAULT 'submitted'
    CHECK (progress_stage IN (
      'submitted', 'documents_received', 'under_review', 'verification', 'approved', 'rejected'
    ));

CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.role_applications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS application_documents_app_idx
  ON public.application_documents (application_id, uploaded_at DESC);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "application_documents_select_own"
  ON public.application_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_applications ra
      WHERE ra.id = application_id AND ra.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "application_documents_insert_own"
  ON public.application_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_applications ra
      WHERE ra.id = application_id AND ra.user_id = auth.uid()
    )
  );

CREATE POLICY "application_documents_admin_all"
  ON public.application_documents FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seller verification badge
-- ---------------------------------------------------------------------------
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- Legal acceptance history (append-only audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_acceptance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  document_version TEXT NOT NULL,
  accepted_role TEXT NOT NULL DEFAULT 'User',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS legal_acceptance_events_user_idx
  ON public.legal_acceptance_events (user_id, accepted_at DESC);

ALTER TABLE public.legal_acceptance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_acceptance_events_select_own"
  ON public.legal_acceptance_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "legal_acceptance_events_insert_own"
  ON public.legal_acceptance_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Extend record_legal_acceptances to append audit history
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

    INSERT INTO public.legal_acceptance_events (user_id, document_key, document_version, accepted_role)
    VALUES (v_uid, v_key, v_version, COALESCE(v_role, 'User'));
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Approve role application: set seller is_verified on approval (via service/RPC patch)
-- Seller is_verified set in client approveRoleApplication fallback after migration
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Refund requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.practitioner_bookings(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_requests_user_idx ON public.refund_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS refund_requests_status_idx ON public.refund_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refund_requests_select_own"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "refund_requests_insert_own"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "refund_requests_update_admin"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Order shipping tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_status TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery TEXT;

-- ---------------------------------------------------------------------------
-- Manual payout statuses (seller + practitioner)
-- ---------------------------------------------------------------------------
ALTER TABLE public.seller_payouts DROP CONSTRAINT IF EXISTS seller_payouts_status_check;
ALTER TABLE public.seller_payouts
  ADD CONSTRAINT seller_payouts_status_check
  CHECK (status IN ('Pending', 'Under Review', 'Processing', 'Completed', 'Rejected', 'Failed', 'Cancelled'));

ALTER TABLE public.practitioner_payouts DROP CONSTRAINT IF EXISTS practitioner_payouts_status_check;
ALTER TABLE public.practitioner_payouts
  ADD CONSTRAINT practitioner_payouts_status_check
  CHECK (status IN ('Pending', 'Under Review', 'Processing', 'Completed', 'Rejected', 'Failed', 'Cancelled'));

ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.practitioner_payouts
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Push notification tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

DROP TRIGGER IF EXISTS push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
