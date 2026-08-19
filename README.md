# Neon AI Agent Platform

Neon is a tenant-isolated, Arabic-first omnichannel AI-agent platform. Businesses can create agents, learn from their websites and knowledge sources, answer customers across web and WhatsApp, capture leads, escalate to human teams, and measure operational quality.

## Current architecture

| Layer | Implementation |
|---|---|
| Front end | React 19, Vite, Tailwind CSS 4, shadcn/ui-style components |
| Backend | Express 4, tRPC 11, Vitest |
| Live database | Managed MySQL/TiDB via Drizzle ORM |
| Prepared database target | Dedicated Supabase PostgreSQL project with an empty, tenant-isolated schema under `supabase/migrations/` |
| Authentication | Manus OAuth |
| AI routing | Claude Haiku default, with Gemini and OpenAI fallbacks |
| Payments | HyperPay integration |
| Messaging | Meta WhatsApp Cloud API with Embedded Signup infrastructure |

## Status of the Supabase migration

The dedicated Supabase project contains the reviewed PostgreSQL schema and has no migrated production records. MySQL/TiDB remains the live source of truth until a separately approved data-copy validation and backend cutover are completed. This prevents data loss and prevents accidental mixing with any other project.

> Do not replace `DATABASE_URL` with a Supabase connection string until the migration validation checklist in `supabase/README.md` is complete.

## Local development

1. Install Node.js 22+ and pnpm.
2. Configure credentials through the project’s secret manager; do not create or commit environment files from this repository.
3. Install dependencies with `pnpm install`.
4. Run `pnpm dev`.
5. Validate types with `pnpm check` and run tests with `pnpm test`.

## Environment variables

Never commit any values from `.env.local`. The server needs the live database URL and OAuth configuration. WhatsApp, HyperPay, and AI integration credentials must remain server-side only.

Use the project secret manager to add values. `docs/environment-variables.md` documents the variable names and whether each one is currently required; it intentionally contains no credentials or `.env` file.

| Variable | Purpose | Required now |
|---|---|---|
| `DATABASE_URL` | Active MySQL/TiDB production database connection | Yes for the current backend |
| `SUPABASE_URL` | Prepared Supabase API endpoint for future migration work | No |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe key for a future direct Supabase integration | No |
| `SUPABASE_DATABASE_URL` | Server-only PostgreSQL connection for a future cutover test | No; never expose it in the browser |
| `WHATSAPP_ACCESS_TOKEN` | Server-only Meta WhatsApp access token | Optional, needed for WhatsApp runtime |
| `WHATSAPP_APP_SECRET` | Server-only Meta application secret | Optional, needed for webhook signature validation |
| `HYPERPAY_*` | Server-only payment gateway credentials | Optional, needed for production payments |

## Database and tenant safety

All business records are scoped to a tenant/workspace. The Supabase target schema enables Row Level Security by default and does not expose direct browser table access. Retaining the Express/tRPC backend during the migration keeps the current authorization and tenant-isolation rules intact.

## GitHub contribution rules

The repository is intended to be private. Do not commit real keys, database URLs, `.env` files, webhook payloads, downloaded customer data, payment responses, Meta tokens, or service-role keys. Review database migrations and run `pnpm check && pnpm test --run` before opening a pull request.

## Key documentation

- `supabase/README.md` — Supabase target schema and safe cutover sequence.
- `docs/supabase-migration-audit-2026-08-20.md` — current MySQL/TiDB to PostgreSQL migration assessment.
- `docs/meta-access-verification-submission-2026-08-19.md` — current Meta approval state.
