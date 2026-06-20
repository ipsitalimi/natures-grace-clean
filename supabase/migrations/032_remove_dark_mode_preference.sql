-- Light-only app: drop darkModeEnabled from profile preferences default

ALTER TABLE public.profiles
  ALTER COLUMN preferences SET DEFAULT '{"notificationsEnabled": true}'::jsonb;
