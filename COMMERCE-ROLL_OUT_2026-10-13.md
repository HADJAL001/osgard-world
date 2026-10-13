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
- The changes remain in an open pull request. No payment API/database credentials were supplied and no checkout API deployment or real transaction is claimed. The live website changes only after the reviewed branch is merged and the host deployment succeeds.

## Referral SHARDS rollout

The current feature branch adds a voluntary post-game invitation programme. The server stores a one-way SHA-256 hash of a random per-device wallet token, issues unique game-specific invite codes, and derives the displayed balance from a persistent ledger. A 50-point non-cash SHARDS entry is created only after a consented event reports a referred game session of at least 60 seconds, with the invite and game matching a server-issued code. Each invite code can award once; issuance is limited to 20 links per wallet/24 hours and awards to five/rolling 24 hours. The user can request deletion of the wallet, codes and reward records from the post-game panel.

The social destinations (Telegram, WhatsApp, VK, X and Facebook) open native share-composer URLs. Those platforms do not send a generic, trusted publish receipt back to this site, so a clicked share link is **not** treated as a confirmed public repost and no points are granted simply for clicking it. The measurable conversion target is a referred user who actually starts and completes a session. Rewarding actual social publication would require platform-specific approved APIs and verification.

SHARDS are non-cash, non-redeemable pilot points. Client-rendered games cannot cryptographically prove human participation; the ledger is more robust than a local counter but not fully fraud-proof. Do not enable redemption, cash value or pay-to-win benefits without authenticated accounts, server-verified gameplay and fraud review. Referral rewards also rely on explicit reward-program opt-in and consented game lifecycle events; recipients who decline gameplay analytics are not tracked in this pilot.
