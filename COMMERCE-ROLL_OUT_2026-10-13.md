# OSGARD WORLD Commerce / Rollout 2026-10-13

## Audited baseline

Repository: HADJAL001/osgard-world, default branch master. The app root is React 19 + Vite + TypeScript. Games are also served from public/games as static HTML/JavaScript; the games hub already has searching, genre filters, favorites/history, an iframe player, mobile dialog styles, a consent toggle, a monetization calculator and a partner-format page. The prior project brief itself notes that production checkout and a real ad network are not connected. The project request form previously only prepared a WhatsApp message locally.

The site source could be reviewed through the linked GitHub connection. The live domain could not be reliably fetched by the web inspection tool, and this work does not claim that the production domain has changed.

## What this change adds

- A separate Node.js 22 Commerce API with Stripe-hosted Checkout, server-defined product allow-list, fixed Stripe Price IDs, signed webhooks and idempotency.
- PostgreSQL persistence for orders, provider webhook events, leads and consented analytics events.
- A storefront at /games/premium/ and a server-verified purchase-status page.
- A token-protected admin panel at /games/commerce-admin/ to inspect order state, broad payment totals by currency, leads and consented event counts.
- A lead endpoint that can replace manual handoff when the API is configured; manual WhatsApp handoff remains the fallback.
- Live payment processing and subscription sales default to OFF.
- CI/static smoke checks and a service-level test suite.

## What is not activated

- No provider account, API key, webhook secret, database URL or admin token was available to the coding environment. No live payment was charged.
- No paid entitlement is granted to a signed-in account yet, because the current Games hub has no identified shared account/entitlement contract. The order is recorded and verified, but OSGARD PREMIUM remains disabled by default.
- No mail delivery provider is configured; leads are persisted and appear in the protected commerce admin view.
- No advertising network has been connected. Partner inventory remains inquiry/planned until approved and configured. Ad code must not be enabled until the account, site approval, consent and placement rules are checked.
- No production DNS, reverse proxy or deployment has been changed by this branch.

## Deployment sequence

1. Review/merge this branch after CI passes.
2. Create the database and deploy services/osgard-commerce-api as a separate Docker web service. Set the service health check to /healthz.
3. Add the provider's test secret key, webhook signing secret and Price IDs as hosting secrets; do not commit them.
4. Update public/games/commerce-config.json with the API HTTPS origin. If using a same-origin route instead, configure and test the /commerce-api reverse proxy.
5. Test checkout success, decline, cancellation, delayed payment, duplicate webhook delivery, refund and subscription cancellation with the provider's test mode.
6. Create a long random ADMIN_API_TOKEN and verify the admin endpoints return 401 without it.
7. Review company identity, price/tax display, terms, refunds, privacy, data retention and customer support with the responsible operator/legal adviser.
8. Only then set ENABLE_LIVE_PAYMENTS=true with live keys. Keep ENABLE_OSGARD_PREMIUM_SALES=false until entitlement activation, cancellation and clearly defined subscription benefits are implemented.

## Validation

Run services/osgard-commerce-api/npm test and npm run check, plus node scripts/commerce-rollout-smoke.mjs from the repository root. Tests use Node's built-in test runner for deterministic domain validation; they do not prove a real Stripe payment, database availability, a browser integration or legal compliance. Those require configured external services and end-to-end testing.

## Commercial priority

First: connect lead storage, run a test-mode payment from the deployed storefront and measure actual traffic only with consent. Next: prove repeat play and sponsor inquiry interest. Do not prioritize a paid subscription until users can see exact recurring benefits and the app can safely apply and revoke access.


## Additional integration hardening

- The existing Nginx source now includes a same-origin `/commerce-api/` reverse proxy to the private `osgard-commerce-api:8080` Docker service. The API port is not intended to be publicly mapped.
- The production route matrix verifies the commerce storefront, server-verified payment-result page, noindex commerce admin, public config and shared contact/lead client without falsely assuming the external API is already configured.
- Checkout polling now uses a compare-and-set status update. Re-opening an old success URL cannot silently return an order from `refunded`, `expired`, `payment_failed` or `cancelled` back to `paid`; a concurrent refund wins over a stale poll.
- Admin and checkout-status JSON responses set `Cache-Control: no-store` so customer/order data and payment state are not retained by intermediaries.
- CI includes regression tests for refunded/cancelled payment states and smoke checks for the private reverse-proxy route.
- The web-side changes have been merged to `master` and activated by the production deploy workflow. The commerce API still requires operator-provided PostgreSQL and Stripe configuration; no live transaction or paid entitlement is claimed.


