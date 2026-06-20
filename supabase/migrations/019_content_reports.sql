-- Phase A: flagged content / moderation queue

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT NOT NULL DEFAULT 'Anonymous',
  target_type TEXT NOT NULL
    CHECK (target_type IN (
      'discussion_thread',
      'discussion_reply',
      'review',
      'event',
      'product',
      'other'
    )),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL
    CHECK (reason IN ('Spam', 'Inappropriate', 'Misleading', 'Other')),
  detail TEXT NOT NULL DEFAULT '',
  content_preview TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'actioned')),
  moderation_action TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON public.content_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS content_reports_target_idx
  ON public.content_reports (target_type, target_id);

DROP TRIGGER IF EXISTS content_reports_updated_at ON public.content_reports;
CREATE TRIGGER content_reports_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit reports
CREATE POLICY "content_reports_insert_authenticated"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

-- Reporters can read their own submissions
CREATE POLICY "content_reports_select_own"
  ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Admins read and moderate all reports
CREATE POLICY "content_reports_admin_select"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "content_reports_admin_update"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "content_reports_admin_delete"
  ON public.content_reports FOR DELETE TO authenticated
  USING (public.is_admin());
