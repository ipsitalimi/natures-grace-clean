-- Phase A: journal entries and gratitude logs

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  mood TEXT CHECK (mood IS NULL OR mood IN ('Peaceful', 'Grateful', 'Anxious', 'Hopeful')),
  prompt TEXT,
  entry_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx
  ON public.journal_entries (user_id, entry_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  author_name TEXT NOT NULL DEFAULT 'Community',
  entry_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gratitude_entries_user_idx
  ON public.gratitude_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gratitude_entries_public_idx
  ON public.gratitude_entries (is_public, created_at DESC)
  WHERE is_public = TRUE;

DROP TRIGGER IF EXISTS journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gratitude_entries_updated_at ON public.gratitude_entries;
CREATE TRIGGER gratitude_entries_updated_at
  BEFORE UPDATE ON public.gratitude_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

-- Journal: owner-only access
CREATE POLICY "journal_entries_select_own"
  ON public.journal_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "journal_entries_insert_own"
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "journal_entries_update_own"
  ON public.journal_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "journal_entries_delete_own"
  ON public.journal_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Gratitude: own rows + public community feed
CREATE POLICY "gratitude_entries_select_own"
  ON public.gratitude_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "gratitude_entries_select_public"
  ON public.gratitude_entries FOR SELECT TO authenticated
  USING (is_public = TRUE);

CREATE POLICY "gratitude_entries_insert_own"
  ON public.gratitude_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gratitude_entries_update_own"
  ON public.gratitude_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gratitude_entries_delete_own"
  ON public.gratitude_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());
