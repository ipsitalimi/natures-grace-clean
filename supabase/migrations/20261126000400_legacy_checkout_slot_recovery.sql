-- Keep legacy, already-created Razorpay orders fulfillable after rollout if the slot remains free.
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
 IF NOT FOUND THEN
   -- Backward compatibility for Razorpay orders created immediately before this
   -- reservation release: they may complete only if the slot is still free.
   IF NOT public.ng_booking_slot_is_available(v_practitioner,v_offering,v_date,v_time,v_duration,NULL,NULL) THEN
     v_conflict:=true;
   END IF;
 ELSIF v_reservation.status NOT IN ('reserved','expired') THEN
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

NOTIFY pgrst,'reload schema';
