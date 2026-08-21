# Independent Environment Runbook

This runbook applies to the separate Render and Vercel staging deployments. It does **not** change the current managed Neon production domain.

## Configuration order

| Order | Variable group | Status | Source | Rule |
|---|---|---|---|---|
| 1 | `NODE_ENV`, `JWT_SECRET` | Safe baseline | Render-generated secret | `NODE_ENV=production`; let Render generate `JWT_SECRET`. |
| 2 | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Prepared | The dedicated Neon Supabase project | The publishable key may be used by browser code only after RLS and Supabase Auth flows are reviewed. |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Pending | Supabase dashboard, server-only secret | Never expose to the browser, GitHub, or chat. |
| 4 | `INDEPENDENT_DATABASE_URL` | Blocked by code migration | Supabase **pooled** connection string | Enter only after the Express data layer supports PostgreSQL. Do not use the direct connection URI currently shown in the dashboard. |
| 5 | `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` | Claude selected | Anthropic Console, encrypted server secret | `ANTHROPIC_API_KEY` is server-only. The adapter defaults to `claude-haiku-4-5`; do not send the key to the browser, GitHub, or chat. |
| 6 | Meta WhatsApp variables | Blocked by Meta activation | Meta app dashboard | Configure in staging only; do not replace the current Oman Drive webhook. |
| 7 | HyperPay variables | Pending checkout acceptance test | HyperPay merchant dashboard | Configure after the database, user session, and public origin are verified. |

## Variables to retire from the independent deployment

The following managed-runtime values must not be copied into Render or Vercel as an attempt to make the external version work: `DATABASE_URL`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, and `VITE_FRONTEND_FORGE_API_KEY`.

They are tied to the current managed Neon runtime. The external version will replace them with Supabase Auth and independently owned AI provider credentials.

## WhatsApp staging boundary

The staging deployment must use a separate test configuration until Meta activates the application. Keep the existing webhook URL for the Oman Drive production phone unchanged. Only after a health check, signature verification, and a narrow test message succeed may a new staging endpoint be considered.

## Safe operator workflow

Use the platform's encrypted environment-variable panel to enter values directly. A screenshot may be shared only when every token and password is obscured. Never save secrets in `.env` files, source code, issue comments, or GitHub commits.
