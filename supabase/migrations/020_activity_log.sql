-- Phase A: admin activity / audit log

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT 'Admin',
  action_type TEXT NOT NULL
    CHECK (action_type IN ('booking', 'user', 'review', 'event', 'store', 'settings')),
  description TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  before_snapshot JSONB,
  after_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_created_idx
  ON public.activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_action_type_idx
  ON public.activity_log (action_type, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_admin_select"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "activity_log_admin_insert"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "activity_log_admin_delete"
  ON public.activity_log FOR DELETE TO authenticated
  USING (public.is_admin());
