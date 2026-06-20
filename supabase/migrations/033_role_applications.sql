-- Role applications (Practitioner / Seller onboarding)

CREATE TABLE IF NOT EXISTS public.role_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL
    CHECK (target_role IN ('Practitioner', 'Seller')),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS role_applications_pending_user_role_idx
  ON public.role_applications (user_id, target_role)
  WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS role_applications_status_created_idx
  ON public.role_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS role_applications_user_idx
  ON public.role_applications (user_id, created_at DESC);

DROP TRIGGER IF EXISTS role_applications_updated_at ON public.role_applications;
CREATE TRIGGER role_applications_updated_at
  BEFORE UPDATE ON public.role_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.role_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_applications_select_own"
  ON public.role_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "role_applications_select_admin"
  ON public.role_applications FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "role_applications_insert_own"
  ON public.role_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'Pending');

CREATE POLICY "role_applications_update_admin"
  ON public.role_applications FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
