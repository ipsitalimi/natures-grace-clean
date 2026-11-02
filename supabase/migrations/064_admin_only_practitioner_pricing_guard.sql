-- Enforce Admin-only practitioner session pricing at the database layer.
-- Practitioners may continue updating permitted profile fields, but cannot alter
-- price_per_session through direct Supabase/API writes.

CREATE OR REPLACE FUNCTION public.practitioners_guard_admin_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.price_per_session := OLD.price_per_session;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_guard_admin_pricing ON public.practitioners;
CREATE TRIGGER practitioners_guard_admin_pricing
  BEFORE UPDATE OF price_per_session ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioners_guard_admin_pricing();

-- Keep public/admin visibility policies unchanged; this trigger specifically
-- prevents non-admin updates to the price column, even if another update policy
-- allows the row update itself.

NOTIFY pgrst, 'reload schema';
