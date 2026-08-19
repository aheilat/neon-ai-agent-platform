# Neon Supabase Migration Audit — 2026-08-20

## Current implementation

Neon is already a **full-stack application**. The public React application calls a protected Express and tRPC backend. The backend uses Drizzle ORM with `mysql2`, and the managed `DATABASE_URL` currently points to a MySQL/TiDB-compatible database. The schema contains tenant isolation, users, agents, knowledge, conversations, messages, leads, subscriptions, payment transactions, WhatsApp credentials, schedules, and privacy policies.

## Migration conclusion

Supabase is PostgreSQL-based. Switching the existing `DATABASE_URL` directly to a Supabase connection string is **not safe** because the project currently uses MySQL Drizzle dialect, MySQL column conventions, and MySQL migration SQL. A safe migration must run in parallel: create the Supabase project and PostgreSQL schema, map and validate data, then switch the server only after explicit approval and successful verification.

| Layer | Current state | Supabase migration requirement |
|---|---|---|
| Application frontend | React 19 + Tailwind | No required rewrite. |
| API backend | Express 4 + tRPC 11 | Preserve contracts; replace the database adapter only after the PostgreSQL schema is validated. |
| ORM | Drizzle with MySQL dialect | Add a separate PostgreSQL schema/configuration and migration stream. |
| Database | Managed MySQL/TiDB | Export, map, import, count-check, and only then cut over. |
| File storage | S3-compatible project storage | Keep as-is unless a separate product decision moves files to Supabase Storage. |
| Authentication | Manus OAuth | Keep as-is for now; moving identity to Supabase Auth is a separate product migration, not a database-only change. |

## Safety boundary

No production rows will be copied, deleted, or redirected until the user connects a Supabase project and explicitly approves the migration plan. The current database remains the live source of truth until a staged validation confirms tenant counts, agent counts, conversation counts, and subscription data are consistent.

## GitHub readiness

The project is suitable for GitHub sharing after adding a contributor-safe setup guide and ensuring `.env`, database URLs, payment secrets, Meta credentials, and token files remain excluded. The GitHub integration exists in the current workspace but is disabled; publishing a repository requires the user to enable and approve that integration, then confirm the GitHub owner and repository name.
