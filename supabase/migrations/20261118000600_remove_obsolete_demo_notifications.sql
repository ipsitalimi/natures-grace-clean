-- Remove obsolete demo/broadcast notifications that were visible to every account.
-- Keep the welcome notification and all genuine user/session notifications.
DELETE FROM public.notifications
WHERE user_id IS NULL
  AND message IN (
    'film: ggj',
    'Your session with Ms Neelam is tomorrow at 3:00 PM',
    'New Har Ghar Dhyan event is available'
  );
