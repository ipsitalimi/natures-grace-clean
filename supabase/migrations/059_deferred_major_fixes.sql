-- Practitioner review replies + safer review update guard

CREATE OR REPLACE FUNCTION public.reviews_before_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_seller_owner boolean;
  is_practitioner_owner boolean;
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

  is_practitioner_owner := OLD.target_type <> 'product'
    AND OLD.practitioner_id = public.current_practitioner_id();

  IF is_practitioner_owner THEN
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
    NEW.seller_reply := COALESCE(NEW.seller_reply, '');
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Cannot update review';
END;
$$;
