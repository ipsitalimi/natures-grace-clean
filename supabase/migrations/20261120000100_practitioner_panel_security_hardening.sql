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

-- These SECURITY DEFINER entry points are internal helpers. Their trusted
-- callers (admin approval and self-provisioning) execute as the function owner.
-- Do not expose them as direct PostgREST RPCs to anonymous or signed-in clients.
REVOKE ALL ON FUNCTION public.apply_practitioner_application(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_practitioner_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.guard_practitioner_offering_pricing() FROM PUBLIC, anon, authenticated;

-- 2) Wallets are readable by their owner but never directly writable by app clients.
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
  IF pg_trigger_depth() > 1 THEN
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
       OLD.booking_status = 'Confirmed'
       AND NEW.booking_status IN ('Completed','Cancelled')
     ) THEN
    RAISE EXCEPTION 'invalid_practitioner_booking_transition' USING ERRCODE = '42501';
  END IF;

  IF NEW.booking_status = 'Completed' AND OLD.booking_status IS DISTINCT FROM 'Completed' THEN
    IF OLD.payment_status NOT IN ('Paid','Free') THEN
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
    IF OLD.status <> 'Pending' THEN
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
AS $
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
$;

DROP TRIGGER IF EXISTS reviews_practitioner_rating_aggregate ON public.reviews;
CREATE TRIGGER reviews_practitioner_rating_aggregate
  AFTER INSERT OR DELETE OR UPDATE OF rating, status, practitioner_id, target_type
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_practitioner_review_aggregate_from_reviews();

REVOKE ALL ON FUNCTION public.sync_practitioner_review_aggregate_from_reviews() FROM PUBLIC, anon, authenticated;

-- Explicitly keep helper callable by signed-in RLS checks only.
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
