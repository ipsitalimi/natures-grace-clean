-- Admin support: computed average first response time (ticket created_at → first Staff message)

CREATE OR REPLACE FUNCTION public.admin_first_response_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_avg numeric;
  v_cnt int;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'forbidden', 'avg_hours', NULL, 'sample_count', 0);
  END IF;

  SELECT
    AVG(EXTRACT(EPOCH FROM (fm.first_staff - t.created_at)) / 3600.0),
    COUNT(*)::int
  INTO v_avg, v_cnt
  FROM public.support_tickets t
  INNER JOIN (
    SELECT ticket_id, MIN(created_at) AS first_staff
    FROM public.ticket_messages
    WHERE author_role = 'Staff'
    GROUP BY ticket_id
  ) fm ON fm.ticket_id = t.id;

  IF v_cnt IS NULL OR v_cnt = 0 THEN
    RETURN jsonb_build_object('avg_hours', NULL, 'sample_count', 0);
  END IF;

  RETURN jsonb_build_object(
    'avg_hours', v_avg,
    'sample_count', v_cnt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_first_response_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_first_response_stats IS
  'Returns avg hours from ticket created_at to first Staff ticket_messages row; admin only.';
