-- =============================================================================
-- ONE-TIME bootstrap: limiipista@gmail.com → Admin
-- Run in Supabase Dashboard → SQL Editor (must be postgres / supabase_admin).
-- Joins auth.users ↔ public.profiles by id only.
-- =============================================================================

BEGIN;

SET LOCAL row_security = off;

-- ---------------------------------------------------------------------------
-- 1) Session + diagnostics (read output before bootstrap runs)
-- ---------------------------------------------------------------------------
SELECT current_user AS session_user, session_user AS session_role;

SELECT 'auth.users' AS source, u.id, u.email, u.created_at
FROM auth.users AS u
WHERE u.email ILIKE 'limiipista@gmail.com';

SELECT 'public.profiles' AS source, p.id, p.email, p.role, p.status
FROM public.profiles AS p
WHERE p.email ILIKE 'limiipista@gmail.com';

SELECT 'join_by_id' AS source, u.id, u.email AS auth_email, p.email AS profile_email, p.role
FROM auth.users AS u
INNER JOIN public.profiles AS p ON p.id = u.id
WHERE u.email ILIKE 'limiipista@gmail.com'
   OR p.email ILIKE 'limiipista@gmail.com';

SELECT 'orphan_profiles' AS source, p.id, p.email, p.role
FROM public.profiles AS p
WHERE p.email ILIKE 'limiipista@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = p.id);

SELECT 'auth_without_profile' AS source, u.id, u.email
FROM auth.users AS u
WHERE u.email ILIKE 'limiipista@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = u.id);

-- ---------------------------------------------------------------------------
-- 2) Resolve target UUID (auth.users first, then profiles — never email WHERE on UPDATE)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_target_id uuid;
  v_auth_email text;
  v_profile_email text;
  v_rows int;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Wrong session user "%". Open Dashboard → SQL Editor (postgres).', current_user;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'Admin') THEN
    RAISE EXCEPTION 'An Admin already exists. Bootstrap refused.';
  END IF;

  SELECT u.id, u.email
  INTO v_target_id, v_auth_email
  FROM auth.users AS u
  WHERE u.email ILIKE 'limiipista@gmail.com'
  ORDER BY u.created_at
  LIMIT 1;

  IF v_target_id IS NULL THEN
    SELECT p.id, p.email
    INTO v_target_id, v_profile_email
    FROM public.profiles AS p
    WHERE p.email ILIKE 'limiipista@gmail.com'
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION
      'No row in auth.users or public.profiles for limiipista@gmail.com. Create the user under Authentication → Users, then re-run.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_target_id) THEN
    RAISE EXCEPTION
      'Profile id % exists but auth.users row is missing (FK broken). Delete the orphan profile row or recreate the auth user with the same UUID before bootstrap.',
      v_target_id;
  END IF;

  -- Repair: auth user exists, profile row missing (signup trigger failed)
  INSERT INTO public.profiles (id, email, full_name, role, status)
  SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    'User',
    'Active'
  FROM auth.users AS u
  WHERE u.id = v_target_id
  ON CONFLICT (id) DO NOTHING;

  -- Repair: ids match but stored emails diverged (common when profiles.email ≠ auth.users.email)
  UPDATE public.profiles AS p
  SET email = u.email
  FROM auth.users AS u
  WHERE p.id = v_target_id
    AND u.id = v_target_id
    AND p.email IS DISTINCT FROM u.email;

  -- ---------------------------------------------------------------------------
  -- 3) Promote by id (guard disabled only inside this transaction)
  -- ---------------------------------------------------------------------------
  BEGIN
    ALTER TABLE public.profiles DISABLE TRIGGER profiles_guard_sensitive_columns;

    UPDATE public.profiles
    SET role = 'Admin'
    WHERE id = v_target_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      ALTER TABLE public.profiles ENABLE TRIGGER profiles_guard_sensitive_columns;
      RAISE;
  END;

  ALTER TABLE public.profiles ENABLE TRIGGER profiles_guard_sensitive_columns;

  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'UPDATE affected % row(s) for id %. Expected exactly 1.', v_rows, v_target_id;
  END IF;

  RAISE NOTICE 'Bootstrap OK: id=%, auth_email=%, profile_email=%',
    v_target_id,
    (SELECT email FROM auth.users WHERE id = v_target_id),
    (SELECT email FROM public.profiles WHERE id = v_target_id);
END $$;

-- ---------------------------------------------------------------------------
-- 4) Verify final role
-- ---------------------------------------------------------------------------
SELECT
  u.id,
  u.email AS auth_email,
  p.email AS profile_email,
  p.role,
  p.status
FROM auth.users AS u
INNER JOIN public.profiles AS p ON p.id = u.id
WHERE u.id = (
  SELECT COALESCE(
    (SELECT u2.id FROM auth.users AS u2 WHERE u2.email ILIKE 'limiipista@gmail.com' LIMIT 1),
    (SELECT p2.id FROM public.profiles AS p2 WHERE p2.email ILIKE 'limiipista@gmail.com' LIMIT 1)
  )
);

COMMIT;
