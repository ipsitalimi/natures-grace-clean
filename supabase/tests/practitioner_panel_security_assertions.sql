-- Read-only post-migration assertions for the practitioner panel.
-- Run after applying 20261120000100_practitioner_panel_security_hardening.sql.
-- This block raises an exception on any failed assertion and does not mutate data.

DO $$
DECLARE
  v_table_name text;
BEGIN
  IF has_function_privilege('anon', 'public.current_practitioner_id()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.current_practitioner_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: practitioner identity helper grants are incorrect';
  END IF;

  IF has_function_privilege('anon', 'public.ensure_practitioner_wallet(numeric)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.ensure_practitioner_wallet(numeric)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.ensure_practitioner_wallet(numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: wallet provisioning RPC is not backend-only';
  END IF;

  IF has_function_privilege('anon', 'public.apply_practitioner_application(uuid,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.apply_practitioner_application(uuid,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.apply_practitioner_application(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: practitioner application helper is not backend-only';
  END IF;

  IF has_function_privilege('authenticated', 'public.admin_update_payout_status(text,uuid,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_update_payout_status(text,uuid,text,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.admin_update_payout_status(text,uuid,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: admin payout status RPC is not service-role-only';
  END IF;

  IF has_function_privilege('authenticated', 'public.request_wallet_payout(text,uuid,numeric,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.request_wallet_payout(text,uuid,numeric,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.request_wallet_payout(text,uuid,numeric,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: payout queue RPC is not service-role-only';
  END IF;

  FOR v_table_name IN
    SELECT unnest(ARRAY[
      'practitioners',
      'practitioner_availability',
      'practitioner_offerings',
      'practitioner_pricing_rules',
      'practitioner_bookings',
      'practitioner_booking_intro_messages',
      'practitioner_wallets',
      'practitioner_wallet_transactions',
      'practitioner_payouts',
      'practitioner_session_history',
      'reviews'
    ])
  LOOP
    IF has_table_privilege('authenticated', format('public.%I', v_table_name), 'TRUNCATE')
       OR has_table_privilege('authenticated', format('public.%I', v_table_name), 'REFERENCES')
       OR has_table_privilege('authenticated', format('public.%I', v_table_name), 'TRIGGER')
       OR has_table_privilege('anon', format('public.%I', v_table_name), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', v_table_name), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', v_table_name), 'DELETE')
       OR has_table_privilege('anon', format('public.%I', v_table_name), 'TRUNCATE') THEN
      RAISE EXCEPTION 'FAIL: broad app-role table privilege remains on %', v_table_name;
    END IF;
  END LOOP;

  IF has_table_privilege('authenticated', 'public.practitioner_wallets', 'INSERT')
     OR has_table_privilege('authenticated', 'public.practitioner_wallets', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_wallets', 'DELETE')
     OR has_table_privilege('authenticated', 'public.practitioner_wallet_transactions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.practitioner_wallet_transactions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_wallet_transactions', 'DELETE')
     OR has_table_privilege('authenticated', 'public.practitioner_payouts', 'INSERT')
     OR has_table_privilege('authenticated', 'public.practitioner_payouts', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_payouts', 'DELETE')
     OR has_table_privilege('authenticated', 'public.practitioner_session_history', 'INSERT')
     OR has_table_privilege('authenticated', 'public.practitioner_session_history', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_session_history', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: practitioners can directly write financial or session-history rows';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.practitioners', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.practitioners', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'public.practitioner_bookings', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.practitioner_bookings', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_bookings', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.practitioner_availability', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.practitioner_offerings', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.reviews', 'INSERT')
     OR NOT has_table_privilege('anon', 'public.reviews', 'SELECT')
     OR NOT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: required practitioner workflows or public review reads were removed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioners'
      AND policyname = 'practitioners_select'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
      AND NOT ('anon' = ANY(roles))
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner catalogue access model changed unexpectedly';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_wallets'
      AND cmd IN ('INSERT', 'UPDATE', 'ALL')
      AND policyname ILIKE '%practitioner%'
  ) OR EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_session_history'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND policyname ILIKE '%practitioner%'
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner wallet or session-history write policy remains';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'practitioner_wallets'
      AND column_name = 'bank_account_holder'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'practitioner_wallets'
      AND column_name = 'bank_account_label'
      AND column_default IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.practitioner_wallets
    WHERE bank_account_label = 'HDFC Bank ···· 4821'
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner bank details schema or legacy placeholder cleanup is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.practitioners
    WHERE COALESCE(review_count, 0) = 0
      AND COALESCE(rating, 0) <> 0
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner profile contains a rating without approved reviews';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'practitioner_bookings'
      AND trigger_name = 'practitioner_booking_completion_history'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'reviews'
      AND trigger_name = 'reviews_practitioner_rating_aggregate'
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner booking/review integrity triggers are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.wallet_transactions'::regclass
      AND conname = 'wallet_transactions_category_check'
      AND pg_get_constraintdef(oid) LIKE '%payout_reversal%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.practitioner_wallet_transactions'::regclass
      AND conname = 'practitioner_wallet_transactions_category_check'
      AND pg_get_constraintdef(oid) LIKE '%payout_reversal%'
  ) THEN
    RAISE EXCEPTION 'FAIL: auditable payout reversal category is missing';
  END IF;

  RAISE NOTICE 'PASS: practitioner panel security schema assertions';
END;
$$;
