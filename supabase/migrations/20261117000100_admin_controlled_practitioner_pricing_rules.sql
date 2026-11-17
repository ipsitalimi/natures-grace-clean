-- Admin-controlled price ranges for practitioner session offerings.
-- Existing active offerings are preserved and backfilled into per-duration ranges.

CREATE TABLE IF NOT EXISTS public.practitioner_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_price >= 0),
  max_price NUMERIC(12,2) NOT NULL DEFAULT 10000 CHECK (max_price <= 10000),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT practitioner_pricing_rules_range_check CHECK (min_price <= max_price),
  CONSTRAINT practitioner_pricing_rules_unique_duration UNIQUE (practitioner_id, duration_minutes)
);

CREATE INDEX IF NOT EXISTS practitioner_pricing_rules_practitioner_idx
  ON public.practitioner_pricing_rules(practitioner_id, duration_minutes);

ALTER TABLE public.practitioner_pricing_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_pricing_rules TO authenticated;
GRANT ALL ON public.practitioner_pricing_rules TO service_role;

DROP POLICY IF EXISTS practitioner_pricing_rules_select ON public.practitioner_pricing_rules;
CREATE POLICY practitioner_pricing_rules_select
  ON public.practitioner_pricing_rules FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.practitioners p
      WHERE p.id = practitioner_pricing_rules.practitioner_id
        AND p.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS practitioner_pricing_rules_admin_insert ON public.practitioner_pricing_rules;
CREATE POLICY practitioner_pricing_rules_admin_insert
  ON public.practitioner_pricing_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS practitioner_pricing_rules_admin_update ON public.practitioner_pricing_rules;
CREATE POLICY practitioner_pricing_rules_admin_update
  ON public.practitioner_pricing_rules FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS practitioner_pricing_rules_admin_delete ON public.practitioner_pricing_rules;
CREATE POLICY practitioner_pricing_rules_admin_delete
  ON public.practitioner_pricing_rules FOR DELETE TO authenticated
  USING (public.is_admin());

-- Preserve each existing active offering's current price by seeding its
-- duration range from the min/max of its active offerings.
INSERT INTO public.practitioner_pricing_rules
  (practitioner_id, duration_minutes, is_enabled, min_price, max_price)
SELECT
  practitioner_id,
  duration_minutes,
  TRUE,
  GREATEST(0, MIN(price)),
  LEAST(10000, MAX(price))
FROM public.practitioner_offerings
WHERE practitioner_id IS NOT NULL AND is_active = TRUE
GROUP BY practitioner_id, duration_minutes
ON CONFLICT (practitioner_id, duration_minutes) DO NOTHING;

CREATE OR REPLACE FUNCTION public.guard_practitioner_offering_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.practitioner_pricing_rules%ROWTYPE;
  v_owner UUID;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT p.profile_id INTO v_owner
  FROM public.practitioners p
  WHERE p.id = NEW.practitioner_id
    AND p.approval_status = 'Approved'
    AND p.is_active = TRUE;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'You can only manage offerings for your own approved practitioner profile';
  END IF;

  -- Practitioners must always be able to unpublish an offering, even after
  -- the administrator disables its duration.
  IF NEW.is_active = FALSE THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS practitioner_offerings_pricing_guard ON public.practitioner_offerings;
CREATE TRIGGER practitioner_offerings_pricing_guard
  BEFORE INSERT OR UPDATE OF practitioner_id, duration_minutes, price, is_active
  ON public.practitioner_offerings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_practitioner_offering_pricing();

CREATE OR REPLACE FUNCTION public.touch_practitioner_pricing_rule_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_pricing_rules_updated_at ON public.practitioner_pricing_rules;
CREATE TRIGGER practitioner_pricing_rules_updated_at
  BEFORE UPDATE ON public.practitioner_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_practitioner_pricing_rule_updated_at();

NOTIFY pgrst, 'reload schema';
