-- Keep event and course signup flows consistent with the existing schema.
-- Admin archive/unpublish actions retain the event/course and registration history.

-- Prevent accidental hard deletion from cascading away attendee/interest history.
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;

ALTER TABLE public.resource_enrollments
  DROP CONSTRAINT IF EXISTS resource_enrollments_resource_id_fkey;
ALTER TABLE public.resource_enrollments
  ADD CONSTRAINT resource_enrollments_resource_id_fkey
  FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE RESTRICT;

-- Keep a registrant's event/course details accessible after archive/unpublish,
-- while catalog screens continue to show only active/published items.
DROP POLICY IF EXISTS "events_select_registered_user" ON public.events;
CREATE POLICY "events_select_registered_user"
  ON public.events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_registrations r
      WHERE r.event_id = events.id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "resources_select_enrolled_user" ON public.resources;
CREATE POLICY "resources_select_enrolled_user"
  ON public.resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resource_enrollments e
      WHERE e.resource_id = resources.id AND e.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.validate_event_registration_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_is_visible BOOLEAN;
  event_status TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only register yourself for an event';
    END IF;
    IF NEW.status <> 'Registered'
      OR NEW.payment_status <> 'None'
      OR NEW.razorpay_payment_id IS NOT NULL
      OR NEW.amount_paid IS NOT NULL
    THEN
      RAISE EXCEPTION 'Event registration cannot set payment or administrative status';
    END IF;
  END IF;

  SELECT is_visible, status
    INTO event_is_visible, event_status
    FROM public.events
   WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF event_is_visible IS DISTINCT FROM TRUE OR event_status <> 'Active' THEN
    RAISE EXCEPTION 'This event is not accepting registrations';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_registration_validate_insert ON public.event_registrations;
CREATE TRIGGER event_registration_validate_insert
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_registration_insert();


CREATE OR REPLACE FUNCTION public.guard_event_registration_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own event registration';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.attendee_name IS DISTINCT FROM OLD.attendee_name
    OR NEW.attendee_email IS DISTINCT FROM OLD.attendee_email
    OR NEW.attendee_phone IS DISTINCT FROM OLD.attendee_phone
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id
    OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
  THEN
    RAISE EXCEPTION 'Registration details and payment fields cannot be changed by attendees';
  END IF;

  IF OLD.status <> 'Registered' OR NEW.status <> 'Cancelled' THEN
    RAISE EXCEPTION 'Attendees may only cancel an active registration';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_registration_guard_update ON public.event_registrations;
CREATE TRIGGER event_registration_guard_update
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_registration_update();


CREATE OR REPLACE FUNCTION public.validate_course_enrollment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resource_is_published BOOLEAN;
  resource_section TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only express interest for yourself';
    END IF;
    IF NEW.status <> 'Enrolled' THEN
      RAISE EXCEPTION 'Course interest must begin as Enrolled';
    END IF;
  END IF;

  SELECT is_published, section
    INTO resource_is_published, resource_section
    FROM public.resources
   WHERE id = NEW.resource_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  IF resource_is_published IS DISTINCT FROM TRUE OR resource_section <> 'Courses' THEN
    RAISE EXCEPTION 'This course is not accepting interest';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_enrollment_validate_insert ON public.resource_enrollments;
CREATE TRIGGER course_enrollment_validate_insert
  BEFORE INSERT ON public.resource_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_enrollment_insert();


CREATE OR REPLACE FUNCTION public.guard_course_enrollment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own course interest';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.resource_id IS DISTINCT FROM OLD.resource_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
  THEN
    RAISE EXCEPTION 'Course enrollment details cannot be changed by attendees';
  END IF;

  IF OLD.status <> 'Enrolled' OR NEW.status <> 'Cancelled' THEN
    RAISE EXCEPTION 'Attendees may only cancel an active course interest';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_enrollment_guard_update ON public.resource_enrollments;
CREATE TRIGGER course_enrollment_guard_update
  BEFORE UPDATE ON public.resource_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.guard_course_enrollment_update();
