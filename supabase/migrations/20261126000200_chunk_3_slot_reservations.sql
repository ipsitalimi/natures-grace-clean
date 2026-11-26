-- Chunk 3 completion: slot reservations and one shared booking-slot guard.
-- All booking writes serialize by practitioner/date. Payment gateway calls remain in API code.

CREATE TABLE IF NOT EXISTS public.practitioner_slot_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  practitioner_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  session_date text NOT NULL,
  session_time text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  razorpay_order_id text UNIQUE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS practitioner_slot_reservations_active_idx
  ON public.practitioner_slot_reservations(practitioner_id, session_date, expires_at)
  WHERE status = 'reserved';

ALTER TABLE public.pending_booking_checkouts
  ADD COLUMN IF NOT EXISTS slot_reservation_id uuid REFERENCES public.practitioner_slot_reservations(id);

CREATE TABLE IF NOT EXISTS public.booking_payment_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text NOT NULL UNIQUE,
  practitioner_id uuid,
  offering_id uuid,
  session_date text,
  session_time text,
  duration_minutes integer,
  amount_paise bigint,
  currency text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'needs_admin_review' CHECK (status IN ('needs_admin_review','resolved_booking_created','resolved_refund','resolved_other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  admin_notes text
);

CREATE OR REPLACE FUNCTION public.ng_time_minutes(p_text text)
RETURNS integer LANGUAGE plpgsql IMMUTABLE STRICT AS $fn$
DECLARE v_time time;
BEGIN
  IF btrim(p_text) ~* '^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$' THEN
    v_time := to_timestamp(upper(btrim(p_text)), 'HH12:MI AM')::time;
  ELSIF btrim(p_text) ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
    v_time := btrim(p_text)::time;
  ELSE
    RAISE EXCEPTION 'Invalid session time';
  END IF;
  RETURN extract(hour from v_time)::integer * 60 + extract(minute from v_time)::integer;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.ng_booking_slot_is_available(
  p_practitioner_id uuid,
  p_offering_id uuid,
  p_date text,
  p_time text,
  p_duration integer,
  p_exclude_booking_id uuid DEFAULT NULL,
  p_exclude_reservation_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_start integer;
  v_end integer;
  v_date date;
  v_has_rows boolean;
  v_always boolean;
  v_available boolean := false;
  v_row record;
  v_window_start integer;
  v_window_end integer;
BEGIN
  IF p_practitioner_id IS NULL OR p_offering_id IS NULL OR p_duration <= 0 THEN RETURN false; END IF;
  BEGIN
    v_date := btrim(p_date)::date;
    v_start := public.ng_time_minutes(p_time);
  EXCEPTION WHEN OTHERS THEN RETURN false;
  END;
  v_end := v_start + p_duration;
  IF v_date < current_date OR v_end > 1440 THEN RETURN false; END IF;

  SELECT EXISTS(SELECT 1 FROM public.practitioner_availability WHERE offering_id=p_offering_id)
    INTO v_has_rows;

  IF NOT v_has_rows THEN
    -- Match the app's documented fallback when no availability rows exist.
    v_available := v_start >= 540 AND v_end <= 1020;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.practitioner_availability
       WHERE offering_id=p_offering_id
         AND (COALESCE(metadata->>'alwaysAvailable','false')='true'
              OR (specific_date IS NULL AND is_available=true))
    ) INTO v_always;

    IF v_always THEN
      FOR v_row IN
        SELECT start_time,end_time FROM public.practitioner_availability
         WHERE offering_id=p_offering_id AND specific_date IS NULL AND is_available=true
      LOOP
        v_window_start := public.ng_time_minutes(v_row.start_time);
        v_window_end := public.ng_time_minutes(v_row.end_time);
        IF v_start >= v_window_start AND v_end <= v_window_end THEN v_available := true; EXIT; END IF;
      END LOOP;
      IF NOT v_available AND NOT EXISTS(
        SELECT 1 FROM public.practitioner_availability
         WHERE offering_id=p_offering_id AND specific_date IS NULL AND is_available=true
      ) THEN
        v_available := v_start >= 540 AND v_end <= 1020;
      END IF;
    ELSE
      FOR v_row IN
        SELECT start_time,end_time FROM public.practitioner_availability
         WHERE offering_id=p_offering_id AND specific_date=p_date AND is_available=true
      LOOP
        v_window_start := public.ng_time_minutes(v_row.start_time);
        v_window_end := public.ng_time_minutes(v_row.end_time);
        IF v_start >= v_window_start AND v_end <= v_window_end THEN v_available := true; EXIT; END IF;
      END LOOP;
    END IF;
  END IF;

  IF NOT v_available THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.practitioner_bookings b
     WHERE b.practitioner_id=p_practitioner_id
       AND b.session_date=p_date
       AND b.booking_status IN ('Pending','Confirmed')
       AND (p_exclude_booking_id IS NULL OR b.id<>p_exclude_booking_id)
       AND v_start < public.ng_time_minutes(b.session_time)+b.duration_minutes
       AND public.ng_time_minutes(b.session_time) < v_end
  ) THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.practitioner_slot_reservations r
     WHERE r.practitioner_id=p_practitioner_id
       AND r.session_date=p_date
       AND r.status='reserved' AND r.expires_at>now()
       AND (p_exclude_reservation_id IS NULL OR r.id<>p_exclude_reservation_id)
       AND v_start < public.ng_time_minutes(r.session_time)+r.duration_minutes
       AND public.ng_time_minutes(r.session_time) < v_end
  ) THEN RETURN false; END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_practitioner_slot(
  p_user_id uuid, p_practitioner_id uuid, p_offering_id uuid,
  p_session_date text, p_session_time text, p_duration_minutes integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_offering record; v_date date;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','User is required'); END IF;
  SELECT practitioner_id,duration_minutes,price,is_active INTO v_offering
    FROM public.practitioner_offerings WHERE id=p_offering_id;
  IF NOT FOUND OR v_offering.practitioner_id<>p_practitioner_id OR NOT v_offering.is_active
     OR v_offering.duration_minutes<>p_duration_minutes OR v_offering.price<=0 THEN
    RETURN jsonb_build_object('ok',false,'error','Selected paid offering is unavailable');
  END IF;
  BEGIN v_date:=btrim(p_session_date)::date; PERFORM public.ng_time_minutes(p_session_time);
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'error','Invalid date or time'); END;
  PERFORM pg_advisory_xact_lock(hashtext(p_practitioner_id::text),hashtext(v_date::text));
  UPDATE public.practitioner_slot_reservations SET status='expired',updated_at=now()
   WHERE practitioner_id=p_practitioner_id AND session_date=p_session_date
     AND status='reserved' AND expires_at<=now();
  IF NOT public.ng_booking_slot_is_available(p_practitioner_id,p_offering_id,p_session_date,p_session_time,p_duration_minutes) THEN
    RETURN jsonb_build_object('ok',false,'error','This session slot is no longer available');
  END IF;
  INSERT INTO public.practitioner_slot_reservations(user_id,practitioner_id,offering_id,session_date,session_time,duration_minutes)
  VALUES(p_user_id,p_practitioner_id,p_offering_id,p_session_date,btrim(p_session_time),p_duration_minutes)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'reservation_id',v_id,'expires_at',now()+interval '10 minutes');
