# Neon Environment Variable Reference

Configure all runtime values through the deployment platform’s secret manager. Do not create an `.env`, `.env.local`, or `.env.example` file in this repository.

| Variable | Scope | Status | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Server | Active | Current managed MySQL/TiDB source of truth. |
| `JWT_SECRET` | Server | Active | Session signing. |
| `SUPABASE_URL` | Server or client only when needed | Prepared | API endpoint of the dedicated Supabase project. |
| `SUPABASE_PUBLISHABLE_KEY` | Client only when direct Supabase client access is designed | Prepared | Public, rotatable Supabase publishable key. |
| `SUPABASE_DATABASE_URL` | Server only | Pending approval | Direct Postgres connection for a future isolated migration test. Never expose this to the browser. |
| `WHATSAPP_ACCESS_TOKEN` | Server | Active | Meta WhatsApp API calls. |
| `WHATSAPP_APP_SECRET` | Server | Active | Webhook signature verification. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Server | Active | Webhook challenge verification. |
| `HYPERPAY_ENTITY_ID` and `HYPERPAY_ACCESS_TOKEN` | Server | Optional | Production HyperPay checkout. |

## Cutover boundary

`DATABASE_URL` must remain unchanged until a user-approved copy and validation of tenant, agent, conversation, message, lead, and subscription data succeeds. The new Supabase project is intentionally empty and separate at this stage.
