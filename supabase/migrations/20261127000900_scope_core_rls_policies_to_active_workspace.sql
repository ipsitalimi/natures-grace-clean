-- Workspace-scoped ownership policies for core commerce and practitioner data.
-- Existing users fall back to auth.uid() through current_workspace_profile_id().

drop policy if exists cart_sessions_delete_own on public.cart_sessions;
create policy cart_sessions_delete_own on public.cart_sessions for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists cart_sessions_insert_own on public.cart_sessions;
create policy cart_sessions_insert_own on public.cart_sessions for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists cart_sessions_select_own on public.cart_sessions;
create policy cart_sessions_select_own on public.cart_sessions for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists cart_sessions_update_own on public.cart_sessions;
create policy cart_sessions_update_own on public.cart_sessions for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists cart_items_delete_own on public.cart_items;
create policy cart_items_delete_own on public.cart_items for delete to authenticated using (exists (select 1 from public.cart_sessions cs where cs.id = cart_items.cart_session_id and cs.user_id = public.current_workspace_profile_id()));
drop policy if exists cart_items_insert_own on public.cart_items;
create policy cart_items_insert_own on public.cart_items for insert to authenticated with check (exists (select 1 from public.cart_sessions cs where cs.id = cart_items.cart_session_id and cs.user_id = public.current_workspace_profile_id()));
drop policy if exists cart_items_select_own on public.cart_items;
create policy cart_items_select_own on public.cart_items for select to authenticated using (exists (select 1 from public.cart_sessions cs where cs.id = cart_items.cart_session_id and cs.user_id = public.current_workspace_profile_id()));
drop policy if exists cart_items_update_own on public.cart_items;
create policy cart_items_update_own on public.cart_items for update to authenticated using (exists (select 1 from public.cart_sessions cs where cs.id = cart_items.cart_session_id and cs.user_id = public.current_workspace_profile_id())) with check (exists (select 1 from public.cart_sessions cs where cs.id = cart_items.cart_session_id and cs.user_id = public.current_workspace_profile_id()));

drop policy if exists favorite_items_delete_own on public.favorite_items;
create policy favorite_items_delete_own on public.favorite_items for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists favorite_items_insert_own on public.favorite_items;
create policy favorite_items_insert_own on public.favorite_items for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists favorite_items_select_own on public.favorite_items;
create policy favorite_items_select_own on public.favorite_items for select to authenticated using (user_id = public.current_workspace_profile_id());

drop policy if exists payment_methods_delete_own on public.payment_methods;
create policy payment_methods_delete_own on public.payment_methods for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists payment_methods_select_own on public.payment_methods;
create policy payment_methods_select_own on public.payment_methods for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists orders_insert_buyer on public.orders;
create policy orders_insert_buyer on public.orders for insert to authenticated with check (user_id = public.current_workspace_profile_id() and payment_status = 'Pending' and status = 'Pending');
drop policy if exists orders_select_scoped on public.orders;
create policy orders_select_scoped on public.orders for select to authenticated using (public.is_admin() or user_id = public.current_workspace_profile_id() or seller_id = public.current_seller_id());
drop policy if exists orders_update_seller on public.orders;
create policy orders_update_seller on public.orders for update to authenticated using (seller_id = public.current_seller_id()) with check (seller_id = public.current_seller_id());

drop policy if exists order_items_insert_buyer on public.order_items;
create policy order_items_insert_buyer on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = public.current_workspace_profile_id() and o.payment_status = 'Pending'));
drop policy if exists order_items_select_scoped on public.order_items;
create policy order_items_select_scoped on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_items.order_id and (public.is_admin() or o.user_id = public.current_workspace_profile_id() or o.seller_id = public.current_seller_id())));

