# Independent Environment Runbook

This runbook applies to the separate Render and Vercel staging deployments. It does **not** change the current managed Neon production domain.

## Configuration order

| Order | Variable group | Status | Source | Rule |
|---|---|---|---|---|
| 1 | `INDEPENDENT_DATABASE_URL` | Required | The dedicated Neon Supabase project | Use the Supabase **pooled Session pooler** connection string. Never use `DATABASE_URL` or a direct connection URI. |
| 2 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Required | The dedicated Neon Supabase project | `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the browser, GitHub, or chat. |
| 3 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Required | The dedicated Neon Supabase project | These are the browser-safe Supabase values used only for independent email/password sign-in. |
| 4 | `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` | Claude selected | Anthropic Console, encrypted server secret | `ANTHROPIC_API_KEY` is server-only. The adapter defaults to `claude-haiku-4-5`; do not send the key to the browser, GitHub, or chat. |
| 5 | Meta WhatsApp variables | Deferred | Meta app dashboard | Do not configure these for this first independent staging deployment; the Oman Drive webhook remains unchanged. |
| 6 | HyperPay variables | Deferred | HyperPay merchant dashboard | Configure only after the independent database, session, and public origin are verified. |

## Variables to retire from the independent deployment

The following managed-runtime values must not be copied into Render or Vercel as an attempt to make the external version work: `DATABASE_URL`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, and `VITE_FRONTEND_FORGE_API_KEY`.

They are tied to the current managed Neon runtime. The external version will replace them with Supabase Auth and independently owned AI provider credentials.

## WhatsApp staging boundary

The staging deployment must use a separate test configuration until Meta activates the application. Keep the existing webhook URL for the Oman Drive production phone unchanged. Only after a health check, signature verification, and a narrow test message succeed may a new staging endpoint be considered.

## Meta activation gate for customer self-connect

The observed Meta dashboard status is **App not active**. Until that status changes, the independent product must keep customer WhatsApp Embedded Signup disabled and must not add, replace, or redirect the Oman Drive production phone, webhook, or tokens.

For a platform that lets other companies connect their own WhatsApp assets, the operator must complete the following work in the Meta dashboard: first complete the App Dashboard basic information required before switching an app to Live; then submit only the required Advanced Access permissions — normally `whatsapp_business_management` and `whatsapp_business_messaging` — with a written explanation and a separate screen recording for each permission; finally switch the approved app to **Live**. Meta’s guidance states that development-mode apps cannot manage assets belonging to other businesses, and that client onboarding requires Advanced Access through App Review.

> Do not rotate a token, paste a secret, change the current Oman Drive webhook, or register a production number to resolve this status. Those are separate production changes that remain blocked until the app is active and the required review is approved.

- [Meta: Live Mode for production use](https://developers.facebook.com/blog/post/2019/09/23/live-mode-for-production-use/)
- [Meta: WhatsApp Business Platform App Review](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review)

## Safe operator workflow

Use the platform's encrypted environment-variable panel to enter values directly. A screenshot may be shared only when every token and password is obscured. Never save secrets in `.env` files, source code, issue comments, or GitHub commits.

## Provider references

The Claude adapter follows Anthropic's server-side API-key guidance: `ANTHROPIC_API_KEY` is a static server secret and must be rotated or revoked if exposure is suspected. The default `claude-haiku-4-5` is Anthropic's documented convenience alias for Claude Haiku 4.5.

- [Anthropic authentication documentation](https://platform.claude.com/docs/en/manage-claude/authentication)
- [Anthropic model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
