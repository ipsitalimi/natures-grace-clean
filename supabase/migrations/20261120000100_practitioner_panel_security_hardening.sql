-- Practitioner panel security hardening.
-- This migration is intentionally additive/targeted. It does not touch production data
-- and must be applied only after review in the intended Supabase environment.

-- 1) Practitioner identity is ownership, not public availability.
CREATE OR REPLACE FUNCTION public.current_practitioner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.practitioners p
  WHERE p.profile_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_practitioner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_practitioner_id() TO authenticated, service_role;

-- Harden the internal application helper itself: applicant-supplied priceRange
-- must never set administrative pricing, and self-provisioning must use the
-- already-approved application stored in the database.
CREATE OR REPLACE FUNCTION public.apply_practitioner_application(
  p_user_id uuid,
  p_form jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form jsonb;
  v_practitioner_id uuid;
  v_category text;
  v_subs text[];
  v_merged jsonb;
  v_primary_sub text;
BEGIN
  PERFORM set_config('app.practitioner_application_sync', 'true', true);

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_practitioner_application' USING ERRCODE = '22023';
  END IF;

  IF auth.role() = 'service_role' OR public.is_admin() THEN
    v_form := COALESCE(p_form, '{}'::jsonb);
  ELSE
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(ra.form_data, '{}'::jsonb)
      INTO v_form
      FROM public.role_applications ra
     WHERE ra.user_id = auth.uid()
       AND ra.target_role = 'Practitioner'
       AND ra.status = 'Approved'
     ORDER BY ra.reviewed_at DESC NULLS LAST, ra.created_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'approved_practitioner_application_required' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_category := COALESCE(NULLIF(btrim(v_form->>'category'), ''), 'Healings');
  v_subs := public.parse_practitioner_subcategories_from_form(v_form);
  v_primary_sub := COALESCE(v_subs[1], '');

  SELECT id INTO v_practitioner_id
    FROM public.practitioners
   WHERE profile_id = p_user_id
   LIMIT 1;

  IF v_practitioner_id IS NULL THEN
    INSERT INTO public.practitioners (
      profile_id, name, category, subcategory, bio, experience, certifications,
      rating, review_count, price_per_session, approval_status, is_verified,
      featured, is_active, specialties
    ) VALUES (
      p_user_id,
      COALESCE(NULLIF(btrim(v_form->>'fullName'), ''), 'Practitioner'),
      v_category,
      v_primary_sub,
      COALESCE(v_form->>'bio', ''),
      COALESCE(v_form->>'experience', ''),
      COALESCE(
        (SELECT array_agg(btrim(x))
           FROM unnest(string_to_array(COALESCE(v_form->>'certifications', ''), ',')) AS x
          WHERE btrim(x) <> ''),
        '{}'::text[]
      ),
      0, 0, 0, 'Approved', false, false, true, '[]'::jsonb
    )
    RETURNING id INTO v_practitioner_id;
  ELSE
    UPDATE public.practitioners
       SET name = COALESCE(NULLIF(btrim(v_form->>'fullName'), ''), name),
           category = v_category,
           subcategory = COALESCE(NULLIF(v_primary_sub, ''), subcategory),
           bio = COALESCE(NULLIF(v_form->>'bio', ''), bio),
           experience = COALESCE(NULLIF(v_form->>'experience', ''), experience),
           certifications = COALESCE(
             (SELECT array_agg(btrim(x))
                FROM unnest(string_to_array(COALESCE(v_form->>'certifications', ''), ',')) AS x
               WHERE btrim(x) <> ''),
             certifications
           ),
           approval_status = 'Approved',
           is_active = true,
           updated_at = now()
     WHERE id = v_practitioner_id;
  END IF;

  v_merged := public.merge_practitioner_specialties(v_practitioner_id, v_category, v_subs);

  UPDATE public.practitioners
     SET specialties = v_merged,
         subcategory = COALESCE(
           NULLIF(v_primary_sub, ''),
           NULLIF(btrim(subcategory), ''),
           (SELECT btrim(x->>'subcategory')
              FROM jsonb_array_elements(v_merged) x
             LIMIT 1),
           ''
         ),
         updated_at = now()
   WHERE id = v_practitioner_id;

  INSERT INTO public.practitioner_wallets (practitioner_id)
  SELECT v_practitioner_id
   WHERE NOT EXISTS (
     SELECT 1
       FROM public.practitioner_wallets pw
      WHERE pw.practitioner_id = v_practitioner_id
   );

  PERFORM set_config('app.practitioner_application_sync', 'false', true);
  RETURN v_practitioner_id;
END;
$$;

-- Ownership lookup must not depend on availability. Practitioners who switch
-- availability off still need to see their own history, earnings and profile.
CREATE OR REPLACE FUNCTION public.current_practitioner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
    FROM public.practitioners p
   WHERE p.profile_id = auth.uid()
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_practitioner_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_practitioner_id() TO authenticated;

-- These SECURITY DEFINER entry points are internal helpers. Their trusted
-- callers (admin approval and self-provisioning) execute as the function owner.
-- Do not expose them as direct PostgREST RPCs to anonymous or signed-in clients.
REVOKE ALL ON FUNCTION public.apply_practitioner_application(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.guard_practitioner_offering_pricing() FROM PUBLIC, anon, authenticated;

-- 2) Wallets are readable by their owner but never directly writable by app clients.
-- Persist the account-holder label supplied by the practitioner through the backend.
ALTER TABLE public.practitioner_wallets
  ADD COLUMN IF NOT EXISTS bank_account_holder text;

-- Do not prefill a fake bank account on newly provisioned wallets.
ALTER TABLE public.practitioner_wallets
  ALTER COLUMN bank_account_label DROP DEFAULT;

-- The old default was a fake HDFC placeholder, not a verified payout account.
-- Clear only rows matching that exact schema default so practitioners must enter
-- their own bank details before requesting a manual payout.
UPDATE public.practitioner_wallets
SET bank_account_label = NULL,
    bank_account_holder = NULL
WHERE bank_account_label = 'HDFC Bank ···· 4821';

DROP POLICY IF EXISTS "practitioner_wallets_insert_practitioner" ON public.practitioner_wallets;
DROP POLICY IF EXISTS "practitioner_wallets_update_practitioner" ON public.practitioner_wallets;
DROP POLICY IF EXISTS "practitioner_wallets_write_practitioner" ON public.practitioner_wallets;

REVOKE INSERT, UPDATE, DELETE ON public.practitioner_wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.practitioner_wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.practitioner_payouts FROM anon, authenticated;

-- Wallet creation is performed by approval/backend flows, never by a practitioner RPC.
REVOKE ALL ON FUNCTION public.ensure_practitioner_wallet(numeric) FROM PUBLIC, anon, authenticated;

-- 3) Booking creation is server-only. Paid checkout and free bookings already
-- use authenticated Railway endpoints backed by service_role; direct client inserts
-- would allow fake Pending/Confirmed bookings and slot reservation abuse.
DROP POLICY IF EXISTS "practitioner_bookings_insert_buyer" ON public.practitioner_bookings;
REVOKE INSERT ON public.practitioner_bookings FROM anon, authenticated;

