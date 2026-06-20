-- Phase A: support tickets and ticket messages

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL NOT NULL,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  priority TEXT NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_number)
);

CREATE INDEX IF NOT EXISTS support_tickets_requester_idx
  ON public.support_tickets (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON public.support_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_assignee_idx
  ON public.support_tickets (assignee_id)
  WHERE assignee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Support',
  author_role TEXT NOT NULL DEFAULT 'Staff'
    CHECK (author_role IN ('User', 'Staff')),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx
  ON public.ticket_messages (ticket_id, created_at ASC);

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select_own"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "support_tickets_select_admin"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "support_tickets_update_admin"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "support_tickets_delete_admin"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "ticket_messages_select"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.requester_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ticket_messages_insert_user"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND author_role = 'User'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.requester_id = auth.uid()
    )
  );

CREATE POLICY "ticket_messages_insert_staff"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND author_role = 'Staff'
  );

CREATE POLICY "ticket_messages_update_admin"
  ON public.ticket_messages FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "ticket_messages_delete_admin"
  ON public.ticket_messages FOR DELETE TO authenticated
  USING (public.is_admin());
