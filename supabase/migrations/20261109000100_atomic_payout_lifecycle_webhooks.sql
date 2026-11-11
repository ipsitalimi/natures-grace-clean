-- Atomic seller/practitioner payout webhook lifecycle. Not applied to any DB.
CREATE OR REPLACE FUNCTION public.transition_wallet_payout(
 p_payout_type TEXT,p_payout_id UUID,p_action TEXT,
 p_razorpay_payout_id TEXT DEFAULT NULL,p_razorpay_fund_account_id TEXT DEFAULT NULL,
 p_notes TEXT DEFAULT NULL,p_failure_reason TEXT DEFAULT NULL,p_webhook_event TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_payout RECORD; v_wallet UUID; v_amount NUMERIC(12,2); v_status TEXT; v_pending NUMERIC(12,2);
BEGIN
 IF p_payout_type NOT IN ('seller','practitioner') OR p_action NOT IN ('processing','completed','failed') THEN
  RETURN jsonb_build_object('ok',false,'error','Invalid payout type or action'); END IF;
 IF p_payout_type='seller' THEN SELECT * INTO v_payout FROM seller_payouts WHERE id=p_payout_id FOR UPDATE;
 ELSE SELECT * INTO v_payout FROM practitioner_payouts WHERE id=p_payout_id FOR UPDATE; END IF;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Payout not found'); END IF;
 v_wallet:=v_payout.wallet_id; v_amount:=v_payout.amount; v_status:=v_payout.status;
 IF (p_action='completed' AND v_status='Completed') OR (p_action='failed' AND v_status='Failed') THEN
  RETURN jsonb_build_object('ok',true,'already_applied',true,'payout',to_jsonb(v_payout)); END IF;
 IF v_status IN ('Completed','Failed','Cancelled','Rejected') THEN
  RETURN jsonb_build_object('ok',false,'error','Payout is already in a terminal state'); END IF;
 IF p_payout_type='seller' THEN PERFORM 1 FROM seller_wallets WHERE id=v_wallet FOR UPDATE;
 ELSE PERFORM 1 FROM practitioner_wallets WHERE id=v_wallet FOR UPDATE; END IF;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Wallet not found'); END IF;
 IF p_action='processing' THEN
  IF p_payout_type='seller' THEN
   UPDATE seller_payouts SET status='Processing',razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),
    razorpay_fund_account_id=COALESCE(p_razorpay_fund_account_id,razorpay_fund_account_id),notes=COALESCE(p_notes,notes),
    last_webhook_event=p_webhook_event WHERE id=p_payout_id RETURNING * INTO v_payout;
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM seller_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE seller_wallets SET pending_payout=v_pending WHERE id=v_wallet;
  ELSE
   UPDATE practitioner_payouts SET status='Processing',razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),
    razorpay_fund_account_id=COALESCE(p_razorpay_fund_account_id,razorpay_fund_account_id),notes=COALESCE(p_notes,notes),
    last_webhook_event=p_webhook_event WHERE id=p_payout_id RETURNING * INTO v_payout;
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM practitioner_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE practitioner_wallets SET pending_payout=v_pending WHERE id=v_wallet;
  END IF;
 ELSIF p_action='completed' THEN
  IF v_status NOT IN ('Pending','Under Review','Processing') THEN RETURN jsonb_build_object('ok',false,'error','Invalid completion transition'); END IF;
  IF p_payout_type='seller' THEN
   UPDATE seller_payouts SET status='Completed',razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),
    razorpay_fund_account_id=COALESCE(p_razorpay_fund_account_id,razorpay_fund_account_id),completed_at=NOW(),
    last_webhook_event=p_webhook_event,failure_reason=NULL,notes=COALESCE(p_notes,notes) WHERE id=p_payout_id RETURNING * INTO v_payout;
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM seller_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE seller_wallets SET pending_payout=v_pending WHERE id=v_wallet;
   UPDATE wallet_transactions SET description='Payout to Bank Account (completed)' WHERE payout_id=p_payout_id AND category='payout';
  ELSE
   UPDATE practitioner_payouts SET status='Completed',razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),
    razorpay_fund_account_id=COALESCE(p_razorpay_fund_account_id,razorpay_fund_account_id),completed_at=NOW(),
    last_webhook_event=p_webhook_event,failure_reason=NULL,notes=COALESCE(p_notes,notes) WHERE id=p_payout_id RETURNING * INTO v_payout;
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM practitioner_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE practitioner_wallets SET pending_payout=v_pending WHERE id=v_wallet;
   UPDATE practitioner_wallet_transactions SET description='Payout to Bank Account (completed)' WHERE payout_id=p_payout_id AND category='payout';
  END IF;
 ELSE
  IF v_status NOT IN ('Pending','Under Review','Processing') THEN RETURN jsonb_build_object('ok',false,'error','Invalid failure transition'); END IF;
  IF p_payout_type='seller' THEN
   UPDATE seller_wallets SET available_balance=available_balance+v_amount WHERE id=v_wallet;
   UPDATE seller_payouts SET status='Failed',failure_reason=COALESCE(p_failure_reason,'Payout failed'),
    razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),last_webhook_event=p_webhook_event
    WHERE id=p_payout_id RETURNING * INTO v_payout;
   INSERT INTO wallet_transactions(wallet_id,payout_id,type,category,amount,description,is_released)
    VALUES(v_wallet,p_payout_id,'credit','adjustment',v_amount,'Payout failed — '||COALESCE(p_failure_reason,'refunded to wallet'),true);
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM seller_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE seller_wallets SET pending_payout=v_pending WHERE id=v_wallet;
   UPDATE wallet_transactions SET description='Payout failed — '||COALESCE(p_failure_reason,'not processed') WHERE payout_id=p_payout_id AND category='payout';
  ELSE
   UPDATE practitioner_wallets SET available_balance=available_balance+v_amount WHERE id=v_wallet;
   UPDATE practitioner_payouts SET status='Failed',failure_reason=COALESCE(p_failure_reason,'Payout failed'),
    razorpay_payout_id=COALESCE(p_razorpay_payout_id,razorpay_payout_id),last_webhook_event=p_webhook_event
    WHERE id=p_payout_id RETURNING * INTO v_payout;
   INSERT INTO practitioner_wallet_transactions(wallet_id,payout_id,type,category,amount,description,is_released)
    VALUES(v_wallet,p_payout_id,'credit','adjustment',v_amount,'Payout failed — '||COALESCE(p_failure_reason,'refunded to wallet'),true);
   SELECT COALESCE(SUM(amount),0) INTO v_pending FROM practitioner_payouts WHERE wallet_id=v_wallet AND status IN ('Pending','Under Review','Processing');
   UPDATE practitioner_wallets SET pending_payout=v_pending WHERE id=v_wallet;
   UPDATE practitioner_wallet_transactions SET description='Payout failed — '||COALESCE(p_failure_reason,'not processed') WHERE payout_id=p_payout_id AND category='payout';
  END IF;
 END IF;
 RETURN jsonb_build_object('ok',true,'already_applied',false,'payout',to_jsonb(v_payout));
END; $$;
REVOKE ALL ON FUNCTION public.transition_wallet_payout(TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_wallet_payout(TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
