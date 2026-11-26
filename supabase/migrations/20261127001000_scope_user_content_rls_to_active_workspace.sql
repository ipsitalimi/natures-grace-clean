-- Workspace ownership for user-generated content and customer-facing records.

drop policy if exists event_registrations_insert_own on public.event_registrations;
create policy event_registrations_insert_own on public.event_registrations for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists event_registrations_select_own on public.event_registrations;
create policy event_registrations_select_own on public.event_registrations for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists event_registrations_update_own on public.event_registrations;
create policy event_registrations_update_own on public.event_registrations for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists resource_enrollments_insert_own on public.resource_enrollments;
create policy resource_enrollments_insert_own on public.resource_enrollments for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists resource_enrollments_select_own on public.resource_enrollments;
create policy resource_enrollments_select_own on public.resource_enrollments for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists resource_enrollments_update_own on public.resource_enrollments;
create policy resource_enrollments_update_own on public.resource_enrollments for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists journal_entries_delete_own on public.journal_entries;
create policy journal_entries_delete_own on public.journal_entries for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists journal_entries_insert_own on public.journal_entries;
create policy journal_entries_insert_own on public.journal_entries for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists journal_entries_select_own on public.journal_entries;
create policy journal_entries_select_own on public.journal_entries for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists journal_entries_update_own on public.journal_entries;
create policy journal_entries_update_own on public.journal_entries for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists gratitude_entries_delete_own on public.gratitude_entries;
create policy gratitude_entries_delete_own on public.gratitude_entries for delete to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists gratitude_entries_insert_own on public.gratitude_entries;
create policy gratitude_entries_insert_own on public.gratitude_entries for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists gratitude_entries_select_own on public.gratitude_entries;
create policy gratitude_entries_select_own on public.gratitude_entries for select to authenticated using (user_id = public.current_workspace_profile_id());
drop policy if exists gratitude_entries_update_own on public.gratitude_entries;
create policy gratitude_entries_update_own on public.gratitude_entries for update to authenticated using (user_id = public.current_workspace_profile_id()) with check (user_id = public.current_workspace_profile_id());

drop policy if exists discussion_threads_insert_authenticated on public.discussion_threads;
create policy discussion_threads_insert_authenticated on public.discussion_threads for insert to authenticated with check (public.current_workspace_profile_id() is not null);
drop policy if exists discussion_threads_update_author_or_admin on public.discussion_threads;
create policy discussion_threads_update_author_or_admin on public.discussion_threads for update to authenticated using (author_id = public.current_workspace_profile_id() or public.is_admin()) with check (author_id = public.current_workspace_profile_id() or public.is_admin());

drop policy if exists discussion_replies_insert_authenticated on public.discussion_replies;
create policy discussion_replies_insert_authenticated on public.discussion_replies for insert to authenticated with check (public.current_workspace_profile_id() is not null);
drop policy if exists discussion_replies_update_author_or_admin on public.discussion_replies;
create policy discussion_replies_update_author_or_admin on public.discussion_replies for update to authenticated using (author_id = public.current_workspace_profile_id() or public.is_admin()) with check (author_id = public.current_workspace_profile_id() or public.is_admin());

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets for insert to authenticated with check (requester_id = public.current_workspace_profile_id());
drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets for select to authenticated using (requester_id = public.current_workspace_profile_id());

drop policy if exists ticket_messages_insert_user on public.ticket_messages;
create policy ticket_messages_insert_user on public.ticket_messages for insert to authenticated with check (author_id = public.current_workspace_profile_id() and author_role = 'User' and exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.requester_id = public.current_workspace_profile_id()));
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages for select to authenticated using (exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and (t.requester_id = public.current_workspace_profile_id() or public.is_admin())));

drop policy if exists role_applications_insert_own on public.role_applications;
create policy role_applications_insert_own on public.role_applications for insert to authenticated with check (user_id = public.current_workspace_profile_id() and status = 'Pending');
drop policy if exists role_applications_select_own on public.role_applications;
create policy role_applications_select_own on public.role_applications for select to authenticated using (user_id = public.current_workspace_profile_id());

drop policy if exists application_documents_insert_own on public.application_documents;
create policy application_documents_insert_own on public.application_documents for insert to authenticated with check (exists (select 1 from public.role_applications ra where ra.id = application_documents.application_id and ra.user_id = public.current_workspace_profile_id()));
drop policy if exists application_documents_select_own on public.application_documents;
create policy application_documents_select_own on public.application_documents for select to authenticated using (exists (select 1 from public.role_applications ra where ra.id = application_documents.application_id and ra.user_id = public.current_workspace_profile_id()) or public.is_admin());

drop policy if exists content_reports_insert_authenticated on public.content_reports;
create policy content_reports_insert_authenticated on public.content_reports for insert to authenticated with check (reporter_id = public.current_workspace_profile_id() or reporter_id is null);
drop policy if exists content_reports_select_own on public.content_reports;
create policy content_reports_select_own on public.content_reports for select to authenticated using (reporter_id = public.current_workspace_profile_id());

drop policy if exists legal_acceptance_events_insert_own on public.legal_acceptance_events;
create policy legal_acceptance_events_insert_own on public.legal_acceptance_events for insert to authenticated with check (user_id = public.current_workspace_profile_id());
drop policy if exists legal_acceptance_events_select_own on public.legal_acceptance_events;
create policy legal_acceptance_events_select_own on public.legal_acceptance_events for select to authenticated using (user_id = public.current_workspace_profile_id() or public.is_admin());
