-- Phase B: RLS security hardening (profiles, commerce, practitioner, reviews)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_seller_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.sellers s
  WHERE s.profile_id = auth.uid() AND s.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_practitioner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.practitioners p
  WHERE p.profile_id = auth.uid() AND p.is_active = true
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: signup + self-update guards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'User',
    'Active'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.status := OLD.status;
  NEW.email := OLD.email;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_sensitive_columns();

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders + order_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_seller_update" ON public.orders;

CREATE POLICY "orders_select_scoped"
  ON public.orders FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR seller_id = public.current_seller_id()
  );

CREATE POLICY "orders_insert_buyer"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND payment_status = 'Pending'
    AND status = 'Pending'
  );

CREATE OR REPLACE FUNCTION public.orders_guard_fulfillment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id = public.current_seller_id() THEN
    NEW.user_id := OLD.user_id;
    NEW.seller_id := OLD.seller_id;
    NEW.payment_status := OLD.payment_status;
    NEW.subtotal := OLD.subtotal;
    NEW.delivery_fee := OLD.delivery_fee;
    NEW.total := OLD.total;
    NEW.razorpay_order_id := OLD.razorpay_order_id;
    NEW.razorpay_payment_id := OLD.razorpay_payment_id;
    NEW.customer_name := OLD.customer_name;
    NEW.customer_email := OLD.customer_email;
    NEW.order_number := OLD.order_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_fulfillment_update ON public.orders;
CREATE TRIGGER orders_guard_fulfillment_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_guard_fulfillment_update();

CREATE POLICY "orders_update_seller"
  ON public.orders FOR UPDATE TO authenticated
  USING (seller_id = public.current_seller_id())
  WITH CHECK (seller_id = public.current_seller_id());

DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_authenticated" ON public.order_items;

CREATE POLICY "order_items_select_scoped"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          public.is_admin()
          OR o.user_id = auth.uid()
          OR o.seller_id = public.current_seller_id()
        )
    )
  );

CREATE POLICY "order_items_insert_buyer"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
        AND o.payment_status = 'Pending'
    )
  );

-- ---------------------------------------------------------------------------
-- Seller wallets / transactions / payouts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "seller_wallets_select_authenticated" ON public.seller_wallets;
DROP POLICY IF EXISTS "seller_wallets_seller_write" ON public.seller_wallets;
DROP POLICY IF EXISTS "seller_wallets_seller_update" ON public.seller_wallets;

CREATE POLICY "seller_wallets_select_scoped"
  ON public.seller_wallets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR seller_id = public.current_seller_id()
  );

CREATE POLICY "seller_wallets_insert_seller"
  ON public.seller_wallets FOR INSERT TO authenticated
  WITH CHECK (seller_id = public.current_seller_id());

CREATE POLICY "seller_wallets_update_seller"
  ON public.seller_wallets FOR UPDATE TO authenticated
  USING (seller_id = public.current_seller_id())
  WITH CHECK (seller_id = public.current_seller_id());

DROP POLICY IF EXISTS "wallet_transactions_select_authenticated" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_seller_insert" ON public.wallet_transactions;

CREATE POLICY "wallet_transactions_select_scoped"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = wallet_transactions.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  );

CREATE POLICY "wallet_transactions_insert_seller"
  ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = wallet_transactions.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  );

DROP POLICY IF EXISTS "seller_payouts_select_authenticated" ON public.seller_payouts;
DROP POLICY IF EXISTS "seller_payouts_seller_insert" ON public.seller_payouts;
DROP POLICY IF EXISTS "seller_payouts_seller_update" ON public.seller_payouts;

CREATE POLICY "seller_payouts_select_scoped"
  ON public.seller_payouts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = seller_payouts.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  );

CREATE POLICY "seller_payouts_insert_seller"
  ON public.seller_payouts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = seller_payouts.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  );

CREATE POLICY "seller_payouts_update_seller"
  ON public.seller_payouts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = seller_payouts.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seller_wallets w
      WHERE w.id = seller_payouts.wallet_id
        AND w.seller_id = public.current_seller_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Practitioner bookings + related
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "practitioner_bookings_select" ON public.practitioner_bookings;
DROP POLICY IF EXISTS "practitioner_bookings_insert" ON public.practitioner_bookings;
DROP POLICY IF EXISTS "practitioner_bookings_practitioner_update" ON public.practitioner_bookings;

