-- Private operational tables: only the trusted API service role may access these records.
ALTER TABLE public.practitioner_slot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payment_reconciliation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practitioner_slot_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.booking_payment_reconciliation FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.practitioner_slot_reservations TO service_role;
GRANT ALL ON public.booking_payment_reconciliation TO service_role;
