drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = public.current_workspace_profile_id() or id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = public.current_workspace_profile_id() or id = auth.uid())
with check (id = public.current_workspace_profile_id() or id = auth.uid());
