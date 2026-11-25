-- Chunk 1: practitioner experience category and fixed practitioner-session commission.
-- Seller order commission, checkout fees/GST, Razorpay verification and notifications are untouched.

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS experience_category TEXT;

ALTER TABLE public.practitioners
  DROP CONSTRAINT IF EXISTS practitioners_experience_category_check;

ALTER TABLE public.practitioners
  ADD CONSTRAINT practitioners_experience_category_check
  CHECK (
    experience_category IS NULL OR
    experience_category IN ('0–5 years', '5–10 years', '10+ years')
  );

-- Keep the existing free-text experience field intact. New category is separate.
CREATE OR REPLACE FUNCTION public.apply_practitioner_application(p_user_id UUID, p_form JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_practitioner_id UUID;
  v_category TEXT;
  v_experience_category TEXT;
  v_subs TEXT[];
  v_merged JSONB;
  v_primary_sub TEXT;
BEGIN
  v_category := COALESCE(NULLIF(trim(p_form->>'category'), ''), 'Healings');
  v_experience_category := NULLIF(trim(p_form->>'experienceCategory'), '');
  IF v_experience_category IS NOT NULL AND v_experience_category NOT IN ('0–5 years', '5–10 years', '10+ years') THEN
    RAISE EXCEPTION 'Invalid practitioner experience category';
  END IF;

  v_subs := public.parse_practitioner_subcategories_from_form(p_form);
  v_primary_sub := COALESCE(v_subs[1], '');

  SELECT id INTO v_practitioner_id
  FROM public.practitioners
  WHERE profile_id = p_user_id
  LIMIT 1;

  IF v_practitioner_id IS NULL THEN
    INSERT INTO public.practitioners (
      profile_id, name, category, subcategory, bio, experience, experience_category,
      certifications, rating, review_count, price_per_session, approval_status,
      is_verified, featured, is_active, specialties
    ) VALUES (
      p_user_id,
      COALESCE(NULLIF(trim(p_form->>'fullName'), ''), 'Practitioner'),
      v_category,
      v_primary_sub,
      COALESCE(p_form->>'bio', ''),
      COALESCE(p_form->>'experience', ''),
      v_experience_category,
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
      experience_category = COALESCE(v_experience_category, experience_category),
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

  INSERT INTO public.practitioner_wallets (practitioner_id, commission_rate)
  SELECT v_practitioner_id, 30
  WHERE NOT EXISTS (
    SELECT 1 FROM public.practitioner_wallets pw WHERE pw.practitioner_id = v_practitioner_id
  );

  RETURN v_practitioner_id;
END;
$function$;

-- Enforce 30% platform / 70% practitioner for paid practitioner sessions,
-- irrespective of any legacy per-wallet commission_rate.
CREATE OR REPLACE FUNCTION public.fulfill_paid_booking_checkout(
  p_user_id UUID,
  p_razorpay_order_id TEXT,
  p_payment_id TEXT,
  p_commission_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_draft JSONB;
  v_existing RECORD;
  v_booking RECORD;
  v_wallet RECORD;
  v_net NUMERIC(12,2);
  v_gross NUMERIC(12,2);
  v_commission NUMERIC(5,2) := 30;
  v_booking_number TEXT;
BEGIN
  IF p_user_id IS NULL OR p_razorpay_order_id IS NULL OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid fulfillment inputs');
  END IF;

  SELECT * INTO v_pending
    FROM public.pending_booking_checkouts
   WHERE razorpay_order_id = p_razorpay_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pending checkout not found');
  END IF;
  IF v_pending.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Checkout does not belong to this account');
  END IF;

  IF v_pending.fulfilled_at IS NOT NULL AND v_pending.booking_id IS NOT NULL THEN
    SELECT id, booking_number INTO v_existing
      FROM public.practitioner_bookings WHERE id = v_pending.booking_id;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'booking_id', v_existing.id,
        'booking_number', v_existing.booking_number, 'already_paid', true);
    END IF;
  END IF;

  SELECT id, booking_number INTO v_existing
    FROM public.practitioner_bookings WHERE razorpay_payment_id = p_payment_id;
  IF FOUND THEN
    UPDATE public.pending_booking_checkouts
       SET fulfilled_at = COALESCE(fulfilled_at, NOW()), booking_id = v_existing.id
     WHERE razorpay_order_id = p_razorpay_order_id;
    RETURN jsonb_build_object('ok', true, 'booking_id', v_existing.id,
      'booking_number', v_existing.booking_number, 'already_paid', true);
  END IF;

  v_draft := v_pending.booking_draft;
  IF v_draft IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking draft missing');
  END IF;

  v_gross := ROUND((v_draft->>'amountInr')::NUMERIC, 2);
  IF v_gross <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid booking amount');
  END IF;

  v_booking_number := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO public.practitioner_bookings (
    booking_number, practitioner_id, offering_id, user_id, client_name, client_email,
    service_name, session_date, session_time, duration_minutes, amount,
    platform_fee_inr, platform_gst_inr, total_paid_amount_inr,
    booking_status, payment_status, razorpay_payment_id, notes
  ) VALUES (
    v_booking_number,
    (v_draft->>'practitionerId')::UUID,
    NULLIF(v_draft->>'offeringId', '')::UUID,
    p_user_id,
    COALESCE(v_draft->>'clientName', ''),
    NULLIF(v_draft->>'clientEmail', ''),
    COALESCE(v_draft->>'serviceName', ''),
    COALESCE(v_draft->>'sessionDate', ''),
    COALESCE(v_draft->>'sessionTime', ''),
    COALESCE((v_draft->>'durationMinutes')::INT, 60),
    v_gross,
    COALESCE((v_draft->'feeBreakdown'->>'platformFeeInr')::NUMERIC, 0),
    COALESCE((v_draft->'feeBreakdown'->>'platformGstInr')::NUMERIC, 0),
    COALESCE((v_draft->'feeBreakdown'->>'totalInr')::NUMERIC, v_gross),
    'Confirmed', 'Paid', p_payment_id, NULLIF(v_draft->>'notes', '')
  )
  RETURNING id, booking_number, practitioner_id, amount, service_name INTO v_booking;

  SELECT * INTO v_wallet
    FROM public.practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.practitioner_wallets (practitioner_id, commission_rate, bank_account_label, next_payout_date)
    VALUES (v_booking.practitioner_id, 30, NULL, NULL)
    RETURNING * INTO v_wallet;
  ELSE
    UPDATE public.practitioner_wallets
       SET commission_rate = 30
     WHERE id = v_wallet.id;
  END IF;

  v_net := ROUND(v_gross * 0.70, 2);

  INSERT INTO public.practitioner_wallet_transactions (
    wallet_id, booking_id, type, category, amount, description, is_released
  ) VALUES (
    v_wallet.id, v_booking.id, 'credit', 'booking_earning', v_net,
    'Session ' || v_booking.booking_number || ' — ' || v_booking.service_name, false
  );

  UPDATE public.practitioner_wallets
     SET total_earned = total_earned + v_net,
         held_balance = held_balance + v_net
   WHERE id = v_wallet.id;

  UPDATE public.pending_booking_checkouts
     SET fulfilled_at = NOW(), booking_id = v_booking.id
   WHERE razorpay_order_id = p_razorpay_order_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking.id,
    'booking_number', v_booking.booking_number, 'already_paid', false);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'Payment fulfillment already in progress; retry');
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.credit_practitioner_booking_earning(
  p_booking_id UUID,
  p_commission_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_wallet RECORD;
  v_net NUMERIC(12,2);
BEGIN
  IF p_booking_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid earning inputs');
  END IF;

  SELECT id, booking_number, practitioner_id, payment_status, booking_status,
         amount, service_name, razorpay_payment_id
    INTO v_booking
    FROM practitioner_bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND OR v_booking.payment_status <> 'Paid'
     OR v_booking.practitioner_id IS NULL
     OR v_booking.razorpay_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Verified paid booking not found');
  END IF;

  INSERT INTO practitioner_wallets(practitioner_id, commission_rate, bank_account_label, next_payout_date)
  VALUES(v_booking.practitioner_id, 30, NULL, NULL)
  ON CONFLICT (practitioner_id) DO NOTHING;

  SELECT * INTO v_wallet FROM practitioner_wallets
   WHERE practitioner_id = v_booking.practitioner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Practitioner wallet not found');
  END IF;

  IF EXISTS(SELECT 1 FROM practitioner_wallet_transactions
    WHERE wallet_id=v_wallet.id AND booking_id=p_booking_id AND category='booking_earning') THEN
    RETURN jsonb_build_object('ok', true, 'already_credited', true);
  END IF;

  v_net := ROUND(v_booking.amount * 0.70, 2);

  INSERT INTO practitioner_wallet_transactions(
    wallet_id, booking_id, type, category, amount, description, is_released
  ) VALUES (
    v_wallet.id, v_booking.id, 'credit', 'booking_earning', v_net,
    'Session ' || v_booking.booking_number || ' — ' || v_booking.service_name, false
  );

  UPDATE practitioner_wallets
     SET commission_rate = 30,
         total_earned = total_earned + v_net,
         held_balance = held_balance + v_net
   WHERE id=v_wallet.id;

  RETURN jsonb_build_object('ok',true,'already_credited',false,'amount',v_net);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',true,'already_credited',true);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_practitioner_booking_earning(UUID, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
