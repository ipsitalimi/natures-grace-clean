-- Practitioners can read/update their own profile row (photo, bio, meeting link, etc.)

CREATE POLICY "practitioners_own_select"
  ON public.practitioners FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "practitioners_own_update"
  ON public.practitioners FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