## Production verification — 13 October 2026

Verified against commit `a1cb673d07298c448338633f0d6b493287e1e90d`:

- **Frontend deployment:** OSGARD frontend deploy run #327 completed successfully. The signed release archive was staged, checksummed and activated; Nginx configuration validation passed.
- **Published routes:** the production route matrix returned `status: ready`, **136 route checks, 0 failures**, using desktop and mobile user-agent profiles. The checks included the Games hub, nine game routes, invite pages, partner inventory, premium storefront, consent-gated analytics assets, the commerce admin, same-origin API proxy, and the new social-network reporting table.
- **Engine and game checks:** Godot 4.7.2 was available from the build cache; project import, headless gameplay state-transition smoke, Web export, the game hub smoke and scenario-formula bounds all passed.
- **Commerce CI:** Node syntax checks, service-level tests and the commerce rollout smoke checks passed.
- **Games Lighthouse:** the post-deploy mobile report scored **94 Performance, 96 Accessibility, 96 Best Practices, 100 SEO**, TBT 273 ms, LCP 1.37 s. Desktop scored **99 Performance, 100 Accessibility, 96 Best Practices, 100 SEO**, TBT 0 ms, LCP 0.37 s. The workflow's configured guardrails passed. Scores are a point-in-time synthetic audit, not a substitute for real-user monitoring.
- **Social-channel dashboard:** the protected commerce overview now returns consented share-intent and self-confirmed reward counts grouped by Telegram, WhatsApp, VK, X and Facebook. These numbers do not establish that a social network published a post.
- **Payment/analytics activation limits remain:** `ENABLE_LIVE_PAYMENTS=false`, `ENABLE_OSGARD_PREMIUM_SALES=false`; `public/games/commerce-config.json` intentionally has an empty public API base. No provider credentials or database URL were supplied, so the source-only commerce API must not be represented as receiving live production payments or centralising real events yet.

## Analytics retry queue and latest production release — 13 October 2026

The consented analytics retry queue is included in the deployed web revision `19a7cc75818b33db1f271087e5273559f54055f0` (OSGARD frontend deploy run #355):

- A consented event is stored locally only if it passes the event/game schema, with a bounded cap of 100 queued items and 7-day expiry.
- Delivery retries in batches of up to 20 and the same event ID is preserved across retries. Items leave the queue only after an API acknowledgement; an empty queue removes its storage key.
- Withdrawing consent clears queued items and aborts an in-flight request best-effort. This cannot retract a request already received by the server.
- The shared queue is used by the Games hub, contact/partner/premium analytics, gameplay lifecycle, post-game recommendations, and OSGARD SELECT social/promo events.
- Repeatable behavior test: `npm run qa:consented-analytics-queue` passed — offline persistence, stable IDs, acknowledged retry, consent withdrawal, and schema allowlist.
- Production route matrix: **136 route checks, 0 failures**. Deployment's same-origin API proxy and issue/verify/revoke smoke completed successfully.
- Post-deploy OSGARD Games Lighthouse run #157 passed guardrails: mobile Performance 99, Accessibility 96, Best Practices 96, SEO 100; TBT 94 ms, LCP 1.35 s. Desktop Performance 99, Accessibility 100, Best Practices 96, SEO 100; TBT 0 ms, LCP 0.37 s.
- Commerce Checks, frontend validation, deployment and release readiness completed successfully on this revision.

**Activation boundary is unchanged:** the browser queue can retry events, but central analytics are only available when the private Commerce API and its database are online. Production checkout is still disabled until the PostgreSQL and Stripe secrets/prices/webhook configuration are supplied and validated. No ad network, paid reward video, live subscription billing, or real-money SHARDS redemption is claimed as active.


## Added: secured game catalogue settings (source change; not yet deployed)

The optional Commerce API settings table stores visibility, order, up to three featured flags and plain-text title/description overrides for the ten known games. `/games/admin/catalog/` reads and writes this configuration through the existing server-side admin authorization. Optimistic revisions prevent accidental lost updates.

The public catalogue loads these overrides only when `apiBaseUrl` in `/games/commerce-config.json` is explicitly configured. The committed value remains blank, so the static catalogue remains the production fallback. This feature does not activate sponsored placements, ad SDKs, Stripe checkout, subscription sales or paid entitlements.

The new validation and route checks must pass in Commerce Checks and the production route matrix. After deployment, test the editor with the real admin token, save a revision, confirm stale revisions return HTTP 409, and reload `/games/` on both desktop and mobile. Database/API deployment and the public config change are still operator steps, not claims made by this source patch.
