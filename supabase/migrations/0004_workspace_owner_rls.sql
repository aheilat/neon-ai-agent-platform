-- Browser policies for the independent staging project.
-- Sensitive credential and payment-response tables intentionally receive no
-- browser policy and remain accessible only through the server-side service role.

create or replace function public.neon_current_user_id()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.users where "supabaseUserId" = auth.uid() limit 1;
$$;

create or replace function public.neon_owns_tenant(target_tenant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.tenants
    where id = target_tenant_id and "ownerId" = public.neon_current_user_id()
  );
$$;

create policy "neon_users_read_self" on public.users
  for select using (id = public.neon_current_user_id());
create policy "neon_users_update_self" on public.users
  for update using (id = public.neon_current_user_id())
  with check (id = public.neon_current_user_id());

create policy "neon_tenants_owner_access" on public.tenants
  for all using ("ownerId" = public.neon_current_user_id())
  with check ("ownerId" = public.neon_current_user_id());

create policy "neon_agents_owner_access" on public.agents
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_knowledge_owner_access" on public.knowledge_base
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_conversations_owner_access" on public.conversations
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_leads_owner_access" on public.leads
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_channels_owner_access" on public.channel_integrations
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_team_members_owner_access" on public.team_members
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_team_invites_owner_access" on public.team_invites
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_team_assignments_owner_access" on public.team_member_assignments
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_notifications_owner_access" on public.workspace_notifications
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_push_owner_access" on public.push_subscriptions
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_preferences_owner_access" on public.notification_preferences
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_onboarding_owner_access" on public.onboarding_drafts
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_policy_owner_access" on public.tenant_data_policies
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));
create policy "neon_snapshots_owner_access" on public.website_snapshots
  for all using (public.neon_owns_tenant("tenantId"))
  with check (public.neon_owns_tenant("tenantId"));

create policy "neon_messages_owner_access" on public.messages
  for all using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages."conversationId"
        and public.neon_owns_tenant(conversations."tenantId")
    )
  ) with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages."conversationId"
        and public.neon_owns_tenant(conversations."tenantId")
    )
  );
