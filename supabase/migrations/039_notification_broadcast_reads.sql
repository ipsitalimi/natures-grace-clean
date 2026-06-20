-- Per-user read state for broadcast notifications (user_id IS NULL on notifications row)

CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS notification_reads_user_id_idx
  ON public.notification_reads (user_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_reads_select_own"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notification_reads_insert_own"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_reads_admin"
  ON public.notification_reads FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