END $$;

CREATE OR REPLACE FUNCTION public.attach_practitioner_slot_reservation(
  p_user_id uuid,p_reservation_id uuid,p_razorpay_order_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.practitioner_slot_reservations SET razorpay_order_id=p_razorpay_order_id,updated_at=now()
   WHERE id=p_reservation_id AND user_id=p_user_id AND status='reserved' AND expires_at>now();
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.release_practitioner_slot_reservation(p_user_id uuid,p_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.practitioner_slot_reservations SET status='released',updated_at=now()
   WHERE id=p_reservation_id AND user_id=p_user_id AND status='reserved';
  RETURN FOUND;
END $$;

-- Replace the paid fulfillment function with a guarded, idempotent version.
CREATE OR REPLACE FUNCTION public.fulfill_paid_booking_checkout(
 p_user_id uuid,p_razorpay_order_id text,p_payment_id text,p_commission_rate numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_pending record; v_draft jsonb; v_existing record; v_booking record; v_wallet record;
 v_gross numeric(12,2); v_net numeric(12,2); v_commission numeric(5,2);
 v_booking_number text; v_reservation record; v_practitioner uuid; v_offering uuid;
 v_date text; v_time text; v_duration integer; v_conflict boolean := false;
BEGIN
 IF p_user_id IS NULL OR p_razorpay_order_id IS NULL OR p_payment_id IS NULL
    OR p_commission_rate IS NULL OR p_commission_rate<0 OR p_commission_rate>100 THEN
   RETURN jsonb_build_object('ok',false,'error','Invalid fulfillment inputs');
 END IF;
 SELECT * INTO v_pending FROM public.pending_booking_checkouts
  WHERE razorpay_order_id=p_razorpay_order_id FOR UPDATE;
 IF NOT FOUND OR v_pending.user_id<>p_user_id THEN
   RETURN jsonb_build_object('ok',false,'error','Pending checkout not found for this account');
 END IF;
 IF v_pending.fulfilled_at IS NOT NULL AND v_pending.booking_id IS NOT NULL THEN
   SELECT id,booking_number INTO v_existing FROM public.practitioner_bookings WHERE id=v_pending.booking_id;
   IF FOUND THEN RETURN jsonb_build_object('ok',true,'booking_id',v_existing.id,'booking_number',v_existing.booking_number,'already_paid',true); END IF;
 END IF;
 SELECT id,booking_number INTO v_existing FROM public.practitioner_bookings WHERE razorpay_payment_id=p_payment_id;
 IF FOUND THEN
   UPDATE public.pending_booking_checkouts SET fulfilled_at=coalesce(fulfilled_at,now()),booking_id=v_existing.id WHERE razorpay_order_id=p_razorpay_order_id;
   RETURN jsonb_build_object('ok',true,'booking_id',v_existing.id,'booking_number',v_existing.booking_number,'already_paid',true);
 END IF;
 v_draft:=v_pending.booking_draft;
 IF v_draft IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Booking draft missing'); END IF;
 v_practitioner:=nullif(v_draft->>'practitionerId','')::uuid;
 v_offering:=nullif(v_draft->>'offeringId','')::uuid;
 v_date:=v_draft->>'sessionDate'; v_time:=v_draft->>'sessionTime';
 v_duration:=coalesce(nullif(v_draft->>'durationMinutes','')::integer,60);
 v_gross:=round((v_draft->>'amountInr')::numeric,2);
 IF v_practitioner IS NULL OR v_offering IS NULL OR v_gross<=0 OR v_duration<=0 THEN
   RETURN jsonb_build_object('ok',false,'error','Invalid saved booking draft');
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext(v_practitioner::text),hashtext(v_date));
 SELECT * INTO v_reservation FROM public.practitioner_slot_reservations
  WHERE razorpay_order_id=p_razorpay_order_id AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR v_reservation.status NOT IN ('reserved','expired') THEN
   v_conflict:=true;
 ELSIF NOT public.ng_booking_slot_is_available(v_practitioner,v_offering,v_date,v_time,v_duration,NULL,
       CASE WHEN v_reservation.status='reserved' THEN v_reservation.id ELSE NULL END) THEN
   v_conflict:=true;
 END IF;
 IF v_conflict THEN
   INSERT INTO public.booking_payment_reconciliation(user_id,razorpay_order_id,razorpay_payment_id,
     practitioner_id,offering_id,session_date,session_time,duration_minutes,reason)
   VALUES(p_user_id,p_razorpay_order_id,p_payment_id,v_practitioner,v_offering,v_date,v_time,v_duration,
     'Payment captured but reserved session slot could not be confirmed')
   ON CONFLICT (razorpay_order_id) DO UPDATE SET razorpay_payment_id=excluded.razorpay_payment_id;
   RETURN jsonb_build_object('ok',false,'error','Payment received; booking needs admin reconciliation. Please contact support.');
 END IF;
 SELECT practitioner_id,duration_minutes,price,is_active INTO v_booking
   FROM public.practitioner_offerings WHERE id=v_offering;
 IF NOT FOUND OR v_booking.practitioner_id<>v_practitioner OR NOT v_booking.is_active
    OR v_booking.duration_minutes<>v_duration OR v_booking.price<>v_gross THEN
   INSERT INTO public.booking_payment_reconciliation(user_id,razorpay_order_id,razorpay_payment_id,
     practitioner_id,offering_id,session_date,session_time,duration_minutes,reason)
   VALUES(p_user_id,p_razorpay_order_id,p_payment_id,v_practitioner,v_offering,v_date,v_time,v_duration,
     'Payment captured but offering validation failed')
   ON CONFLICT (razorpay_order_id) DO NOTHING;
   RETURN jsonb_build_object('ok',false,'error','Payment received; booking needs admin reconciliation. Please contact support.');
 END IF;
 v_booking_number:='BK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 INSERT INTO public.practitioner_bookings(
  booking_number,practitioner_id,offering_id,user_id,client_name,client_email,service_name,
  session_date,session_time,duration_minutes,amount,platform_fee_inr,platform_gst_inr,total_paid_amount_inr,
  booking_status,payment_status,razorpay_payment_id,notes
 ) VALUES(v_booking_number,v_practitioner,v_offering,p_user_id,coalesce(v_draft->>'clientName',''),
  nullif(v_draft->>'clientEmail',''),coalesce(v_draft->>'serviceName',''),v_date,v_time,v_duration,v_gross,
  coalesce((v_draft->'feeBreakdown'->>'platformFeeInr')::numeric,0),
  coalesce((v_draft->'feeBreakdown'->>'platformGstInr')::numeric,0),
  coalesce((v_draft->'feeBreakdown'->>'totalInr')::numeric,v_gross),
  'Confirmed','Paid',p_payment_id,nullif(v_draft->>'notes',''))
 RETURNING id,booking_number,practitioner_id,booking_status,payment_status,amount,service_name INTO v_booking;
 SELECT * INTO v_wallet FROM public.practitioner_wallets WHERE practitioner_id=v_booking.practitioner_id FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO public.practitioner_wallets(practitioner_id,commission_rate,bank_account_label,next_payout_date)
  VALUES(v_booking.practitioner_id,p_commission_rate,NULL,NULL) RETURNING * INTO v_wallet;
 END IF;
 v_commission:=coalesce(v_wallet.commission_rate,p_commission_rate);
 v_net:=round(v_gross*(1-v_commission/100),2);
 INSERT INTO public.practitioner_wallet_transactions(wallet_id,booking_id,type,category,amount,description,is_released)
 VALUES(v_wallet.id,v_booking.id,'credit','booking_earning',v_net,
  'Session '||v_booking.booking_number||' — '||v_booking.service_name,false);
 UPDATE public.practitioner_wallets SET total_earned=total_earned+v_net,held_balance=held_balance+v_net WHERE id=v_wallet.id;
 UPDATE public.pending_booking_checkouts SET fulfilled_at=now(),booking_id=v_booking.id WHERE razorpay_order_id=p_razorpay_order_id;
 UPDATE public.practitioner_slot_reservations SET status='consumed',updated_at=now()
  WHERE id=v_reservation.id;
 RETURN jsonb_build_object('ok',true,'booking_id',v_booking.id,'booking_number',v_booking.booking_number,'already_paid',false);
EXCEPTION WHEN unique_violation THEN
 RETURN jsonb_build_object('ok',false,'error','Payment fulfillment already in progress; retry');
END $$;

-- Free booking creation uses the same overlap and availability guard.
CREATE OR REPLACE FUNCTION public.create_free_practitioner_booking(p_user_id uuid,p_booking jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_prac uuid; v_off uuid; v_date text; v_time text; v_duration integer;
 v_offering record; v_id uuid; v_number text; v_date_value date;
BEGIN
 v_prac:=nullif(p_booking->>'practitionerId','')::uuid;
 v_off:=nullif(p_booking->>'offeringId','')::uuid;
 v_date:=p_booking->>'sessionDate'; v_time:=p_booking->>'sessionTime';
 v_duration:=nullif(p_booking->>'durationMinutes','')::integer;
 IF p_user_id IS NULL OR v_prac IS NULL OR v_off IS NULL OR v_duration IS NULL OR v_duration<=0 THEN
  RETURN jsonb_build_object('ok',false,'error','Valid booking details are required');
 END IF;
 SELECT practitioner_id,duration_minutes,price,is_active,session_type INTO v_offering
  FROM public.practitioner_offerings WHERE id=v_off;
 IF NOT FOUND OR v_offering.practitioner_id<>v_prac OR NOT v_offering.is_active
    OR v_offering.price<>0 OR v_offering.duration_minutes<>v_duration THEN
  RETURN jsonb_build_object('ok',false,'error','Selected offering is not an active free offering');
 END IF;
 v_date_value:=btrim(v_date)::date;
 PERFORM pg_advisory_xact_lock(hashtext(v_prac::text),hashtext(v_date_value::text));
 IF NOT public.ng_booking_slot_is_available(v_prac,v_off,v_date,v_time,v_duration) THEN
  RETURN jsonb_build_object('ok',false,'error','This session slot is unavailable or already booked');
 END IF;
 v_number:='BK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 INSERT INTO public.practitioner_bookings(booking_number,practitioner_id,offering_id,user_id,client_name,
  client_email,service_name,session_date,session_time,duration_minutes,amount,booking_status,payment_status,notes)
 VALUES(v_number,v_prac,v_off,p_user_id,coalesce(nullif(p_booking->>'clientName',''),'Guest'),
  nullif(p_booking->>'clientEmail',''),coalesce(nullif(p_booking->>'serviceName',''),v_offering.session_type),
  v_date,v_time,v_duration,0,'Confirmed','Free',nullif(p_booking->>'notes',''))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'booking_id',v_id,'booking_number',v_number);