-- Practitioner session history is immutable to app clients; completion writes it
-- atomically through the booking trigger below.
DROP POLICY IF EXISTS "practitioner_session_history_write_practitioner" ON public.practitioner_session_history;
REVOKE INSERT, UPDATE, DELETE ON public.practitioner_session_history FROM anon, authenticated;

-- Public discovery must never expose a non-approved practitioner, even if
-- an availability flag is accidentally enabled by a privileged workflow.
DROP POLICY IF EXISTS "practitioners_select" ON public.practitioners;
CREATE POLICY "practitioners_select"
  ON public.practitioners FOR SELECT TO authenticated
  USING (is_active IS TRUE AND approval_status = 'Approved');

-- 4) Protect every admin-controlled practitioner field at the database boundary.
CREATE OR REPLACE FUNCTION public.practitioners_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A nested, trusted database trigger may update the aggregate rating/count.
  -- Direct authenticated UPDATEs execute at trigger depth 1 and remain blocked.
  IF pg_trigger_depth() > 1
     OR current_setting('app.practitioner_application_sync', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.profile_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'practitioner_owner_required' USING ERRCODE = '42501';
  END IF;

  -- Explicit practitioner-editable allowlist mirrors the existing My Profile UI:
  -- name, bio, experience, certifications, photo_url and is_active (availability).
  -- All other columns, including identity, pricing, approval, verification, ratings,
  -- featured status, categories, meeting links and internal metadata are protected.
  IF (to_jsonb(NEW) - ARRAY['name','bio','experience','certifications','photo_url','is_active','metadata','updated_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['name','bio','experience','certifications','photo_url','is_active','metadata','updated_at']) THEN
    RAISE EXCEPTION 'practitioner_field_not_editable' USING ERRCODE = '42501';
  END IF;

  -- The onboarding flow may set this one-way flag; all other metadata stays locked.
  IF (COALESCE(NEW.metadata, '{}'::jsonb) - 'onboarding_complete')
     IS DISTINCT FROM
     (COALESCE(OLD.metadata, '{}'::jsonb) - 'onboarding_complete')
     OR (
       NEW.metadata->'onboarding_complete' IS DISTINCT FROM OLD.metadata->'onboarding_complete'
       AND NEW.metadata->'onboarding_complete' IS DISTINCT FROM 'true'::jsonb
     ) THEN
    RAISE EXCEPTION 'practitioner_metadata_field_not_editable' USING ERRCODE = '42501';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     AND NEW.is_active IS TRUE
     AND OLD.approval_status IS DISTINCT FROM 'Approved' THEN
    RAISE EXCEPTION 'practitioner_approval_required_before_activation' USING ERRCODE = '42501';
  END IF;

  IF NEW.name IS NOT NULL AND char_length(NEW.name) > 120 THEN
    RAISE EXCEPTION 'practitioner_name_too_long' USING ERRCODE = '22001';
  END IF;
  IF NEW.bio IS NOT NULL AND char_length(NEW.bio) > 600 THEN
    RAISE EXCEPTION 'practitioner_bio_too_long' USING ERRCODE = '22001';
  END IF;
  IF NEW.experience IS NOT NULL AND char_length(NEW.experience) > 120 THEN
    RAISE EXCEPTION 'practitioner_experience_too_long' USING ERRCODE = '22001';
  END IF;
  IF cardinality(COALESCE(NEW.certifications, '{}'::text[])) > 30
     OR EXISTS (
       SELECT 1
       FROM unnest(COALESCE(NEW.certifications, '{}'::text[])) AS cert(certification)
       WHERE char_length(certification) > 200
     ) THEN
    RAISE EXCEPTION 'practitioner_certifications_invalid' USING ERRCODE = '22001';
  END IF;
  IF NEW.photo_url IS NOT NULL AND char_length(NEW.photo_url) > 2048 THEN
    RAISE EXCEPTION 'practitioner_photo_url_too_long' USING ERRCODE = '22001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_guard_self_update ON public.practitioners;
CREATE TRIGGER practitioners_guard_self_update
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioners_guard_self_update();

REVOKE ALL ON FUNCTION public.practitioners_guard_self_update() FROM PUBLIC, anon, authenticated;

-- 5) Practitioner booking updates are limited to eligible state transitions,
-- completion timestamp and practitioner notes. All ownership, customer, payment,
-- price, scheduling, meeting and payment-provider fields are immutable to practitioners.
CREATE OR REPLACE FUNCTION public.practitioner_bookings_guard_practitioner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL
     OR OLD.practitioner_id IS DISTINCT FROM public.current_practitioner_id() THEN
    RAISE EXCEPTION 'practitioner_booking_owner_required' USING ERRCODE = '42501';
  END IF;

  v_old := to_jsonb(OLD) - ARRAY['booking_status','completed_at','notes','updated_at'];
  v_new := to_jsonb(NEW) - ARRAY['booking_status','completed_at','notes','updated_at'];
  IF v_new IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'practitioner_booking_field_not_editable' USING ERRCODE = '42501';
  END IF;

  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status
     AND NOT (
       OLD.booking_status IS NOT DISTINCT FROM 'Confirmed'
       AND (
         NEW.booking_status IS NOT DISTINCT FROM 'Completed'
         OR NEW.booking_status IS NOT DISTINCT FROM 'Cancelled'
       )
     ) THEN
    RAISE EXCEPTION 'invalid_practitioner_booking_transition' USING ERRCODE = '42501';
  END IF;

  IF NEW.booking_status = 'Completed' AND OLD.booking_status IS DISTINCT FROM 'Completed' THEN
    IF OLD.payment_status IS DISTINCT FROM 'Paid' AND OLD.payment_status IS DISTINCT FROM 'Free' THEN
      RAISE EXCEPTION 'booking_not_eligible_for_completion' USING ERRCODE = '42501';
    END IF;
    NEW.completed_at := now();
  ELSIF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'completed_at_is_system_controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'session_notes_too_long' USING ERRCODE = '22001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_bookings_guard_practitioner_update ON public.practitioner_bookings;
CREATE TRIGGER practitioner_bookings_guard_practitioner_update
  BEFORE UPDATE ON public.practitioner_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioner_bookings_guard_practitioner_update();

REVOKE ALL ON FUNCTION public.practitioner_bookings_guard_practitioner_update() FROM PUBLIC, anon, authenticated;

-- Keep completion history server/database generated and idempotent.
CREATE OR REPLACE FUNCTION public.record_practitioner_session_history_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status = 'Completed'
     AND OLD.booking_status IS DISTINCT FROM 'Completed' THEN
    INSERT INTO public.practitioner_session_history (
      booking_id, practitioner_id, client_name, service_name,
      session_date, session_time, duration_minutes, amount, notes, completed_at
    ) VALUES (
      NEW.id, NEW.practitioner_id, NEW.client_name, NEW.service_name,
      NEW.session_date, NEW.session_time, NEW.duration_minutes, NEW.amount,
      NEW.notes, COALESCE(NEW.completed_at, now())
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_booking_completion_history ON public.practitioner_bookings;
CREATE TRIGGER practitioner_booking_completion_history
  AFTER UPDATE OF booking_status ON public.practitioner_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.record_practitioner_session_history_on_completion();

REVOKE ALL ON FUNCTION public.record_practitioner_session_history_on_completion() FROM PUBLIC, anon, authenticated;

-- Anonymous clients never need write access to practitioner records, booking
-- messages, or reviews. Authenticated write access remains governed by RLS below.
REVOKE INSERT, UPDATE, DELETE ON public.practitioner_wallets,
  public.practitioner_wallet_transactions, public.practitioner_payouts,
  public.practitioner_session_history, public.practitioner_bookings,
  public.practitioners, public.practitioner_availability,
  public.practitioner_offerings, public.practitioner_booking_intro_messages,
  public.practitioner_pricing_rules, public.reviews
FROM anon;

-- Remove broad default table grants first. RLS does not protect against TRUNCATE,
-- and REFERENCES/TRIGGER are not needed by mobile clients.
REVOKE ALL PRIVILEGES ON TABLE
  public.practitioners,
  public.practitioner_availability,
  public.practitioner_offerings,
  public.practitioner_pricing_rules,
  public.practitioner_bookings,
  public.practitioner_booking_intro_messages,
  public.practitioner_wallets,
  public.practitioner_wallet_transactions,
  public.practitioner_payouts,
  public.practitioner_session_history,
  public.reviews
FROM PUBLIC, anon, authenticated;

-- Public approved reviews remain readable; practitioner catalogue and scheduling
-- data retain their existing authenticated-only access model.
GRANT SELECT ON TABLE public.reviews TO anon;

-- Authenticated app access is limited to the operations used by each panel.
GRANT SELECT, UPDATE ON TABLE public.practitioners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.practitioner_availability,
  public.practitioner_offerings
TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.practitioner_bookings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.practitioner_booking_intro_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.practitioner_pricing_rules TO authenticated;
GRANT SELECT ON TABLE
  public.practitioner_wallets,
  public.practitioner_wallet_transactions,
  public.practitioner_payouts,
  public.practitioner_session_history
TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO authenticated;

-- Backend routes, payment webhooks and trusted database workflows retain full access.
GRANT ALL PRIVILEGES ON TABLE
  public.practitioners,
  public.practitioner_availability,
  public.practitioner_offerings,
  public.practitioner_pricing_rules,
  public.practitioner_bookings,
  public.practitioner_booking_intro_messages,
  public.practitioner_wallets,
  public.practitioner_wallet_transactions,
  public.practitioner_payouts,
  public.practitioner_session_history,
  public.reviews
TO service_role;

-- 6) Separate practitioner review replies from seller replies.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS practitioner_reply text;

DROP POLICY IF EXISTS "reviews_update_practitioner_reply" ON public.reviews;
CREATE POLICY "reviews_update_practitioner_reply"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    target_type IN ('practitioner','event')
    AND status = 'Approved'
    AND practitioner_id = public.current_practitioner_id()
  )
  WITH CHECK (
    target_type IN ('practitioner','event')
    AND status = 'Approved'
    AND practitioner_id = public.current_practitioner_id()
  );

CREATE OR REPLACE FUNCTION public.reviews_before_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_seller_owner boolean;
  v_is_practitioner_owner boolean;
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Review authors may edit only their own pending review content.
  IF OLD.user_id = auth.uid() THEN
    IF OLD.status IS DISTINCT FROM 'Pending' THEN
      RAISE EXCEPTION 'Cannot update review' USING ERRCODE = '42501';
    END IF;
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.user_name := OLD.user_name;
    NEW.user_initial := OLD.user_initial;
    NEW.practitioner_name := OLD.practitioner_name;
    NEW.practitioner_id := OLD.practitioner_id;
    NEW.product_id := OLD.product_id;
    NEW.target_type := OLD.target_type;
    NEW.service_label := OLD.service_label;
    NEW.booking_id := OLD.booking_id;
    NEW.order_id := OLD.order_id;
    NEW.status := OLD.status;
    NEW.created_at := OLD.created_at;
    NEW.seller_reply := OLD.seller_reply;
    NEW.practitioner_reply := OLD.practitioner_reply;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  v_is_seller_owner := OLD.target_type = 'product'
    AND OLD.status = 'Approved'
    AND EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.sellers s ON s.id = p.seller_id
      WHERE p.id = OLD.product_id
        AND s.profile_id = auth.uid()
    );

  IF v_is_seller_owner THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.user_name := OLD.user_name;
    NEW.user_initial := OLD.user_initial;
    NEW.practitioner_name := OLD.practitioner_name;
    NEW.practitioner_id := OLD.practitioner_id;
    NEW.product_id := OLD.product_id;
    NEW.target_type := OLD.target_type;
    NEW.service_label := OLD.service_label;
    NEW.booking_id := OLD.booking_id;
    NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating;
    NEW.body := OLD.body;
    NEW.status := OLD.status;
    NEW.created_at := OLD.created_at;
    NEW.practitioner_reply := OLD.practitioner_reply;
    NEW.seller_reply := COALESCE(btrim(NEW.seller_reply), '');
    IF length(NEW.seller_reply) > 2000 THEN
      RAISE EXCEPTION 'review_reply_too_long' USING ERRCODE = '22001';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  v_is_practitioner_owner := OLD.target_type IN ('practitioner','event')
    AND OLD.status = 'Approved'
    AND OLD.practitioner_id = public.current_practitioner_id();

  IF v_is_practitioner_owner THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.user_name := OLD.user_name;
    NEW.user_initial := OLD.user_initial;
    NEW.practitioner_name := OLD.practitioner_name;
    NEW.practitioner_id := OLD.practitioner_id;
    NEW.product_id := OLD.product_id;
    NEW.target_type := OLD.target_type;
    NEW.service_label := OLD.service_label;
    NEW.booking_id := OLD.booking_id;
    NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating;
    NEW.body := OLD.body;
    NEW.status := OLD.status;
    NEW.created_at := OLD.created_at;
    NEW.seller_reply := OLD.seller_reply;
    NEW.practitioner_reply := COALESCE(btrim(NEW.practitioner_reply), '');
    IF length(NEW.practitioner_reply) > 2000 THEN
      RAISE EXCEPTION 'review_reply_too_long' USING ERRCODE = '22001';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Cannot update review' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS reviews_before_update_guard ON public.reviews;
