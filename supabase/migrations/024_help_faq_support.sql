-- Phase A: persistent FAQ, categories, and public support copy (help / contact / hub)

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faq_items_category_sort_idx ON public.faq_items (category_id, sort_order);
CREATE INDEX IF NOT EXISTS faq_items_active_idx ON public.faq_items (is_active);

CREATE TABLE IF NOT EXISTS public.support_copy (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS faq_categories_updated_at ON public.faq_categories;
CREATE TRIGGER faq_categories_updated_at
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS faq_items_updated_at ON public.faq_items;
CREATE TRIGGER faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS support_copy_updated_at ON public.support_copy;
CREATE TRIGGER support_copy_updated_at
  BEFORE UPDATE ON public.support_copy
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_copy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_categories_select"
  ON public.faq_categories FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "faq_categories_admin_all"
  ON public.faq_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "faq_items_select"
  ON public.faq_items FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "faq_items_admin_all"
  ON public.faq_items FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "support_copy_select"
  ON public.support_copy FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "support_copy_admin_insert"
  ON public.support_copy FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "support_copy_admin_update"
  ON public.support_copy FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "support_copy_admin_delete"
  ON public.support_copy FOR DELETE TO authenticated
  USING (public.is_admin());

-- Seed category + FAQs (combined user help + legacy admin FAQs)
INSERT INTO public.faq_categories (slug, title, sort_order, is_active)
VALUES ('general', 'General', 0, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.support_copy (key, body)
VALUES
  ('avg_response_label', '2.4 hrs'),
  ('support_email', 'naturesgraceapp@gmail.com'),
  ('support_phone', '+91 9560424609'),
  ('support_hours', 'Mon-Sat, 9:00 AM - 6:00 PM IST'),
  ('support_hub_help_title', 'Help Center'),
  ('support_hub_help_description', 'Find answers to common questions'),
  ('support_hub_contact_title', 'Contact Us'),
  ('support_hub_contact_description', 'Reach out to our support team'),
  ('support_hub_about_title', 'About Nature''s Grace'),
  ('support_hub_about_description', 'Learn about our mission and values'),
  ('about_intro', 'Nature''s Grace is a holistic wellness platform dedicated to nurturing your mind, body, and spirit. Founded with the vision of making wellness accessible to everyone, we connect you with experienced practitioners, guided practices, and a supportive community.'),
  ('about_mission', 'To create a calm, grounded space where individuals can explore healing modalities, build mindful habits, and find connection on their wellness journey.'),
  ('about_badge_title', '11 Years of Healing'),
  ('about_badge_text', 'Celebrating over a decade of serving our wellness community with love and dedication.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.faq_items (category_id, question, answer, sort_order, is_active)
SELECT c.id,
  v.question,
  v.answer,
  v.sort_order,
  TRUE
FROM public.faq_categories c
CROSS JOIN (VALUES
  (0, 'How do I book a session?', 'Browse our wellness categories, select a practitioner, and tap Book Session to schedule your appointment.'),
  (1, 'Can I cancel a booking?', 'Yes - you can cancel up to 24 hours before your session from Session History.'),
  (2, 'How do I change my account details?', 'Go to Settings → Edit Profile to update your name, email, and other information.'),
  (3, 'Is my data secure?', 'We use industry-standard practices to protect your personal information.'),
  (4, 'How do I contact support?', 'Use Contact in this app (Support) or email the address shown on the Contact page.'),
  (5, 'Payment & refund policy', 'Payments are processed securely through our payment gateway. Refunds can be requested within 24 hours of a session where applicable. Processing typically takes 5–7 business days.'),
  (6, 'How do I contact a practitioner?', 'After booking, you can follow up through your session details and any in-app messaging available for that booking.'),
  (7, 'Account & privacy settings', 'Manage account, privacy, and notifications from Profile → Settings. Account deletion options are available there when supported.')
) AS v(sort_order, question, answer)
WHERE c.slug = 'general'
AND NOT EXISTS (
  SELECT 1 FROM public.faq_items fi WHERE fi.question = v.question
);
