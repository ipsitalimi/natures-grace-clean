-- Allow practitioners to deactivate their own offerings even if their
-- practitioner profile is no longer approved or active. Publishing and
-- editing active offerings still requires an approved, active profile.

CREATE OR REPLACE FUNCTION public.guard_practitioner_offering_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_approval_status TEXT;
  v_practitioner_active BOOLEAN;
  v_rule public.practitioner_pricing_rules%ROWTYPE;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT p.profile_id, p.approval_status, p.is_active
    INTO v_owner, v_approval_status, v_practitioner_active
  FROM public.practitioners p
  WHERE p.id = NEW.practitioner_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'You can only manage offerings for your own practitioner profile';
  END IF;

  IF NEW.is_active = FALSE THEN
    RETURN NEW;
  END IF;

  IF v_approval_status <> 'Approved' OR v_practitioner_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Only approved, active practitioners can publish session offerings';
  END IF;

  SELECT * INTO v_rule
  FROM public.practitioner_pricing_rules r
  WHERE r.practitioner_id = NEW.practitioner_id
    AND r.duration_minutes = NEW.duration_minutes;

  IF NOT FOUND OR NOT v_rule.is_enabled THEN
    RAISE EXCEPTION 'This session duration is not enabled by the administrator';
  END IF;

  IF NEW.price < v_rule.min_price OR NEW.price > v_rule.max_price THEN
    RAISE EXCEPTION 'Session price must be between % and % INR for this duration',
      v_rule.min_price, v_rule.max_price;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
