-- User profile preferences + per-user notification read updates

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{
    "notificationsEnabled": true,
    "darkModeEnabled": false
  }'::jsonb;

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
