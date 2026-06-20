-- Nature's Grace — Phase 1 schema (Supabase)
-- Run in Supabase SQL Editor or via: supabase db push

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'User'
    CHECK (role IN ('User', 'Practitioner', 'Seller', 'Admin')),
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'User'),
    'Active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Platform settings (single row, JSON blobs match frontend PlatformConfig)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  home_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_approvals JSONB NOT NULL DEFAULT '{}'::jsonb,
  practitioner_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  resource_published JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Practitioners
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  certifications TEXT[] DEFAULT '{}',
  rating NUMERIC(3, 2) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  price_per_session NUMERIC(12, 2) DEFAULT 0,
  photo_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (approval_status IN ('Approved', 'Pending', 'Rejected')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Sellers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  stock INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Low Stock', 'Out of Stock')),
  approval_status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (approval_status IN ('Approved', 'Pending', 'Rejected')),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  event_time TEXT DEFAULT '',
  mode TEXT DEFAULT 'Online',
  price_label TEXT DEFAULT 'Free',
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Draft', 'Ended')),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  section TEXT NOT NULL DEFAULT 'Articles',
  body TEXT DEFAULT '',
  duration TEXT,
  action_label TEXT DEFAULT 'Open',
  price_label TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Journal / gratitude prompts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  date_iso TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

-- Profiles
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Platform settings: public read (maintenance/home copy before login); admin write
CREATE POLICY "platform_settings_select_authenticated"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "platform_settings_select_anon"
  ON public.platform_settings FOR SELECT TO anon USING (true);

CREATE POLICY "platform_settings_admin_write"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "platform_settings_admin_insert"
  ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Public read for practitioners/events/resources/products (approved/active)
CREATE POLICY "practitioners_select"
  ON public.practitioners FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "practitioners_admin_all"
  ON public.practitioners FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sellers_select"
  ON public.sellers FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "sellers_own"
  ON public.sellers FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "sellers_admin"
  ON public.sellers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "products_select"
  ON public.products FOR SELECT TO authenticated
  USING (approval_status = 'Approved');

CREATE POLICY "products_admin"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "events_select"
  ON public.events FOR SELECT TO authenticated
  USING (is_visible = true AND status = 'Active');

CREATE POLICY "events_admin"
  ON public.events FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "resources_select"
  ON public.resources FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "resources_admin"
  ON public.resources FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "prompts_select"
  ON public.prompts FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "prompts_admin"
  ON public.prompts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "notifications_admin"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
