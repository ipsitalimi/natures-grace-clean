-- Phase A: resource course enrollments

CREATE TABLE IF NOT EXISTS public.resource_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Enrolled'
    CHECK (status IN ('Enrolled', 'Cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS resource_enrollments_active_user_resource_idx
  ON public.resource_enrollments (resource_id, user_id)
  WHERE status = 'Enrolled';

CREATE INDEX IF NOT EXISTS resource_enrollments_resource_idx
  ON public.resource_enrollments (resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS resource_enrollments_user_idx
  ON public.resource_enrollments (user_id, created_at DESC);

DROP TRIGGER IF EXISTS resource_enrollments_updated_at ON public.resource_enrollments;
CREATE TRIGGER resource_enrollments_updated_at
  BEFORE UPDATE ON public.resource_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resource_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_enrollments_select_own"
  ON public.resource_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "resource_enrollments_select_admin"
  ON public.resource_enrollments FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "resource_enrollments_insert_own"
  ON public.resource_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "resource_enrollments_update_own"
  ON public.resource_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "resource_enrollments_update_admin"
  ON public.resource_enrollments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
