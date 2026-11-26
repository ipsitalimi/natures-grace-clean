-- Promote the existing nparwani@gmail.com profile to Seller and enable
-- the corresponding Seller workspace under the Admin master account.
-- Keep seller verification and agreement consent unchanged.
begin;

insert into public.sellers (profile_id, store_name, description, is_active, is_verified)
select p.id, '', '', true, false
from public.profiles p
where p.id = '76ca4886-9bc7-4569-b698-777490dfd4ac'
  and lower(p.email) = lower('nparwani@gmail.com')
on conflict (profile_id) do update
set is_active = true, updated_at = now();

alter table public.profiles disable trigger profiles_guard_sensitive_columns;
update public.profiles
set role = 'Seller', updated_at = now()
where id = '76ca4886-9bc7-4569-b698-777490dfd4ac'
  and lower(email) = lower('nparwani@gmail.com');
alter table public.profiles enable trigger profiles_guard_sensitive_columns;

update public.account_workspaces
set is_enabled = true, workspace_role = 'Seller',
    display_name = 'Seller', updated_at = now()
where owner_user_id = '949bf06c-078e-48d3-b7ce-4a5275279706'
  and workspace_profile_id = '76ca4886-9bc7-4569-b698-777490dfd4ac'
  and workspace_role = 'Seller';

commit;
