-- Restrict authenticated application RPCs from anonymous execution.
REVOKE EXECUTE ON FUNCTION public.admin_first_response_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_role_applications() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_provision_user_role(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_role_application_transaction(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_practitioner_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_seller_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_practitioner_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_practitioner_wallet(NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_seller_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_seller_wallet(NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_legal_acceptances(JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC, anon;

-- Sensitive payment and application workflows are service-role only.
REVOKE EXECUTE ON FUNCTION public.apply_practitioner_application(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_practitioner_application(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_practitioner_booking_refund(UUID, UUID, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_booking_checkout(UUID, TEXT, TEXT, NUMERIC) TO service_role;

-- Trigger-only functions do not need client EXECUTE privileges.
REVOKE ALL ON FUNCTION public.enforce_role_application_legal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_course_enrollment_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_event_registration_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_guard_fulfillment_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practitioner_bookings_guard_practitioner_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practitioners_guard_admin_pricing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practitioners_profile_field_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_direct_legal_column_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.products_guard_seller_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_guard_sensitive_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reviews_before_update_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_course_enrollment_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_event_registration_insert() FROM PUBLIC, anon, authenticated;

-- Pin search_path for helper functions to avoid object-shadowing attacks.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.parse_practitioner_subcategories_from_form(JSONB) SET search_path = public, pg_temp;
ALTER FUNCTION public.merge_practitioner_specialties(UUID, TEXT, TEXT[]) SET search_path = public, pg_temp;

-- Remove the redundant index; the unique constraint already maintains this key.
DROP INDEX IF EXISTS public.orders_order_number_uidx;

NOTIFY pgrst, 'reload schema';
