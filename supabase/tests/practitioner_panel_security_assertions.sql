-- Read-only post-migration assertions for practitioner panel hardening.
-- Run only after applying 20261120000100_practitioner_panel_security_hardening.sql.
-- This script performs no INSERT, UPDATE, DELETE, or schema changes.

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.practitioner_wallets', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.practitioner_wallets', 'INSERT')
     OR has_table_privilege('authenticated', 'public.practitioner_wallets', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has practitioner wallet write privileges';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.practitioner_wallets', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: practitioner wallet read access was removed';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.practitioner_wallets', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.practitioner_wallets', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: trusted backend wallet write privileges are missing';
  END IF;

  IF has_table_privilege('authenticated', 'public.practitioner_bookings', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.practitioner_bookings', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.practitioner_bookings', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: booking creation/update grants are not server-owned as expected';
  END IF;

  IF has_function_privilege('anon', 'public.apply_practitioner_application(uuid,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.apply_practitioner_application(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: internal practitioner application RPC remains directly executable';
  END IF;

  IF position('priceRange' IN pg_get_functiondef('public.apply_practitioner_application(uuid,jsonb)'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'FAIL: applicant form data can still set practitioner pricing';
  END IF;

  IF position('is_active' IN pg_get_functiondef('public.current_practitioner_id()'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'FAIL: practitioner identity helper still depends on availability';
  END IF;

  IF has_function_privilege('anon', 'public.ensure_practitioner_wallet(numeric)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.ensure_practitioner_wallet(numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: practitioner wallet provisioning RPC remains directly executable';
  END IF;

  IF has_function_privilege('anon', 'public.ensure_practitioner_profile()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.ensure_practitioner_profile()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: practitioner profile provisioning RPC grants are incorrect';
  END IF;

  IF has_function_privilege('anon', 'public.current_practitioner_id()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.current_practitioner_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: practitioner identity helper grants are incorrect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_wallets'
      AND policyname = 'practitioner_wallets_select_scoped'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAIL: scoped practitioner wallet SELECT policy is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_wallets'
      AND cmd IN ('INSERT','UPDATE','ALL')
      AND policyname ILIKE '%practitioner%'
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner wallet write policy remains';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.practitioners'::regclass
      AND tgname = 'practitioners_guard_self_update'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner profile allowlist trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.practitioner_bookings'::regclass
      AND tgname = 'practitioner_bookings_guard_practitioner_update'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner booking allowlist trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.practitioner_bookings'::regclass
      AND tgname = 'practitioner_booking_completion_history'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: completion history trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reviews'::regclass
      AND tgname = 'reviews_practitioner_rating_aggregate'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner review aggregate trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'practitioner_reply'
  ) THEN
    RAISE EXCEPTION 'FAIL: practitioner_reply column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews_update_practitioner_reply'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: scoped practitioner review reply policy is missing';
  END IF;

  RAISE NOTICE 'PASS: practitioner panel security schema assertions';
END;
$$;
