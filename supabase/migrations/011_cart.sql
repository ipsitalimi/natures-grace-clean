-- Phase A: persistent shopping cart and checkout state

CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_option TEXT NOT NULL DEFAULT 'standard',
  order_note TEXT NOT NULL DEFAULT '',
  checkout_status TEXT NOT NULL DEFAULT 'active'
    CHECK (checkout_status IN ('active', 'checkout', 'completed')),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cart_sessions_user_idx ON public.cart_sessions (user_id);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID NOT NULL REFERENCES public.cart_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  product_name TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL DEFAULT 'General',
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_session_id, product_id)
);

CREATE INDEX IF NOT EXISTS cart_items_session_idx ON public.cart_items (cart_session_id);

DROP TRIGGER IF EXISTS cart_sessions_updated_at ON public.cart_sessions;
CREATE TRIGGER cart_sessions_updated_at
  BEFORE UPDATE ON public.cart_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS cart_items_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_sessions_select_own"
  ON public.cart_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cart_sessions_insert_own"
  ON public.cart_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_sessions_update_own"
  ON public.cart_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_sessions_delete_own"
  ON public.cart_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cart_items_select_own"
  ON public.cart_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.id = cart_session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_insert_own"
  ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.id = cart_session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_update_own"
  ON public.cart_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.id = cart_session_id AND cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.id = cart_session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_items_delete_own"
  ON public.cart_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions cs
      WHERE cs.id = cart_session_id AND cs.user_id = auth.uid()
    )
  );
