-- Gratitude moderation: report queue + admin removal

-- 1) Expand content_reports.target_type check constraint to include 'gratitude'
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.content_reports'::regclass
      AND contype = 'c'
      AND conname ILIKE '%target_type%check%'
  LOOP
    EXECUTE format('ALTER TABLE public.content_reports DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN (
    'discussion_thread',
    'discussion_reply',
    'review',
    'event',
    'product',
    'other',
    'gratitude'
  ));

-- 2) Allow admins to moderate gratitude entries (delete/hide + resolve author)
CREATE POLICY "gratitude_entries_admin_select"
  ON public.gratitude_entries FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "gratitude_entries_admin_update"
  ON public.gratitude_entries FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "gratitude_entries_admin_delete"
  ON public.gratitude_entries FOR DELETE TO authenticated
  USING (public.is_admin());

