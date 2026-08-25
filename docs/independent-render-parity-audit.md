# Independent Render Parity Audit

**Audit date:** 25 August 2026  
**Independent public origin:** `https://agent.neonadai.com`  
**Scope:** Explain why the hosted Render product behaves as a reduced workspace rather than the full Manus dashboard, without moving managed production data, credentials, or WhatsApp assets.

## Verified finding

The Render deployment is healthy and is connected to the separate Supabase project `neon-ai-agent-platform`. This is **not** a failed data upload. Its independent database contains its own users, tenants, and agents; row-level security is enabled on every application table. It intentionally does not import the managed Manus MySQL/TiDB data.

The product mismatch comes from the server and client integration boundary. In the independent runtime, the server starts `server/external/app.ts`, which deliberately exposes a narrow Supabase/Claude API and rejects unrecognised API paths. The original full dashboard still calls the managed tRPC service at `/api/trpc`; a direct public request to that route on Render returns `404 Independent API route not found`.

### 25 August 2026 — human-handoff inbox rollout observation

The authenticated disposable workspace at `https://agent.neonadai.com/external` loaded correctly with two isolated agents and the selected second agent’s approved manual knowledge. Immediately after the GitHub push for the independent human-handoff inbox, that inbox was not yet present in the rendered page. This is recorded as an in-progress Render deployment observation, not as a product regression. No customer workspace, WhatsApp asset, or credential was accessed.

After the Render rollout completed, the same authenticated isolated workspace showed the selected agent’s **طلبات التحويل البشري** panel with its refresh control, empty-state guidance, agent-specific scope statement, and an explicit notice that it does not send a WhatsApp, email, or telephone notification. The empty state was expected for the selected second agent. This validates the live Render UI surface; the endpoint’s tenant/agent ownership checks are covered by automated tests.

The selected second agent was then asked in the live Claude test chat for its operating days. It answered that the service is available **from Sunday to Thursday only**, matching the manually saved knowledge item attached solely to that agent. This confirms the manual knowledge control is not merely storing a record: the direct independent Claude route retrieves and uses it in the agent’s answer.

For a separate live website-to-agent validation, the isolated workspace submitted the public URL `https://neonadai.com` and the analysis state started successfully. This test uses only the disposable workspace; proposal review and approval are being kept separate from the previously selected agent and its manual knowledge.

The live analysis returned a reviewable proposal from one public page, including an `AdCreative AI` agent name, a business summary, one service, and three source-linked FAQs. After approval in the disposable workspace, the platform created and selected a **new active AdCreative AI agent**, showed its own extracted knowledge items, and issued a distinct Widget URL at `/widget/10`. The prior second agent and its manual knowledge remained a separate agent surface. This completes the previously pending live approval step without modifying any customer agent or production channel asset.

The live `/conversations` route then loaded the new **صندوق محادثات الوكيل** surface for the selected AdCreative AI agent, alongside the agent-specific handoff request panel. Its empty state correctly reported no saved conversations for that newly created agent, while the independent navigation links were visible and the route was no longer a managed tRPC dashboard. A separate disposable conversation will be created for this agent solely to validate stored message-detail rendering.

For that final live inbox check, the disposable AdCreative AI agent answered a test question using only its newly extracted website knowledge. The conversation appeared in its own inbox, opened to a stored two-message thread, and was then closed through the inbox control. The list refreshed to the closed state with the system close-out event while retaining the readable message history. This verified the independent list, detail, and close lifecycle on Render without accessing another tenant or customer agent.

The live `/settings` route was also verified after the independent navigation rollout. It loaded the selected AdCreative AI agent’s dedicated handoff-contact configuration surface and explicitly stated that it stores company contact information only; it makes no claim to send a message, initiate a call, or use any production phone or WhatsApp asset.

The public `/widget/10` route was validated after the session-bound close-out release. A disposable visitor message created a public Widget conversation and received an AdCreative AI response. Only after that real exchange did the Arabic control “هل تحتاج مساعدة أخرى؟ إنهاء المحادثة الآن” appear. Activating it ended the conversation, disabled the input, and displayed the final close-out message. No tenant identifier, contact data, secret, or production channel asset was exposed in the public Widget.

The isolated Supabase project was then queried with a bounded schema check. It confirmed that `public.conversations.publicSessionTokenHash` exists as a `text` column, matching the additive migration used by the public Widget close-out flow. The server retains only the token hash; the raw opaque token remains in the visitor’s current browser state.

After the independent focused-view rollout, the live `/knowledge` route was rechecked on Render. It showed only the selected agent’s backed knowledge editor, current knowledge items, and supported attachment controls. The unrelated agent-profile editor was not present on that route.

The live `/agents` route was also verified after its focused-view refinement. It showed only the tenant workspace’s agent selection controls, agent creation action, and the selected agent’s backed profile editor. Knowledge, chat, Widget, channel, and setup sections were not present on that route.

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

## Newly verified control failures

The public independent registration page is visible and accepts an email/password, but it requires a confirmation email before a fresh workspace can be entered. The browser-control handoff used for an authenticated review was not visible to the user, so it cannot be relied on as the sole validation method.

The existing `Widget.tsx` is a managed-runtime component, not an independent widget. It calls managed `trpc.chat.*` APIs that are unavailable in Render independent mode and it contains Oman Drive-specific copy and phone routing. It therefore must not be exposed as the independent product widget, and no generic customer agent may ever inherit that contact detail. The independent replacement needs its own public, tenant-scoped chat and handoff routes plus an embed-preview UI.

The same distinction applies to the prior full dashboard controls: a visible button is not a functional independent feature unless its client request and backend route use the Supabase/Claude runtime. Any managed-only route must be removed from the independent surface or replaced before it is shown as available.
