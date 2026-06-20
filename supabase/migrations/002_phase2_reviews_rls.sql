-- Phase 2: reviews table + relaxed read policies for admin/seller UIs

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  user_initial TEXT NOT NULL DEFAULT 'A',
  practitioner_name TEXT NOT NULL DEFAULT '',
  rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Approved', 'Pending', 'Flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_authenticated"
  ON public.reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_select_approved_anon"
  ON public.reviews FOR SELECT TO anon USING (status = 'Approved');

CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Products: authenticated users see all (admin/seller); anon sees approved only
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_select_anon"
  ON public.products FOR SELECT TO anon USING (approval_status = 'Approved');

-- Resources: anon can read published
CREATE POLICY "resources_select_anon"
  ON public.resources FOR SELECT TO anon USING (is_published = true);

-- Events: anon can read visible active events
CREATE POLICY "events_select_anon"
  ON public.events FOR SELECT TO anon USING (is_visible = true AND status = 'Active');

-- Prompts: anon can read active
CREATE POLICY "prompts_select_anon"
  ON public.prompts FOR SELECT TO anon USING (active = true);
