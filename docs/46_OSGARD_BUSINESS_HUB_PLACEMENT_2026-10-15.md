# OSGARD Business Hub — placement and operating model

Date: 15 October 2026

## Decision

Use `/business/` as the public business hub. Keep the game library at `/games/`, keep monetization estimates at `/games/monetization/`, and keep the token-gated Commerce Admin at `/games/commerce-admin/`. Do not turn the public landing page into an admin dashboard and do not mix projected economics with recorded sales.

## Entry points

- Global OSGARD navigation: “Для бизнеса / For business”.
- OSGARD PLAY catalogue navigation: “Для бизнеса”.
- Canonical URL: `https://osgard.world/business/`, included in the XML sitemap and production route matrix.
- Business hub cards link to existing product/workspace routes rather than copying those tools into a second interface.

## Public workspaces

- Product development: `/development#project-intake`.
- Partner Studio: `/games/partners/`.
- Growth Studio: `/games/growth-studio/`.
- Revenue model: `/games/monetization/`.
- Premium storefront: `/games/premium/`.

## Operator-only workspaces

- Premium Intelligence / Commerce Admin: `/games/commerce-admin/`. The page must remain noindex and require the server-side ADMIN_API_TOKEN in the closed interface.
- Command Center: `/games/command-center/`. Read-only route checks, with the limits of the check scope disclosed.

The public hub may link to these routes, but must not embed admin data, ask for an admin token, call Commerce APIs, or store credentials.

## Local commercial brief

The page provides a small browser-only brief builder. It exports a normalized JSON file and does not submit or persist the values. The generated file is a planning artifact, not a proposal, contractual offer, pricing commitment, forecast, or financial advice. Avoid collecting customer information or secrets in this tool.

## Data interpretation

- Revenue model values are assumptions and model outputs, not live revenue.
- Commerce-order and service-attribution ledgers remain distinct.
- Currency totals are never combined without an explicit exchange-rate source.
- Consent-based analytics events are not unique-user counts or causal evidence.
- Premium Intelligence recommendations are human review steps, not autonomous financial actions.

## Quality and release gates

Run:

    npm run qa:business-hub
    npm run check
    npm run build
    npm run qa:production-routes

The smoke test checks navigation, the seven workspace cards, brief-builder presence and JavaScript syntax, the absence of network/storage/HTML-injection APIs in the local interaction layer, sitemap discovery, and the public route contract. CI runs the smoke check during frontend validation and release readiness. Post-deployment route verification remains required.

## Deployment boundary

The Business hub is public information and local-only client interaction. It does not change payments, orders, product visibility, customer records or admin permissions. Deployment should use the existing checked production release workflow; the SSH private key must never be pasted into a chat or committed to Git.
