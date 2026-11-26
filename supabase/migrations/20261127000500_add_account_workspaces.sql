-- Additive account-to-workspace mapping for the single-login workspace feature.
-- This migration deliberately preserves all existing auth users, profiles and role data.
create table if not exists public.account_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  workspace_profile_id uuid not null references public.profiles(id) on delete restrict,
  workspace_role text not null check (workspace_role in ('Admin','User','Practitioner','Seller')),
  display_name text not null,
  is_default boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_workspaces_owner_profile_unique unique (owner_user_id, workspace_profile_id)
);
create index if not exists account_workspaces_owner_enabled_idx
  on public.account_workspaces(owner_user_id, is_enabled);
alter table public.account_workspaces enable row level security;
drop policy if exists account_workspaces_select_own on public.account_workspaces;
create policy account_workspaces_select_own
  on public.account_workspaces for select to authenticated
  using (owner_user_id = auth.uid());
revoke insert, update, delete on public.account_workspaces from anon, authenticated;
grant select on public.account_workspaces to authenticated;

insert into public.account_workspaces
  (owner_user_id, workspace_profile_id, workspace_role, display_name, is_default, is_enabled)
values
  ('949bf06c-078e-48d3-b7ce-4a5275279706','949bf06c-078e-48d3-b7ce-4a5275279706','Admin','Admin',true,true),
  ('949bf06c-078e-48d3-b7ce-4a5275279706','ff72d07b-29f7-4c73-b110-47b5000497dc','Practitioner','Practitioner',false,true),
  ('949bf06c-078e-48d3-b7ce-4a5275279706','f40d319b-e74c-43d8-ac79-3a5ee3467e3a','User','Customer',false,true),
  ('949bf06c-078e-48d3-b7ce-4a5275279706','76ca4886-9bc7-4569-b698-777490dfd4ac','Seller','Seller',false,true)
on conflict (owner_user_id, workspace_profile_id) do update
set workspace_role = excluded.workspace_role,
    display_name = excluded.display_name,
    is_default = excluded.is_default,
    is_enabled = excluded.is_enabled,
    updated_at = now();
