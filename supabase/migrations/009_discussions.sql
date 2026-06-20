-- Phase A: community discussion threads and replies

CREATE TABLE IF NOT EXISTS public.discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL DEFAULT '',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Community',
  visibility TEXT NOT NULL DEFAULT 'Visible'
    CHECK (visibility IN ('Visible', 'Hidden')),
  moderation_status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (moderation_status IN ('Approved', 'Pending', 'Flagged', 'Removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discussion_threads_created_idx
  ON public.discussion_threads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Community',
  body TEXT NOT NULL DEFAULT '',
  moderation_status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (moderation_status IN ('Approved', 'Pending', 'Flagged', 'Removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discussion_replies_thread_idx
  ON public.discussion_replies (thread_id, created_at ASC);

DROP TRIGGER IF EXISTS discussion_threads_updated_at ON public.discussion_threads;
CREATE TRIGGER discussion_threads_updated_at
  BEFORE UPDATE ON public.discussion_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS discussion_replies_updated_at ON public.discussion_replies;
CREATE TRIGGER discussion_replies_updated_at
  BEFORE UPDATE ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_threads_select_authenticated"
  ON public.discussion_threads FOR SELECT TO authenticated USING (true);

CREATE POLICY "discussion_replies_select_authenticated"
  ON public.discussion_replies FOR SELECT TO authenticated USING (true);

CREATE POLICY "discussion_threads_insert_authenticated"
  ON public.discussion_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "discussion_replies_insert_authenticated"
  ON public.discussion_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "discussion_threads_update_author_or_admin"
  ON public.discussion_threads FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_admin());

CREATE POLICY "discussion_replies_update_author_or_admin"
  ON public.discussion_replies FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_admin());

CREATE POLICY "discussion_threads_admin_delete"
  ON public.discussion_threads FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "discussion_replies_admin_delete"
  ON public.discussion_replies FOR DELETE TO authenticated
  USING (public.is_admin());