CREATE POLICY "practitioner_bookings_select_scoped"
  ON public.practitioner_bookings FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR practitioner_id = public.current_practitioner_id()
  );

CREATE POLICY "practitioner_bookings_insert_buyer"
  ON public.practitioner_bookings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (
        payment_status = 'Pending'
        AND booking_status IN ('Pending', 'Confirmed')
      )
      OR (
        payment_status = 'Paid'
        AND booking_status = 'Confirmed'
        AND razorpay_payment_id IS NOT NULL
        AND btrim(razorpay_payment_id) <> ''
      )
    )
  );

CREATE OR REPLACE FUNCTION public.practitioner_bookings_guard_practitioner_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.practitioner_id = public.current_practitioner_id() THEN
    NEW.user_id := OLD.user_id;
    NEW.practitioner_id := OLD.practitioner_id;
    NEW.payment_status := OLD.payment_status;
    NEW.amount := OLD.amount;
    NEW.razorpay_payment_id := OLD.razorpay_payment_id;
    NEW.client_name := OLD.client_name;
    NEW.client_email := OLD.client_email;
    NEW.booking_number := OLD.booking_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_bookings_guard_practitioner_update ON public.practitioner_bookings;
CREATE TRIGGER practitioner_bookings_guard_practitioner_update
  BEFORE UPDATE ON public.practitioner_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioner_bookings_guard_practitioner_update();

CREATE POLICY "practitioner_bookings_update_practitioner"
  ON public.practitioner_bookings FOR UPDATE TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

DROP POLICY IF EXISTS "practitioner_session_history_select" ON public.practitioner_session_history;
DROP POLICY IF EXISTS "practitioner_session_history_practitioner_write" ON public.practitioner_session_history;

CREATE POLICY "practitioner_session_history_select_scoped"
  ON public.practitioner_session_history FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR practitioner_id = public.current_practitioner_id()
    OR EXISTS (
      SELECT 1 FROM public.practitioner_bookings b
      WHERE b.id = practitioner_session_history.booking_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "practitioner_session_history_write_practitioner"
  ON public.practitioner_session_history FOR ALL TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

DROP POLICY IF EXISTS "practitioner_wallets_select" ON public.practitioner_wallets;
DROP POLICY IF EXISTS "practitioner_wallets_practitioner_write" ON public.practitioner_wallets;

CREATE POLICY "practitioner_wallets_select_scoped"
  ON public.practitioner_wallets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR practitioner_id = public.current_practitioner_id()
  );

CREATE POLICY "practitioner_wallets_write_practitioner"
  ON public.practitioner_wallets FOR ALL TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

DROP POLICY IF EXISTS "practitioner_wallet_txn_select" ON public.practitioner_wallet_transactions;
DROP POLICY IF EXISTS "practitioner_wallet_txn_practitioner_write" ON public.practitioner_wallet_transactions;

CREATE POLICY "practitioner_wallet_txn_select_scoped"
  ON public.practitioner_wallet_transactions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_wallet_transactions.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  );

CREATE POLICY "practitioner_wallet_txn_write_practitioner"
  ON public.practitioner_wallet_transactions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_wallet_transactions.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_wallet_transactions.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  );

DROP POLICY IF EXISTS "practitioner_payouts_select" ON public.practitioner_payouts;
DROP POLICY IF EXISTS "practitioner_payouts_practitioner_write" ON public.practitioner_payouts;

CREATE POLICY "practitioner_payouts_select_scoped"
  ON public.practitioner_payouts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_payouts.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  );

CREATE POLICY "practitioner_payouts_write_practitioner"
  ON public.practitioner_payouts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_payouts.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioner_wallets w
      WHERE w.id = practitioner_payouts.wallet_id
        AND w.practitioner_id = public.current_practitioner_id()
    )
  );

DROP POLICY IF EXISTS "practitioner_offerings_select" ON public.practitioner_offerings;
DROP POLICY IF EXISTS "practitioner_offerings_practitioner_write" ON public.practitioner_offerings;

