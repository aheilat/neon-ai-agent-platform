# Independent Render Parity Audit

**Audit date:** 25 August 2026  
**Independent public origin:** `https://agent.neonadai.com`  
**Scope:** Explain why the hosted Render product behaves as a reduced workspace rather than the full Manus dashboard, without moving managed production data, credentials, or WhatsApp assets.

## Verified finding

The Render deployment is healthy and is connected to the separate Supabase project `neon-ai-agent-platform`. This is **not** a failed data upload. Its independent database contains its own users, tenants, and agents; row-level security is enabled on every application table. It intentionally does not import the managed Manus MySQL/TiDB data.

The product mismatch comes from the server and client integration boundary. In the independent runtime, the server starts `server/external/app.ts`, which deliberately exposes a narrow Supabase/Claude API and rejects unrecognised API paths. The original full dashboard still calls the managed tRPC service at `/api/trpc`; a direct public request to that route on Render returns `404 Independent API route not found`.

| Area | Managed Manus implementation | Independent Render status | Consequence on Render |
|---|---|---|---|
| Dashboard pages | Existing agents, knowledge, conversations, team, channels, notifications, billing, and quality pages make 67 tRPC calls across 14 screens | `/api/trpc` is deliberately absent | Existing full-page components render without their data/actions or are unusable |
| Authentication | Manus OAuth and managed `useAuth()` session | Supabase Auth only for the dedicated independent workspace | The shared managed dashboard treats the independent user as unauthenticated |
| Agents and website learning | Managed data helpers and tRPC procedures | Independent Supabase + server-only Claude routes in `/external` | The separate company-agent journey exists but is not yet the full dashboard shell |
| Knowledge and attachments | Managed knowledge and storage paths | Independent private Supabase Storage implementation | Data is isolated; authenticated on-device validation is still required before calling attachments live-ready |
| Conversations and close-out | Managed conversation/message/status/rating procedures | Tables exist, but the independent test chat does not yet persist conversation/message history or a close-out flow | The user-facing chat cannot behave like the mature Manus widget/dashboard |
| Team, notifications, quality, schedules, billing | Managed tRPC plus Manus services/database | Database tables are present but no independent API/UI implementation exists | These dashboard areas are not available as a working Render product |
| WhatsApp | Managed webhook/token configuration | Kept outside independent Render intentionally | External customer WhatsApp connection remains disabled |

## Independent database evidence

The independent Supabase project is `ACTIVE_HEALTHY` in `ap-south-1`. Its schema migrations include the initial product schema, hardened function search paths, Supabase identity mapping, and workspace-owner RLS. The project holds **4 users, 3 tenants, and 6 agents**, but currently has **0 knowledge items, 0 conversations, and 0 messages**. This supports the conclusion that this is a separate clean environment, not a broken copy of the Manus database.

## Meta WhatsApp boundary

The supplied Meta screenshot shows **App not active**. This blocks customer WhatsApp Embedded Signup and production messaging through that Meta app. It does not cause website learning, agent creation, or independent Claude chat to fail. No Oman Drive production phone, webhook, access token, or Meta asset was changed during this audit.

## Restoration order

The correct repair is not to re-enable managed OAuth, Forge, MySQL, or the Oman Drive webhook inside Render. The correct repair is to make the independent client use independent Supabase-backed APIs.

1. Replace the reduced `/external` staging screen with an independent authenticated dashboard shell for **Agents, Knowledge, Test Chat, and Conversations**.
2. Add independent conversation, message, resolved/escalated, customer consent, rating, and lead APIs backed by the existing tenant-scoped Supabase tables.
3. Retain the website-to-agent flow, attachments, and direct server-only Claude, but show local status and recorded knowledge in the new dashboard.
4. Port team, notifications, quality, website timeline, billing, and channel management in separate verified increments rather than presenting managed-only pages as functional.
5. Keep customer WhatsApp connection disabled until the Meta app is switched to Live and has the needed Advanced Access/App Review approvals.

## Non-negotiable safety constraints

The restoration must not copy managed customer data without explicit migration approval. It must not add managed Manus credentials to Render. It must not change the Oman Drive WhatsApp webhook or number while Meta is inactive.
