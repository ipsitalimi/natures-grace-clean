-- First-admin bootstrap: allow exactly one promotion when no Admin exists yet.
-- Does NOT weaken RLS; only relaxes profiles_guard_sensitive_columns for the bootstrap case.

CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- One-time bootstrap: promote to Admin only when no other Admin exists.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role = 'Admin'
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE role = 'Admin' AND id <> OLD.id
     )
  THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.status := OLD.status;
  NEW.email := OLD.email;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;
