-- Login screen tagline (support_copy)

INSERT INTO public.support_copy (key, body)
VALUES
  ('login_tagline', 'Your calm wellness companion')
ON CONFLICT (key) DO NOTHING;
