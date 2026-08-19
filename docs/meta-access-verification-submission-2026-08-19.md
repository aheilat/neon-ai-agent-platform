# Meta Access Verification Submission — 2026-08-19

## Current status

| Requirement | Status | Evidence or next action |
|---|---|---|
| Business Verification | Verified | Meta displays the verified status for **Neon Renewable Energy** (Business ID `177573598049147`). |
| Access Verification | In review | The Tech Provider questionnaire was submitted through the Meta developer dashboard. Meta states it will follow up within five days if further information is required. |
| Embedded Signup infrastructure | Ready in Neon | The application exchanges the Meta completion code server-side, subscribes the tenant-owned WABA to webhooks, and stores tenant credentials encrypted. |
| Public self-service WhatsApp connection | Pending Meta approval | Do not open the customer-facing production flow until Meta finishes review and any remaining App Review / publishing requirements are confirmed. |

## Submitted service description

> Neon provides a SaaS platform that enables businesses to build and manage AI customer-support agents. With each business’s authorization, we use Meta Platform Data to connect its WhatsApp Business Account, route customer inquiries to that business’s AI agent, and let the business manage its own channel settings and conversations. Each customer controls its own connection. We use this data only to provide and operate the customer-support service for that customer, and we do not sell or share it with unrelated parties.

## Operating rule while under review

Use the existing Neon test WhatsApp connection only for internal testing. After the status becomes **Verified**, confirm App Review and production publishing requirements in Meta, then test a separate customer WhatsApp Business Account end-to-end before announcing public availability.
