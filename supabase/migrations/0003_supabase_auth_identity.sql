-- Map each Supabase Auth identity to the tenant-isolated Neon user record.
-- This migration operates only on the independent, empty Supabase staging project.

alter table public.users
  add column if not exists "supabaseUserId" uuid unique;

create or replace function public.neon_sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (
    "openId",
    "supabaseUserId",
    email,
    name,
    "loginMethod"
  )
  values (
    new.id::text,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'supabase'
  )
  on conflict ("openId") do update
    set "supabaseUserId" = excluded."supabaseUserId",
        email = excluded.email,
        name = coalesce(excluded.name, public.users.name),
        "loginMethod" = 'supabase',
        "lastSignedIn" = now();
  return new;
end;
$$;

drop trigger if exists neon_auth_user_created on auth.users;
create trigger neon_auth_user_created
  after insert on auth.users
  for each row execute procedure public.neon_sync_auth_user();
