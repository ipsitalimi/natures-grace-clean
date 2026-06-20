-- Order number uniqueness and notification deep-link columns

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx
  ON public.orders (order_number);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link_route TEXT,
  ADD COLUMN IF NOT EXISTS link_target_id TEXT;

CREATE INDEX IF NOT EXISTS orders_user_pending_created_idx
  ON public.orders (user_id, created_at DESC)
  WHERE payment_status = 'Pending';