CREATE POLICY "practitioner_offerings_select_scoped"
  ON public.practitioner_offerings FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR practitioner_id = public.current_practitioner_id()
    OR is_active = true
  );

CREATE POLICY "practitioner_offerings_write_practitioner"
  ON public.practitioner_offerings FOR ALL TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

DROP POLICY IF EXISTS "practitioner_availability_select" ON public.practitioner_availability;
DROP POLICY IF EXISTS "practitioner_availability_practitioner_write" ON public.practitioner_availability;

CREATE POLICY "practitioner_availability_select_scoped"
  ON public.practitioner_availability FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR practitioner_id = public.current_practitioner_id()
    OR is_available = true
  );

CREATE POLICY "practitioner_availability_write_practitioner"
  ON public.practitioner_availability FOR ALL TO authenticated
  USING (practitioner_id = public.current_practitioner_id())
  WITH CHECK (practitioner_id = public.current_practitioner_id());

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;

CREATE POLICY "products_select_approved"
  ON public.products FOR SELECT TO authenticated
  USING (approval_status = 'Approved');

CREATE POLICY "products_select_seller_own"
  ON public.products FOR SELECT TO authenticated
  USING (seller_id = public.current_seller_id());

CREATE POLICY "products_insert_seller"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (seller_id = public.current_seller_id());

CREATE POLICY "products_update_seller"
  ON public.products FOR UPDATE TO authenticated
  USING (seller_id = public.current_seller_id())
  WITH CHECK (seller_id = public.current_seller_id());

CREATE POLICY "products_delete_seller"
  ON public.products FOR DELETE TO authenticated
  USING (seller_id = public.current_seller_id());

CREATE OR REPLACE FUNCTION public.products_guard_seller_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_id = public.current_seller_id() THEN
    NEW.seller_id := OLD.seller_id;
    NEW.approval_status := OLD.approval_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_guard_seller_update ON public.products;
CREATE TRIGGER products_guard_seller_update
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_guard_seller_update();

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_select_authenticated" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_seller_reply" ON public.reviews;

CREATE POLICY "reviews_select_approved"
  ON public.reviews FOR SELECT TO authenticated
  USING (status = 'Approved');

CREATE POLICY "reviews_select_practitioner_own"
  ON public.reviews FOR SELECT TO authenticated
  USING (practitioner_id = public.current_practitioner_id());

CREATE OR REPLACE FUNCTION public.reviews_before_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_seller_owner boolean;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    IF NEW.user_id = auth.uid() AND OLD.status = 'Pending' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot update review';
  END IF;

  is_seller_owner := OLD.target_type = 'product'
    AND OLD.product_id IN (
      SELECT p.id
      FROM public.products p
      INNER JOIN public.sellers s ON s.id = p.seller_id
      WHERE s.profile_id = auth.uid()
    );

  IF is_seller_owner THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.user_name := OLD.user_name;
    NEW.user_initial := OLD.user_initial;
    NEW.practitioner_name := OLD.practitioner_name;
    NEW.practitioner_id := OLD.practitioner_id;
    NEW.product_id := OLD.product_id;
    NEW.target_type := OLD.target_type;
    NEW.service_label := OLD.service_label;
    NEW.booking_id := OLD.booking_id;
    NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating;
    NEW.body := OLD.body;
    NEW.status := OLD.status;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  IF OLD.practitioner_id = public.current_practitioner_id() THEN
    RAISE EXCEPTION 'Practitioner cannot update reviews directly';
  END IF;

  RAISE EXCEPTION 'Cannot update review';
END;
$$;

DROP TRIGGER IF EXISTS reviews_before_update_guard ON public.reviews;
CREATE TRIGGER reviews_before_update_guard
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_before_update_guard();

CREATE POLICY "reviews_update_authenticated"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      target_type = 'product'
      AND product_id IN (
        SELECT p.id
        FROM public.products p
        INNER JOIN public.sellers s ON s.id = p.seller_id
        WHERE s.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      target_type = 'product'
      AND product_id IN (
        SELECT p.id
        FROM public.products p
        INNER JOIN public.sellers s ON s.id = p.seller_id
        WHERE s.profile_id = auth.uid()
      )
    )
  );
