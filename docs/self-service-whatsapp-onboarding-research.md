# Self-Service WhatsApp Onboarding Research

## Goal

Enable each Neon customer to create an AI agent and connect their own WhatsApp Business account without sharing an access token or receiving manual technical support.

## Confirmed Meta Requirements

Meta Embedded Signup is the supported customer-facing onboarding flow. A customer authenticates with Meta, creates or selects a WhatsApp Business Account, verifies their business number, and grants Neon access. The completion result includes the customer WABA ID, phone-number ID, and an exchangeable authorization code.

The server must exchange that code for a customer-scoped business token, subscribe Neon to the customer WABA webhooks, and store the resulting assets exclusively in that customer's tenant. The required WhatsApp permissions are `whatsapp_business_management` and `whatsapp_business_messaging`.

For a multi-customer platform, Meta describes a Business Integration System User token as the customer-scoped option used by Tech Providers. This removes the need for customers to create System Users or copy permanent tokens into Neon.

## Product Implications

1. The short initial wizard can create the tenant, agent, knowledge base, and website learning job before WhatsApp is connected.
2. A single "Connect WhatsApp" action launches Meta's localized Embedded Signup flow; customers complete the Meta screens in their own account.
3. Neon stores only encrypted/customer-scoped connection metadata and links the exact phone-number ID to the customer's agent.
4. The existing webhook handler routes incoming events by phone-number ID, preserving tenant isolation.
5. Production rollout requires Meta Embedded Signup v4, app review for advanced permissions, and customer billing setup unless Neon becomes or partners with a Solution Partner.

## Sources

- [Meta Embedded Signup Overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview), retrieved 2026-08-18.
- [Meta Access Tokens Guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens/), retrieved 2026-08-18.
- [Meta Onboard WhatsApp Business App Users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users), retrieved 2026-08-18.
