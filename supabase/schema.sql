-- =====================================================================
-- Neon AI Agent Platform - Supabase PostgreSQL Production Schema
-- Supports Multi-tenancy, Extracted Website Personas, Plans & Quotas, Channels, and RLS
-- =====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Tenants Table (Multi-tenant isolation)
create table if not exists tenants (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  owner_open_id text not null,
  plan_tier text not null default 'free', -- 'free', 'solo', 'pro', 'enterprise'
  max_channels integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists tenants_owner_idx on tenants(owner_open_id);

-- 2. Agents Table (Stores extracted website persona, tone, language, and goals)
create table if not exists agents (
  id bigserial primary key,
  tenant_id bigint not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  persona text not null,
  tone text not null default 'professional',
  language text not null default 'bilingual', -- 'ar', 'en', 'bilingual'
  source_website_url text,
  last_website_sync_at timestamp with time zone,
  business_summary text,
  industry text,
  audience text,
  status text not null default 'active', -- 'active', 'paused'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists agents_tenant_idx on agents(tenant_id);

-- 3. Knowledge Base Table (With source tracking and metadata)
create table if not exists knowledge_base (
  id bigserial primary key,
  tenant_id bigint not null references tenants(id) on delete cascade,
  agent_id bigint not null references agents(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general', -- 'Website service', 'Website FAQ', 'Agent goal'
  source_url text,
  source_title text,
  source_fetched_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists kb_tenant_agent_idx on knowledge_base(tenant_id, agent_id);

-- 4. Channel Integrations Table (Tracking channel state, limits, and configuration)
create table if not exists channel_integrations (
  id bigserial primary key,
  tenant_id bigint not null references tenants(id) on delete cascade,
  agent_id bigint not null references agents(id) on delete cascade,
  channel text not null, -- 'web', 'whatsapp', 'instagram', 'messenger', 'telegram', 'tiktok', 'email', 'phone'
  is_active smallint not null default 0, -- 0 = inactive/disconnected, 1 = active/connected
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, agent_id, channel)
);

create index if not exists channels_tenant_agent_idx on channel_integrations(tenant_id, agent_id);

-- 5. Enable Row Level Security (RLS) across all tables
alter table tenants enable row level security;
alter table agents enable row level security;
alter table knowledge_base enable row level security;
alter table channel_integrations enable row level security;

-- 6. RLS Policies (Isolating tenants by owner or backend service role)
create policy "Tenants are viewable by owner" on tenants
  for all using (owner_open_id = current_setting('request.jwt.claim.sub', true) or current_setting('role', true) = 'service_role');

create policy "Agents isolated by tenant" on agents
  for all using (tenant_id in (select id from tenants where owner_open_id = current_setting('request.jwt.claim.sub', true)) or current_setting('role', true) = 'service_role');

create policy "Knowledge base isolated by tenant" on knowledge_base
  for all using (tenant_id in (select id from tenants where owner_open_id = current_setting('request.jwt.claim.sub', true)) or current_setting('role', true) = 'service_role');

create policy "Channel integrations isolated by tenant" on channel_integrations
  for all using (tenant_id in (select id from tenants where owner_open_id = current_setting('request.jwt.claim.sub', true)) or current_setting('role', true) = 'service_role');
