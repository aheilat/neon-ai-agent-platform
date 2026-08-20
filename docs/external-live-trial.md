# External Live Trial: Vercel and Render

## Status

This repository is now prepared for an **external staging trial**, but it is not ready to receive public customers from Vercel or Render yet. The managed Neon URL remains the single production URL while the independent database, OAuth redirect support, and Meta activation are completed.

| Target | Role | Current state | Do not use it for yet |
|---|---|---|---|
| `neonaiagent-nu42grqa.manus.space` | Primary production application | Working and verified | None of the existing supported product journeys |
| Vercel | Serverless compatibility and preview environment | Code configuration is ready; OAuth sign-up is not independently configured | Customer registration, live WhatsApp webhook, or billing |
| Render | Full Node/Express staging service | `render.yaml` is ready; no external service has been created | Customer traffic until environment checks pass |

> **Security rule:** Never copy managed Neon secrets into GitHub, chat, or a browser-visible Vite variable. Each external host must receive its own approved secret values through its secure environment-variable interface.

## Render staging blueprint

The repository root contains `render.yaml`. It creates one Node web service named `neon-ai-agent-platform-staging`, builds the React client and Express server with `pnpm build`, starts it with `pnpm start`, and leaves automatic redeploys disabled. Render supports this exact pattern: a Blueprint at the repository root can define a web service and prompt for every value marked `sync: false`.[1]

The Blueprint deliberately contains **names only**, never secret values. Render generates an independent `JWT_SECRET`. The user must supply every other value through the Render dashboard after an external database and OAuth configuration have been approved.

## Required external checks before a real trial

| Check | Required result | Why it blocks public testing today |
|---|---|---|
| Database | A dedicated database reachable from the chosen external host, with schema migration and a test tenant | The current MySQL/TiDB database remains inside the managed Neon setup; the prepared Supabase project is not yet the live application database. |
| OAuth | The OAuth provider accepts the exact callback URL for the staging hostname, such as `https://<render-host>/api/oauth/callback` | The browser correctly builds the callback from its active origin; the external origin must be independently authorized. |
| Environment | All required runtime and browser build variables are set in the host's encrypted settings | External hosts do not inherit the managed Neon environment automatically. |
| WhatsApp | The Meta app is active, the staging webhook is explicitly subscribed, and a narrow test flow succeeds | Meta currently reports the application as inactive. Do not move the production webhook to a staging host. |
| Billing | HyperPay test credentials and a sandbox payment run are used | Never route a real payment through an unverified staging deployment. |

## How the two hosts differ

Vercel packages Express as a single serverless function and serves static assets from its deployment output; it does not use `express.static()` for those assets.[2] This repository already contains the required Vercel adapter in `api/[...path].ts` and a Vite-only build configuration.

Render runs Neon as a conventional Node web service. Its documented setup is to connect the Git repository, provide the application's build and start commands, and allow the service to receive a public `onrender.com` URL after deployment.[3] The supplied Blueprint sets those commands to the repository's tested `pnpm` scripts.

## Safe activation sequence

First, create a **staging-only** database and migrate the application schema only after confirming that it will remain separate from production data. Second, authorize the exact Render or Vercel callback URL in the OAuth provider and set only the externally approved environment values. Third, deploy Render from the Blueprint with automatic deploy disabled and test the homepage, account creation, session persistence, logout, database isolation, and payment sandbox. Finally, test WhatsApp only after Meta is active, while preserving the managed Neon webhook as production until the staging test is accepted.

## WhatsApp team-alert requirement

The recipient agreed for future team alerts is **Neon WhatsApp: +962 792 314 613**. This is different from the Oman Drive bot number, which remains the customer-facing sending number. A reliable outbound team alert requires an active Meta app, an approved notification template, a secure recipient configuration, and an explicit test confirmation before any message is sent.

## References

[1] [Render Blueprint specification](https://render.com/docs/blueprint-spec)

[2] [Vercel: Express on Vercel](https://vercel.com/docs/frameworks/backend/express)

[3] [Render: Deploy a Node Express App](https://render.com/docs/deploy-node-express-app)
