-- Phase A: seller orders + order items

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Guest',
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (payment_status IN ('Paid', 'Pending', 'Refunded')),
  delivery_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (delivery_status IN ('Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled')),
  delivery_option TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders (seller_id);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL DEFAULT 'General',
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Authenticated sellers/admins/users can read orders
CREATE POLICY "orders_select_authenticated"
  ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "order_items_select_authenticated"
  ON public.order_items FOR SELECT TO authenticated USING (true);

-- Buyers can create orders when logged in
CREATE POLICY "orders_insert_authenticated"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "order_items_insert_authenticated"
  ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);

-- Admin full control
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "order_items_admin_all"
  ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Sellers can update fulfillment status
CREATE POLICY "orders_seller_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Seller', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Seller', 'Admin')
    )
  );
