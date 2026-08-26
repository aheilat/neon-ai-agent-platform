# Comprehensive independent-runtime audit

Updated 2026-08-25 UTC. This document describes the independent Render/Supabase surface without claiming that Meta or server-side audio is active.

## Route switch

| Route | Independent runtime behavior | Customer-visible purpose | Status |
|---|---|---|---|
| `/` | `PublicLanding` | Arabic-first product explanation, free-start CTA, pricing and trust states | Verified |
| `/login`, `/register`, `/access` | `Access` with Supabase email/password | Sign-in, account creation, and safe return to the workspace | Verified on live domain |
| `/external` | `IndependentOnboarding` when independent Supabase browser configuration exists | Authenticated URL-first onboarding: URL, goals, analysis, proposal, agent, Widget/embed | Implemented; full disposable customer journey remains pending |
| `/start`, `/agents`, `/knowledge`, `/conversations`, `/channels`, `/settings` | `IndependentStaging` in independent runtime | Tenant-scoped workspace sections and controls | Implemented; requires an authenticated Supabase session |
| `/widget/:agentId` | `IndependentWidget` in independent runtime | Public chat, attachment/voice controls, human handoff, close, rating | Live verified |
| `/pricing` | `Pricing` | Trial and plan information | Implemented |
| `/analytics`, `/quality`, `/team`, `/billing`, `/notifications`, `/notifications/settings` | Legacy managed shell unless independently replaced | Managed Manus-only sections | Must not be represented as independent Render features without a separate backend contract |

## Independent API contract

| Boundary | Endpoints | Auth and data boundary | UI action |
|---|---|---|---|
| Health | `GET /api/health` | Public status only; no secrets | Deployment health |
| Public Widget | `GET /api/public/agents/:agentId`, `POST /api/public/agents/:agentId/chat`, `POST /api/public/agents/:agentId/handoff`, `POST /api/public/agents/:agentId/conversations/:conversationId/close`, `POST /api/public/agents/:agentId/conversations/:conversationId/rating` | Public agent lookup plus opaque conversation session token; tenant derived from agent | Widget bootstrap, chat, handoff, close, stars |
| Authenticated identity/workspace | `GET /api/external/auth/me`, `GET /api/external/agents`, `GET /api/external/templates`, `POST /api/external/templates/:templateId/agents` | Supabase Bearer token, workspace tenant scope | Login, agent list, template catalog, template creation |
| Agent and onboarding | `POST /api/external/website/analysis`, `POST /api/external/agents`, `PATCH /api/external/agents/:agentId`, `POST /api/external/website/apply-proposal` | Authenticated workspace and selected agent | Analyze website, create/reuse agent, edit settings, apply proposal |
| Knowledge | `GET /api/external/agents/:agentId/knowledge`, `POST /api/external/agents/:agentId/knowledge`, `POST /api/external/agents/:agentId/image-knowledge`, `POST /api/external/agents/:agentId/file-knowledge`, `POST /api/external/agents/:agentId/website-knowledge` | Authenticated workspace and selected agent; private Supabase storage for files | Manual, image, text-file, and website knowledge |
| Human handoff and inbox | `PATCH /api/external/agents/:agentId/handoff-contact`, `GET /api/external/agents/:agentId/handoff-requests`, `GET /api/external/agents/:agentId/conversations`, `GET /api/external/agents/:agentId/conversations/:conversationId`, `POST /api/external/agents/:agentId/handoff-requests` | Authenticated workspace and selected agent | Save team contact, view leads, list/read conversations, create handoff |
| Authenticated workspace chat | `POST /api/external/agents/:agentId/chat`, `POST /api/external/agents/:agentId/conversations/:conversationId/close` | Supabase Bearer token, tenant and agent ownership checks | Internal agent test chat and close |

## Verified reliability behavior

Render HTML fallback responses are parsed as text first and turned into actionable Arabic errors in authenticated setup and Widget requests. Public API work has route-level deadlines, a Claude completion deadline below the observed gateway window, a truthful degraded reply, and Supabase error guards. The confirmed production failure was a quoted `satisfactionRating` SQL reference against the actual `satisfaction_rating` column; this was corrected without destructive schema changes.

The live public Widget was verified at `https://agent.neonadai.com/widget/7`: bootstrap, chat, handoff, close, rating, and cleanup were successful in isolated tests. The latest live bundle includes the attachment button, microphone button, file-size/type guidance, and image-content disclosure. A control-only browser check confirmed those controls render without sending a message.

## Truthful capability boundaries

WhatsApp/Meta remains explicitly pending approval in the independent Channels surface. The local simulation is clearly labeled and does not create a WABA or send messages. Instagram, Messenger, phone, and email are shown as unavailable/status-only until independent provider contracts exist. Public Widget voice currently uses browser MediaRecorder plus Chrome Speech Recognition for Arabic transcript-to-chat; no audio bytes are uploaded to a provider, and unsupported browsers are told to type instead. Public images show filename and size only; readable text files contribute text context before sending. This is intentionally not presented as server-side OCR or server-side audio transcription.

## Remaining external blockers

The unresolved checklist items fall into three categories: Meta production approval and permanent Oman Drive credentials; authenticated end-to-end new-customer testing requiring a user-controlled email/password and no automated account creation; and independent provider work for server-side audio, Vercel, or live WhatsApp delivery. These should remain visibly pending rather than being marked complete or represented as active features.
