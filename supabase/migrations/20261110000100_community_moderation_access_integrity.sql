-- Tighten discussion ownership and moderation access without changing the
-- existing discussion tables or public content model.

-- Moderation-only content must not be readable by ordinary community members.
DROP POLICY IF EXISTS "discussion_threads_select_authenticated" ON public.discussion_threads;
CREATE POLICY "discussion_threads_select_published_or_owner_or_admin"
  ON public.discussion_threads FOR SELECT TO authenticated
  USING (
    (visibility = 'Visible' AND moderation_status = 'Approved')
    OR author_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "discussion_replies_select_authenticated" ON public.discussion_replies;
CREATE POLICY "discussion_replies_select_published_or_owner_or_admin"
  ON public.discussion_replies FOR SELECT TO authenticated
  USING (
    moderation_status = 'Approved'
    AND EXISTS (
      SELECT 1
      FROM public.discussion_threads t
      WHERE t.id = thread_id
        AND t.visibility = 'Visible'
        AND t.moderation_status = 'Approved'
    )
    OR author_id = auth.uid()
    OR public.is_admin()
  );

-- Only the authenticated author may submit content, and all new community
-- content enters the existing moderation queue as Pending.
DROP POLICY IF EXISTS "discussion_threads_insert_authenticated" ON public.discussion_threads;
CREATE POLICY "discussion_threads_insert_own_pending"
  ON public.discussion_threads FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND visibility = 'Visible'
    AND moderation_status = 'Pending'
  );

DROP POLICY IF EXISTS "discussion_replies_insert_authenticated" ON public.discussion_replies;
CREATE POLICY "discussion_replies_insert_own_pending"
  ON public.discussion_replies FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND moderation_status = 'Pending'
    AND EXISTS (
      SELECT 1
      FROM public.discussion_threads t
      WHERE t.id = thread_id
        AND t.visibility = 'Visible'
        AND t.moderation_status = 'Approved'
    )
  );

-- Authors cannot approve, hide, or otherwise alter moderation state themselves.
-- Moderation updates remain available to admins through the existing UI.
DROP POLICY IF EXISTS "discussion_threads_update_author_or_admin" ON public.discussion_threads;
CREATE POLICY "discussion_threads_update_admin"
  ON public.discussion_threads FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "discussion_replies_update_author_or_admin" ON public.discussion_replies;
CREATE POLICY "discussion_replies_update_admin"
  ON public.discussion_replies FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