EXCEPTION WHEN OTHERS THEN
 RETURN jsonb_build_object('ok',false,'error','Could not confirm free booking: '||SQLERRM);
END $$;

-- Rescheduling now locks the practitioner's target day and checks availability and interval overlap.
CREATE OR REPLACE FUNCTION public.reschedule_user_practitioner_booking(
 p_booking_id uuid,p_user_id uuid,p_new_session_date text,p_new_session_time text,p_deadline_hours integer DEFAULT 24
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_booking record; v_old_start timestamptz; v_date date;
BEGIN
 SELECT * INTO v_booking FROM public.practitioner_bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND OR v_booking.user_id<>p_user_id THEN RETURN jsonb_build_object('ok',false,'error','Booking not found'); END IF;
 IF v_booking.booking_status NOT IN ('Pending','Confirmed') THEN RETURN jsonb_build_object('ok',false,'error','Only upcoming bookings can be rescheduled'); END IF;
 BEGIN
  v_old_start:=(v_booking.session_date||' '||v_booking.session_time)::timestamptz;
  v_date:=btrim(p_new_session_date)::date;
  PERFORM public.ng_time_minutes(p_new_session_time);
 EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'error','Invalid date or session time'); END;
 IF v_old_start<=now()+make_interval(hours=>greatest(0,p_deadline_hours)) THEN
  RETURN jsonb_build_object('ok',false,'error','Rescheduling is only allowed at least 24 hours before the session');
 END IF;
 IF v_date<current_date THEN RETURN jsonb_build_object('ok',false,'error','New session date must be in the future'); END IF;
 PERFORM pg_advisory_xact_lock(hashtext(v_booking.practitioner_id::text),hashtext(v_date::text));
 IF NOT public.ng_booking_slot_is_available(v_booking.practitioner_id,v_booking.offering_id,
   p_new_session_date,p_new_session_time,v_booking.duration_minutes,v_booking.id,NULL) THEN
  RETURN jsonb_build_object('ok',false,'error','The selected session slot is unavailable or already booked');
 END IF;
 UPDATE public.practitioner_bookings SET session_date=v_date::text,session_time=btrim(p_new_session_time)
  WHERE id=p_booking_id;
 RETURN jsonb_build_object('ok',true,'booking_id',p_booking_id,'session_date',v_date::text,'session_time',btrim(p_new_session_time));
