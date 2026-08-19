-- Harden the function already created in the initial migration.
alter function public.neon_set_updated_at() set search_path = public, pg_temp;
