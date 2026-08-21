# Independent Neon Architecture

## Purpose and safety boundary

This document defines the target architecture for the external Neon version selected by the owner. It is a separate staging system for Render and Vercel. The managed Neon deployment remains unchanged until all staged acceptance checks pass; its production domain, database, Meta webhook, and customer traffic must not be redirected during this work.

| Concern | Independent target | Current managed dependency to remove |
|---|---|---|
| Database | The existing isolated Supabase PostgreSQL project, with its schema applied through controlled migrations | MySQL/TiDB connection injected by the managed environment |
| Authentication | Supabase Auth, starting with confirmed email and password | Manus OAuth portal and callback routes |
| Browser session | Supabase access token handled by the Supabase client, with server-side token verification for protected API calls | Managed Neon session cookie issued after Manus OAuth |
| AI routing | A server-only provider adapter with independent provider credentials and the same fallback policy | Built-in Forge LLM proxy and its injected credentials |
| File storage | Supabase Storage or a separately owned S3-compatible bucket, selected before file migration | Forge-backed storage proxy |
| Hosting | Render Node web service for the full application; Vercel as a separately configured preview/serverless target | Managed Neon runtime |

## Authentication decision

The first independent sign-in flow will use Supabase email-and-password authentication with email confirmation enabled. Hosted Supabase projects enable email confirmation by default, and the confirmation redirect must be listed in the project redirect-URL allowlist.[1]

The production browser URLs will be added only after the Render and Vercel staging hostnames exist. No wildcard redirect URL will be used. Password reset and confirmation links will point to explicit, public application routes owned by the external version.

The current Supabase migration enables RLS on all application tables but intentionally contains no browser-facing policies. This is safe for the empty staging database, but Supabase Auth cannot be exposed to the browser until a reviewed ownership model maps `auth.users` identities to the application `users` and tenant tables and adds narrowly scoped tenant policies. Until then, the Express service remains the only approved data-access layer.

## Database decision

The existing Supabase project is a separate, active PostgreSQL target in `ap-south-1`. Its public schema contains the Neon tenant, agent, knowledge, conversation, notification, channel, onboarding, website, subscription, and payment tables. All inspected application tables have row-level security enabled and contain zero rows. Two migrations—`neon_initial_schema` and `harden_function_search_path`—are already applied.

Schema work must remain in version-controlled migration files and be applied in order. The external staging database will receive **schema first, no production data by default**. Any later tenant-data migration requires a backup, a dry run, tenant-by-tenant validation, and explicit owner approval.

> **Current compatibility gate:** the running Neon server imports `drizzle-orm/mysql2` and MySQL schema definitions. It cannot use the Supabase PostgreSQL connection string safely until the data-access layer, schema typing, and authentication context are migrated. The external connection string was verified in the Supabase dashboard but has intentionally not been copied into Render.

## Data-access migration scope

The current `server/db.ts` combines more than one responsibility. The independent conversion will preserve its public behaviour but split it into tested PostgreSQL repositories in this order:

| Repository group | Current responsibilities | Migration order |
|---|---|---|
| Identity and workspace | User lookup, tenant creation, and default workspace agent | First; required for Supabase Auth sessions. |
| Agents and knowledge | Agents, capability packs, knowledge items, and website snapshots | Second; required for onboarding and agent replies. |
| Conversations and leads | Conversations, messages, handoffs, and lead capture | Third; required for widget and WhatsApp staging tests. |
| Team and notifications | Members, assignments, browser preferences, and notifications | Fourth; required for human handoff. |
| Billing and channels | Subscriptions, payment records, channel credentials, and WhatsApp configuration | Last; not enabled until external checkout and Meta staging acceptance. |

The managed MySQL implementation will remain in place until the independent repositories meet the same tenant-scoping tests. No generic switch based only on `DATABASE_URL` is permitted.

## AI routing decision

The independent service will retain the product behaviour—fast default model with fallback capability—but provider keys will be stored only in the external host's encrypted environment settings. The client will never receive an AI provider secret. Provider selection, quota controls, and error logging will run in the Express server.

The managed Forge key cannot be treated as an external production credential. Before independent AI testing, the owner must choose and provide separately billed access for the target providers or one approved multi-provider gateway. The first external test will use one provider, then add fallback providers after server-side credentials are verified.

## Acceptance gate

The external version may receive only internal test traffic until all checks below succeed:

| Gate | Evidence required |
|---|---|
| Supabase schema | Migration history and a clean staging tenant |
| Registration | Confirmed email, login, logout, and password reset on the external hostname |
| Tenant isolation | One test workspace cannot read another workspace's data |
| AI response | A server-side response using an independently configured provider key |
| Files | Upload and retrieval through an independently owned storage service |
| WhatsApp | Meta app active, staging webhook explicitly configured, and a narrow test message accepted |

## References

[1] [Supabase: Password-based Auth](https://supabase.com/docs/guides/auth/passwords)

[2] [Supabase: Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