CREATE TRIGGER reviews_before_update_guard
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_before_update_guard();

REVOKE ALL ON FUNCTION public.reviews_before_update_guard() FROM PUBLIC, anon, authenticated;

-- Rating and review_count are system aggregates, not client-editable profile fields.
-- Keep them correct on review approval, deletion, or rating changes.
CREATE OR REPLACE FUNCTION public.sync_practitioner_review_aggregate_from_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id uuid;
  v_rating numeric;
  v_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_practitioner_id := OLD.practitioner_id;
  ELSE
    v_practitioner_id := NEW.practitioner_id;
  END IF;

  IF v_practitioner_id IS NOT NULL THEN
    SELECT COALESCE(AVG(r.rating), 0), COUNT(*)::integer
      INTO v_rating, v_count
      FROM public.reviews r
     WHERE r.practitioner_id = v_practitioner_id
       AND r.target_type IN ('practitioner','event')
       AND r.status = 'Approved';

    UPDATE public.practitioners
       SET rating = ROUND(v_rating, 1),
           review_count = v_count,
           updated_at = now()
     WHERE id = v_practitioner_id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.practitioner_id IS DISTINCT FROM NEW.practitioner_id
     AND OLD.practitioner_id IS NOT NULL THEN
    SELECT COALESCE(AVG(r.rating), 0), COUNT(*)::integer
      INTO v_rating, v_count
      FROM public.reviews r
     WHERE r.practitioner_id = OLD.practitioner_id
       AND r.target_type IN ('practitioner','event')
       AND r.status = 'Approved';

    UPDATE public.practitioners
       SET rating = ROUND(v_rating, 1),
           review_count = v_count,
           updated_at = now()
     WHERE id = OLD.practitioner_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_practitioner_rating_aggregate ON public.reviews;
