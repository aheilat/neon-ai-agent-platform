# Independent Render Staging Handover

## Staging URL

The independently hosted staging service is available at:

`https://neon-ai-agent-platform.onrender.com`

## Validated on 25 August 2026

| Area | Result | Evidence |
| --- | --- | --- |
| Runtime separation | Passed | The independent runtime starts only with `INDEPENDENT_DATABASE_URL`; the managed OAuth callback is unavailable on Render. |
| Readiness | Passed | `GET /api/health` returns `ok: true`, `database: connected`, and `supabase: configured`. |
| Supabase authentication | Passed | A new email/password Supabase session created `workspace-1` and accessed only its own staging workspace. |
| PostgreSQL tenant data | Passed | The authenticated workspace loaded the isolated `Neon Concierge` staging agent. |
| Claude direct | Passed | An authenticated test request produced a live Arabic reply through the server-side Anthropic adapter. |
| Meta Access Verification | Passed | The owner provided evidence that the Tech Provider access verification is approved. |

## Security boundary preserved

The following production assets were not changed during this staging validation:

- The Manus-hosted production application and its domain.
- The managed MySQL/TiDB database and production customer data.
- The Oman Drive WhatsApp webhook and its current message routing.
- Meta WhatsApp credentials and production channel configuration.

The Anthropic key remains a Render server secret. Browser code sends only the Supabase access token to the protected independent API; it never receives an Anthropic API key.

## Current staging limitations

The Claude test box is a controlled validation feature, not the final end-user chat product. Its reply currently shows Markdown characters such as `**` and `##` as plain text; Markdown rendering is a future UI refinement. The independent database currently contains the initial Neon Concierge knowledge only, so richer responses require adding each customer’s website and knowledge data through the forthcoming onboarding workflow.

## Vercel remains separate

Do not create or redirect a Vercel deployment yet. If Vercel is later required, it should be configured as a separate independent deployment with the same isolated environment-variable set:

`INDEPENDENT_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and `NODE_ENV`.

Never copy Manus OAuth, Forge, managed-database, or Oman Drive WhatsApp secrets into an external staging host.
