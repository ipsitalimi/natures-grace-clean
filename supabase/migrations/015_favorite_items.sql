-- Phase A: user favorites / saved items

CREATE TABLE IF NOT EXISTS public.favorite_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL
    CHECK (item_type IN ('practitioner', 'product', 'resource', 'event')),
  item_id TEXT NOT NULL,
  item_db_id UUID,
  display_name TEXT NOT NULL DEFAULT '',
  display_subtitle TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS favorite_items_user_type_item_idx
  ON public.favorite_items (user_id, item_type, item_id);

CREATE INDEX IF NOT EXISTS favorite_items_user_created_idx
  ON public.favorite_items (user_id, created_at DESC);

ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorite_items_select_own"
  ON public.favorite_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorite_items_insert_own"
  ON public.favorite_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "favorite_items_delete_own"
  ON public.favorite_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorite_items_select_admin"
  ON public.favorite_items FOR SELECT TO authenticated
  USING (public.is_admin());
