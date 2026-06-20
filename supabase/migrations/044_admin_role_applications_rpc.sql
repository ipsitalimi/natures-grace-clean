-- Reliable admin read path for role applications (bypasses RLS edge cases).

CREATE OR REPLACE FUNCTION public.admin_list_role_applications()
RETURNS SETOF public.role_applications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT ra.*
  FROM public.role_applications ra
  ORDER BY ra.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_role_applications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_role_applications() TO authenticated;
