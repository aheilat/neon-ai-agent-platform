# Integration research notes

## SiliconFlow

The user-provided SiliconFlow page describes a single AI inference platform for open and commercial LLMs and multimodal models. It explicitly positions agent workflows, RAG, AI assistants, and customer-support bots as supported use cases, with one API across models. The page also lists model context/output and price information that changes over time, so the product should treat model selection and pricing as configuration rather than hard-coded product facts.

Source: https://www.siliconflow.com/

## WhatsApp Business Platform

Meta's official WhatsApp Business Platform documentation confirms that Webhooks are HTTP requests with JSON payloads sent to a server designated by the integrator. The docs state that webhooks can notify the integrator about incoming messages, outgoing message status, call events, account changes, and template quality changes. The docs also describe creating and configuring a webhook endpoint and identify permissions required to receive webhooks.

Source: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview

## Product decision

The current MVP uses the managed server's protected AI helper for the chat engine and provides channel configuration surfaces plus a public web widget. Official WhatsApp, Messenger, Instagram, and phone credentials are intentionally not hard-coded. The next production integration should use verified provider webhooks, server-side signature validation, tenant-specific channel credentials, rate limiting, and provider-specific opt-in/policy handling.

## Instagram Messaging

Meta's Instagram Messaging documentation confirms that Webhooks can deliver real-time HTTP notifications when customers message an Instagram Professional account. It lists message events and required permissions, and notes that an app must be published for production webhooks. App Review and access level requirements apply for customer-owned data.

Source: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks

## Messenger Platform

Meta's Messenger Platform documentation confirms Webhooks for receiving incoming messages and message status updates for Facebook Pages and Instagram Professional accounts. It requires a server endpoint, Meta Webhooks configuration, event subscriptions, and installation of the messaging app on the relevant Page/account. HTTPS/TLS is required, and advanced access/App Review is needed for customer data beyond app roles.

Source: https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks
