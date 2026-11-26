drop policy if exists notification_reads_insert_own on public.notification_reads;
create policy notification_reads_insert_own on public.notification_reads for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists notification_reads_select_own on public.notification_reads;
create policy notification_reads_select_own on public.notification_reads for select to authenticated using (user_id = public.current_workspace_profile_id());

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id is null or user_id = public.current_workspace_profile_id());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists platform_promo_codes_select_applied_own_cart on public.platform_promo_codes;
create policy platform_promo_codes_select_applied_own_cart on public.platform_promo_codes for select to authenticated using (exists (select 1 from public.cart_sessions cs where cs.user_id = public.current_workspace_profile_id() and cs.platform_promo_id = platform_promo_codes.id));

drop policy if exists refund_requests_insert_own on public.refund_requests;
create policy refund_requests_insert_own on public.refund_requests for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists refund_requests_select_own on public.refund_requests;
create policy refund_requests_select_own on public.refund_requests for select to authenticated using (user_id = public.current_workspace_profile_id() or public.is_admin());

drop policy if exists booking_intro_messages_insert_participants on public.practitioner_booking_intro_messages;
create policy booking_intro_messages_insert_participants on public.practitioner_booking_intro_messages for insert to authenticated
with check (
 sender_id = public.current_workspace_profile_id()
 and exists (
  select 1 from public.practitioner_bookings b
  left join public.practitioners p on p.id = b.practitioner_id
  where b.id = practitioner_booking_intro_messages.booking_id
   and b.payment_status = 'Paid'
   and b.booking_status = 'Confirmed'
   and b.intro_chat_ends_at > now()
   and (b.user_id = public.current_workspace_profile_id() or p.profile_id = public.current_workspace_profile_id())
 )
);
drop policy if exists booking_intro_messages_select_participants on public.practitioner_booking_intro_messages;
create policy booking_intro_messages_select_participants on public.practitioner_booking_intro_messages for select to authenticated
using (
 exists (
  select 1 from public.practitioner_bookings b
  left join public.practitioners p on p.id = b.practitioner_id
  where b.id = practitioner_booking_intro_messages.booking_id
   and (b.user_id = public.current_workspace_profile_id() or p.profile_id = public.current_workspace_profile_id())
 )
);
