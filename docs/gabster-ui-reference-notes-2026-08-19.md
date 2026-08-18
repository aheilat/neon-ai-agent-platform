# Gabster UI Reference Notes

The public Gabster reference page was reviewed on 19 August 2026 as a design and journey reference only. Neon will retain its own brand, content, and implementation rather than copying Gabster assets or wording.

## Patterns to adapt for Neon

- A calm public navigation bar with product, pricing, industry, resource, and contact destinations; a visible language control; a light/dark control; a compact sign-in action; and a prominent free-start action.
- A high-clarity hero with a concise customer-outcome message, supporting description, a primary free-start call-to-action, a secondary demo action, and explicit reassurance that the initial trial does not require a payment card.
- A visual product preview beneath the hero and lightweight channel/status chips that communicate WhatsApp, live agent activity, and omnichannel capability before the user enters the product.
- Repeated primary actions that consistently take a visitor from free start to authentication and then the guided first-agent setup.
- Separate public pricing and industry destinations so visitors can understand value and fit before sign-in.

## Neon-specific translation

The Neon version will use the Dark Neon identity, Arabic/English support, Gulf-focused WhatsApp workflow, customer website learning, and the existing three-step agent setup. The sign-in and registration calls-to-action will invoke the existing secure Manus OAuth flow rather than a duplicate password system.

## Current-page audit

At the time of review, the root route opened directly into the authenticated onboarding screen. It did not expose a public value proposition, visible pricing, trial information, or a distinct sign-in/register entry point. The existing onboarding itself is valuable and will be preserved after authentication as the first-agent flow, while the root route becomes a public acquisition page.

## Access verification

The unauthenticated `/billing` route was verified to show a protected-workspace message with a secure sign-in action and an explicit free-account creation link. This prevents a visitor from entering billing records before authentication while preserving a visible path to the free trial.

## Reference

- https://gabster.ai/en
