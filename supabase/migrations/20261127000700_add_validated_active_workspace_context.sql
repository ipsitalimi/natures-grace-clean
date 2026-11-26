-- Resolve the currently selected workspace from a server-managed JWT claim.
-- The claim is never trusted by itself: it must match an enabled mapping owned
-- by the authenticated master account.
create or replace function public.current_workspace_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select aw.workspace_profile_id
      from public.account_workspaces aw
      join public.profiles p on p.id = aw.workspace_profile_id
      where aw.owner_user_id = auth.uid()
        and aw.workspace_profile_id =
          nullif(auth.jwt() -> 'app_metadata' ->> 'active_workspace_profile_id', '')::uuid
        and aw.is_enabled = true
        and p.status = 'Active'
      limit 1
    ),
    auth.uid()
  );
$$;

create or replace function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select aw.workspace_role
      from public.account_workspaces aw
      join public.profiles p on p.id = aw.workspace_profile_id
      where aw.owner_user_id = auth.uid()
        and aw.workspace_profile_id =
          nullif(auth.jwt() -> 'app_metadata' ->> 'active_workspace_profile_id', '')::uuid
        and aw.is_enabled = true
        and p.status = 'Active'
      limit 1
    ),
    (select p.role from public.profiles p where p.id = auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_workspace_role() = 'Admin';
$$;

create or replace function public.current_practitioner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.practitioners p
  where p.profile_id = public.current_workspace_profile_id()
    and p.is_active = true
    and p.approval_status = 'Approved'
  limit 1;
$$;

create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.sellers s
  where s.profile_id = public.current_workspace_profile_id()
    and s.is_active = true
  limit 1;
$$;

revoke all on function public.current_workspace_profile_id() from public, anon;
revoke all on function public.current_workspace_role() from public, anon;
grant execute on function public.current_workspace_profile_id() to authenticated, service_role;
grant execute on function public.current_workspace_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.current_practitioner_id() to authenticated, service_role;
grant execute on function public.current_seller_id() to authenticated, service_role;
