-- Update Contact page default phone and email (support_copy).
UPDATE public.support_copy
SET body = 'naturesgraceapp@gmail.com', updated_at = NOW()
WHERE key = 'support_email';

UPDATE public.support_copy
SET body = '+91 9560424609', updated_at = NOW()
WHERE key = 'support_phone';

INSERT INTO public.support_copy (key, body)
VALUES
  ('support_email', 'naturesgraceapp@gmail.com'),
  ('support_phone', '+91 9560424609')
ON CONFLICT (key) DO UPDATE
SET body = EXCLUDED.body, updated_at = NOW();
