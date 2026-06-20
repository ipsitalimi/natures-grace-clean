-- Phase A: Razorpay payment fields on store orders

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE INDEX IF NOT EXISTS orders_razorpay_payment_id_idx
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
