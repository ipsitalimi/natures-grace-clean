-- Advance an applicant's progress when supporting documents have actually uploaded.
CREATE OR REPLACE FUNCTION public.mark_role_application_documents_received(
  p_application_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := false;
BEGIN
  UPDATE public.role_applications
  SET progress_stage = 'documents_received',
      updated_at = NOW()
  WHERE id = p_application_id
    AND user_id = auth.uid()
    AND status = 'Pending'
    AND progress_stage = 'submitted';

  v_updated := FOUND;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_role_application_documents_received(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_role_application_documents_received(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
