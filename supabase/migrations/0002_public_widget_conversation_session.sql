alter table public.conversations
  add column if not exists "publicSessionTokenHash" text;

create index if not exists conversations_public_session_lookup_idx
  on public.conversations ("agentId", id, "publicSessionTokenHash")
  where "publicSessionTokenHash" is not null;
