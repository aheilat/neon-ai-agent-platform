# Neon Supabase Database

This directory contains the **PostgreSQL target schema** for the dedicated `neon-ai-agent-platform` Supabase project. It is deliberately separate from the active MySQL/TiDB schema so that migration work does not alter the live Neon service.

## What has been prepared

The `0001_neon_initial_schema.sql` migration creates the tenant-isolated application schema, foreign-key relationships, integrity checks, update timestamps, indexes, and Row Level Security defaults. Direct browser table access is blocked until a future, separately reviewed Supabase Auth design exists.

Supabase may report informational lints that RLS is enabled without client policies. This is intentional at the preparation stage: no browser client is allowed to query the tables directly, and the existing authenticated Express/tRPC backend remains the only data path. Do not add broad `anon` policies merely to silence this notice.

## Migration sequence

1. Keep MySQL/TiDB as the live system of record.
2. Apply and verify this empty Supabase schema.
3. Export and map MySQL/TiDB rows in a private migration run.
4. Compare tenant, agent, conversation, message, lead, and subscription counts.
5. Run the full Neon test suite against a separate Supabase database configuration.
6. Obtain explicit approval before changing the live backend database connection.

## Secrets

Never commit a direct Postgres connection string, Supabase service-role key, payment credential, Meta credential, or OAuth secret. Keep Supabase connection data in project secrets only when the cutover test is approved.