drop policy if exists practitioner_bookings_insert_buyer on public.practitioner_bookings;
create policy practitioner_bookings_insert_buyer on public.practitioner_bookings for insert to authenticated with check (user_id = public.current_workspace_profile_id() and payment_status = 'Pending' and booking_status in ('Pending','Confirmed'));
drop policy if exists practitioner_bookings_select_scoped on public.practitioner_bookings;
create policy practitioner_bookings_select_scoped on public.practitioner_bookings for select to authenticated using (public.is_admin() or user_id = public.current_workspace_profile_id() or practitioner_id = public.current_practitioner_id());
drop policy if exists practitioner_bookings_update_practitioner on public.practitioner_bookings;
create policy practitioner_bookings_update_practitioner on public.practitioner_bookings for update to authenticated using (practitioner_id = public.current_practitioner_id()) with check (practitioner_id = public.current_practitioner_id());

drop policy if exists practitioner_session_history_select_scoped on public.practitioner_session_history;
create policy practitioner_session_history_select_scoped on public.practitioner_session_history for select to authenticated using (public.is_admin() or practitioner_id = public.current_practitioner_id() or exists (select 1 from public.practitioner_bookings b where b.id = practitioner_session_history.booking_id and b.user_id = public.current_workspace_profile_id()));
drop policy if exists practitioner_session_history_write_practitioner on public.practitioner_session_history;
create policy practitioner_session_history_write_practitioner on public.practitioner_session_history for all to authenticated using (practitioner_id = public.current_practitioner_id()) with check (practitioner_id = public.current_practitioner_id());

drop policy if exists practitioners_own_select on public.practitioners;
create policy practitioners_own_select on public.practitioners for select to authenticated using (profile_id = public.current_workspace_profile_id());
drop policy if exists practitioners_own_update on public.practitioners;
create policy practitioners_own_update on public.practitioners for update to authenticated using (profile_id = public.current_workspace_profile_id()) with check (profile_id = public.current_workspace_profile_id());

drop policy if exists practitioner_pricing_rules_select on public.practitioner_pricing_rules;
create policy practitioner_pricing_rules_select on public.practitioner_pricing_rules for select to authenticated using (public.is_admin() or exists (select 1 from public.practitioners p where p.id = practitioner_pricing_rules.practitioner_id and p.profile_id = public.current_workspace_profile_id()));

drop policy if exists products_select_seller_own on public.products;
create policy products_select_seller_own on public.products for select to authenticated using (seller_id = public.current_seller_id());
drop policy if exists products_insert_seller on public.products;
create policy products_insert_seller on public.products for insert to authenticated with check (seller_id = public.current_seller_id());
drop policy if exists products_update_seller on public.products;
create policy products_update_seller on public.products for update to authenticated using (seller_id = public.current_seller_id()) with check (seller_id = public.current_seller_id());
drop policy if exists products_delete_seller on public.products;
create policy products_delete_seller on public.products for delete to authenticated using (seller_id = public.current_seller_id());

drop policy if exists sellers_own on public.sellers;
create policy sellers_own on public.sellers for all to authenticated using (profile_id = public.current_workspace_profile_id()) with check (profile_id = public.current_workspace_profile_id());

drop policy if exists seller_promos_owner_all on public.seller_promos;
create policy seller_promos_owner_all on public.seller_promos for all to authenticated using (exists (select 1 from public.sellers s where s.id = seller_promos.seller_id and s.profile_id = public.current_workspace_profile_id())) with check (exists (select 1 from public.sellers s where s.id = seller_promos.seller_id and s.profile_id = public.current_workspace_profile_id()));

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists reviews_select_own on public.reviews;
create policy reviews_select_own on public.reviews for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists reviews_select_seller_products on public.reviews;
create policy reviews_select_seller_products on public.reviews for select to authenticated using (target_type = 'product' and product_id in (select p.id from public.products p join public.sellers s on s.id = p.seller_id where s.profile_id = public.current_workspace_profile_id()));
drop policy if exists reviews_update_authenticated on public.reviews;
create policy reviews_update_authenticated on public.reviews for update to authenticated using (public.is_admin() or user_id = public.current_workspace_profile_id() or (target_type = 'product' and product_id in (select p.id from public.products p join public.sellers s on s.id = p.seller_id where s.profile_id = public.current_workspace_profile_id()))) with check (public.is_admin() or user_id = public.current_workspace_profile_id() or (target_type = 'product' and product_id in (select p.id from public.products p join public.sellers s on s.id = p.seller_id where s.profile_id = public.current_workspace_profile_id())));