END $$;

REVOKE ALL ON FUNCTION public.ng_time_minutes(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ng_booking_slot_is_available(uuid,uuid,text,text,integer,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reserve_practitioner_slot(uuid,uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.attach_practitioner_slot_reservation(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_practitioner_slot_reservation(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fulfill_paid_booking_checkout(uuid,text,text,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_free_practitioner_booking(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reschedule_user_practitioner_booking(uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_practitioner_slot(uuid,uuid,uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_practitioner_slot_reservation(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_practitioner_slot_reservation(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_booking_checkout(uuid,text,text,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_free_practitioner_booking(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_user_practitioner_booking(uuid,uuid,text,text,integer) TO service_role;


-- Admin schedule edits use the same availability/overlap guard.
CREATE OR REPLACE FUNCTION public.admin_update_practitioner_booking_schedule(
 p_booking_id uuid,p_new_session_date text,p_new_session_time text,p_meeting_link text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_booking record; v_date date;
BEGIN
 SELECT * INTO v_booking FROM public.practitioner_bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Booking not found'); END IF;
 IF v_booking.booking_status NOT IN ('Pending','Confirmed') THEN
  RETURN jsonb_build_object('ok',false,'error','Only upcoming bookings can be rescheduled');
 END IF;
 BEGIN
  v_date:=btrim(p_new_session_date)::date;
  PERFORM public.ng_time_minutes(p_new_session_time);
 EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'error','Invalid date or session time'); END;
 PERFORM pg_advisory_xact_lock(hashtext(v_booking.practitioner_id::text),hashtext(v_date::text));
 IF NOT public.ng_booking_slot_is_available(v_booking.practitioner_id,v_booking.offering_id,
   p_new_session_date,p_new_session_time,v_booking.duration_minutes,v_booking.id,NULL) THEN
  RETURN jsonb_build_object('ok',false,'error','The selected session slot is unavailable or already booked');
 END IF;
 UPDATE public.practitioner_bookings SET session_date=v_date::text,session_time=btrim(p_new_session_time),
  meeting_link=NULLIF(btrim(coalesce(p_meeting_link,'')),'')
  WHERE id=p_booking_id;
 RETURN jsonb_build_object('ok',true,'booking_id',p_booking_id,'session_date',v_date::text,
  'session_time',btrim(p_new_session_time));
END $$;
REVOKE ALL ON FUNCTION public.admin_update_practitioner_booking_schedule(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_practitioner_booking_schedule(uuid,text,text,text) TO service_role;

NOTIFY pgrst,'reload schema';
