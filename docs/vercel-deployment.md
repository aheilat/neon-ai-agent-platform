# Vercel Deployment Guide

Neon can be imported into Vercel from the private repository `aheilat/neon-ai-agent-platform`. The project is a Vite client plus an Express/tRPC API, so it must use the repository's `vercel.json` rather than a front-end-only Vite deployment.

## Vercel import settings

| Setting | Value |
|---|---|
| Repository | `aheilat/neon-ai-agent-platform` |
| Project name | `neon-ai-agent-platform` |
| Framework preset | `Other` (the repository supplies `vercel.json`) |
| Root directory | `./` |
| Install command | Keep the repository default |
| Build command | Keep the repository default (`pnpm build:vercel`) |
| Output directory | Keep the repository default (`dist/public`) |

## Runtime model

The built React client is served from Vercel's static output. Every `/api/*` request is handled by `api/[...path].ts`, which creates the same Express application used by the managed Neon runtime. This includes tRPC, OAuth callbacks, WhatsApp webhook handling, and scheduled-sync authorization.

> Vercel Functions are request-driven and scale down when idle. The existing managed Neon deployment remains the recommended production target for Manus OAuth, Heartbeat schedules, Forge-backed storage, and Meta webhooks until their environment variables and operational behavior have been separately validated on Vercel.

## Current Vercel authentication status

The Vercel deployment is a **code-compatibility alternative**, not an approved customer-facing production environment yet. Its "Create account" and "Sign in" actions rely on the Manus OAuth application and an external live database. Vercel does not inherit either the managed Neon environment secrets or the OAuth configuration automatically.

Do **not** direct customers to the Vercel domain or use it for account creation until all of the following are explicitly completed and tested:

| Requirement | Why it is required |
|---|---|
| Vercel-specific OAuth redirect support | The login redirect is dynamically built from the active browser origin and must be accepted by the OAuth application. |
| A secure, independent `DATABASE_URL` reachable from Vercel | User profiles, tenants, agents, conversations, and billing are stored by the backend, not in the static site. |
| A Vercel-only `JWT_SECRET` and all required server and browser OAuth variables | The callback must exchange the login code and issue a host-only session safely. |
| A full browser test of registration, callback, session persistence, and logout | A successful static build alone does not prove authentication is safe or operational. |

Until that independent migration is approved, customers must use the primary application at `https://neonaiagent-nu42grqa.manus.space`. Do not copy managed Neon secrets into GitHub or chat, and do not place a Supabase password in Vercel before the planned database cutover.

## Required Vercel environment variables

Add server-side values in **Project Settings → Environment Variables**. Never paste these values into GitHub or variables beginning with `VITE_` unless the value is explicitly safe for browsers.

| Variable group | Required for |
|---|---|
| `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` | Core application and login |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | AI, storage, notifications, and project integrations |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID` | WhatsApp and Meta Embedded Signup |
| HyperPay credentials | Subscription checkout |

The dedicated Supabase project is prepared but is not the live database yet. Do not place its database password in Vercel or change `DATABASE_URL` until the approved PostgreSQL data migration and backend cutover are completed.

## Before deploying

Confirm that Vercel has access to the private GitHub repository. Set the Framework preset to **Other**, then add the required environment variables. Review the deployment configuration before pressing Deploy; Vercel cannot inherit the secrets that are automatically injected in the managed Neon environment.

> **Decision for the current release:** keep the managed Neon domain as the only public production URL. Treat Vercel as a staging deployment until the authentication and database requirements above are completed.

## References

Vercel documents that Express apps run as a single Vercel Function and that static assets must be provided through the deployment's static output rather than `express.static()`.[1] Vercel also documents the SPA rewrite used for Vite deep links.[2]

[1]: https://vercel.com/docs/frameworks/backend/express
[2]: https://vercel.com/docs/frameworks/frontend/vite