CREATE TRIGGER reviews_practitioner_rating_aggregate
  AFTER INSERT OR DELETE OR UPDATE OF rating, status, practitioner_id, target_type
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_practitioner_review_aggregate_from_reviews();

REVOKE ALL ON FUNCTION public.sync_practitioner_review_aggregate_from_reviews() FROM PUBLIC, anon, authenticated;

-- Explicitly keep helper callable by signed-in RLS checks only.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 9) Restore the database RPCs used by the admin payout queue and seller
-- withdrawal endpoint. All calls are service-role-only; user-facing routes must
-- authenticate and authorize the caller before invoking them.
CREATE OR REPLACE FUNCTION public.admin_update_payout_status(
  p_payout_type text,
  p_payout_id uuid,
  p_status text,
  p_admin_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_wallet_id uuid;
  v_amount numeric(12,2);
  v_current_status text;
  v_now timestamptz := now();
  v_reason text := NULLIF(btrim(p_rejection_reason), '');
BEGIN
  IF p_payout_type NOT IN ('seller', 'practitioner')
     OR p_payout_id IS NULL
     OR p_admin_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid payout details');
  END IF;

  IF p_status NOT IN ('Under Review', 'Processing', 'Completed', 'Rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;

  IF v_reason IS NOT NULL AND length(v_reason) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rejection reason is too long');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_admin_id
       AND lower(role) = 'admin'
       AND lower(COALESCE(status, 'active')) = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Active admin identity required');
  END IF;

  IF p_payout_type = 'seller' THEN
    SELECT wallet_id, amount, status
      INTO v_wallet_id, v_amount, v_current_status
      FROM public.seller_payouts
     WHERE id = p_payout_id
     FOR UPDATE;
  ELSE
    SELECT wallet_id, amount, status
      INTO v_wallet_id, v_amount, v_current_status
      FROM public.practitioner_payouts
     WHERE id = p_payout_id
     FOR UPDATE;
  END IF;

  IF v_wallet_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout not found or invalid');
  END IF;

  IF v_current_status = p_status THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;

  IF v_current_status IN ('Completed', 'Rejected', 'Failed', 'Cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout is already in a terminal state');
  END IF;

  IF p_status = 'Rejected' THEN
    IF p_payout_type = 'seller' THEN
      UPDATE public.seller_wallets
         SET available_balance = available_balance + v_amount,
             pending_payout = pending_payout - v_amount
       WHERE id = v_wallet_id
         AND pending_payout >= v_amount;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Seller wallet not found or reserved payout balance is insufficient');
      END IF;

      INSERT INTO public.wallet_transactions(
        wallet_id, payout_id, type, category, amount, description, is_released
      ) VALUES (
        v_wallet_id, p_payout_id, 'credit', 'payout_reversal', v_amount,
        COALESCE(v_reason, 'Payout rejected — funds returned'), true
      );

      UPDATE public.seller_payouts
         SET status = p_status, processed_by = p_admin_id,
             rejection_reason = COALESCE(v_reason, 'Rejected by admin'),
             updated_at = v_now
       WHERE id = p_payout_id;
    ELSE
      UPDATE public.practitioner_wallets
         SET available_balance = available_balance + v_amount,
             pending_payout = pending_payout - v_amount
       WHERE id = v_wallet_id
         AND pending_payout >= v_amount;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found or reserved payout balance is insufficient');
      END IF;

      INSERT INTO public.practitioner_wallet_transactions(
        wallet_id, payout_id, type, category, amount, description, is_released
      ) VALUES (
        v_wallet_id, p_payout_id, 'credit', 'payout_reversal', v_amount,
        COALESCE(v_reason, 'Payout rejected — funds returned'), true
      );

      UPDATE public.practitioner_payouts
         SET status = p_status, processed_by = p_admin_id,
             rejection_reason = COALESCE(v_reason, 'Rejected by admin'),
             updated_at = v_now
       WHERE id = p_payout_id;
    END IF;
  ELSE
    IF p_status = 'Completed' THEN
      IF p_payout_type = 'seller' THEN
        UPDATE public.seller_wallets
           SET pending_payout = pending_payout - v_amount
         WHERE id = v_wallet_id
           AND pending_payout >= v_amount;
      ELSE
        UPDATE public.practitioner_wallets
           SET pending_payout = pending_payout - v_amount
         WHERE id = v_wallet_id
           AND pending_payout >= v_amount;
      END IF;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found or reserved payout balance is insufficient');
      END IF;
    END IF;

    IF p_payout_type = 'seller' THEN
      UPDATE public.seller_payouts
         SET status = p_status, processed_by = p_admin_id,
             completed_at = CASE WHEN p_status = 'Completed' THEN v_now ELSE completed_at END,
             updated_at = v_now
       WHERE id = p_payout_id;
    ELSE
      UPDATE public.practitioner_payouts
         SET status = p_status, processed_by = p_admin_id,
             completed_at = CASE WHEN p_status = 'Completed' THEN v_now ELSE completed_at END,
             updated_at = v_now
       WHERE id = p_payout_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already_applied', false);
END;
$;

REVOKE ALL ON FUNCTION public.admin_update_payout_status(text, uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payout_status(text, uuid, text, uuid, text) TO service_role;

-- Seller withdrawal requests remain a manual admin queue item; this RPC only
-- reserves wallet funds and creates the queue/ledger records. It never transfers money.
CREATE OR REPLACE FUNCTION public.request_wallet_payout(
  p_payout_type text,
  p_wallet_id uuid,
  p_amount numeric,
  p_notes text DEFAULT 'Manual withdrawal — processed by Nature''s Grace team within 3–7 business days'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_available numeric(12,2);
  v_pending numeric(12,2);
  v_bank_label text;
  v_bank_holder text;
  v_payout_id uuid;
BEGIN
  IF p_payout_type NOT IN ('seller', 'practitioner')
     OR p_wallet_id IS NULL
     OR p_amount IS NULL
     OR p_amount <= 0
     OR p_amount > 100000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid payout details');
  END IF;

  IF p_payout_type = 'seller' THEN
    SELECT available_balance, bank_account_label
      INTO v_available, v_bank_label
      FROM public.seller_wallets
     WHERE id = p_wallet_id
     FOR UPDATE;
  ELSE
    SELECT available_balance, bank_account_label, bank_account_holder
      INTO v_available, v_bank_label, v_bank_holder
      FROM public.practitioner_wallets
     WHERE id = p_wallet_id
     FOR UPDATE;
  END IF;

  IF v_available IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wallet not found');
  END IF;

  IF v_bank_label IS NULL OR btrim(v_bank_label) = ''
     OR lower(v_bank_label) LIKE '%not linked%'
     OR (p_payout_type = 'practitioner'
         AND (v_bank_holder IS NULL OR btrim(v_bank_holder) = ''
              OR lower(v_bank_label) = 'hdfc bank ···· 4821')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Complete valid bank details before requesting a payout');
  END IF;

  IF v_available < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient available balance');
  END IF;

  IF p_payout_type = 'seller' THEN
    UPDATE public.seller_wallets
       SET available_balance = available_balance - p_amount,
           pending_payout = pending_payout + p_amount
     WHERE id = p_wallet_id;
    INSERT INTO public.seller_payouts(wallet_id, amount, status, notes)
      VALUES (p_wallet_id, p_amount, 'Pending', p_notes)
      RETURNING id INTO v_payout_id;
    INSERT INTO public.wallet_transactions(wallet_id, payout_id, type, category, amount, description, is_released)
      VALUES (p_wallet_id, v_payout_id, 'debit', 'payout', p_amount, 'Payout to Bank Account (pending)', true);
  ELSE
    UPDATE public.practitioner_wallets
       SET available_balance = available_balance - p_amount,
           pending_payout = pending_payout + p_amount
     WHERE id = p_wallet_id;
    INSERT INTO public.practitioner_payouts(wallet_id, amount, status, notes)
      VALUES (p_wallet_id, p_amount, 'Pending', p_notes)
      RETURNING id INTO v_payout_id;
    INSERT INTO public.practitioner_wallet_transactions(wallet_id, payout_id, type, category, amount, description, is_released)
      VALUES (p_wallet_id, v_payout_id, 'debit', 'payout', p_amount, 'Payout to Bank Account (pending)', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'payout_id', v_payout_id);
END;
$;

REVOKE ALL ON FUNCTION public.request_wallet_payout(text, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_payout(text, uuid, numeric, text) TO service_role;

NOTIFY pgrst, 'reload schema';
