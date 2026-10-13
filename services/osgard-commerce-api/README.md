# OSGARD Commerce API

Backend for OSGARD PLAY checkout sessions, signed Stripe webhooks, request leads, consent-gated analytics and a token-protected admin overview.

## What is implemented

- Stripe-hosted Checkout for a fixed server allow-list of products.
- The browser sends a product key, email and explicit terms acceptance. It cannot set amount, currency, quantity or redirect URL.
- PostgreSQL order records; webhook signatures verified by Stripe SDK against the raw request body; event IDs stored for idempotency.
- One-time payments and subscriptions use distinct Stripe Price modes.
- Test keys may be used before launch. Live keys are refused unless ENABLE_LIVE_PAYMENTS=true.
- OSGARD PREMIUM sales stay disabled unless ENABLE_OSGARD_PREMIUM_SALES=true; do not enable until benefits, cancellation, support and entitlement provisioning are complete.
- Lead persistence with processing acknowledgement and honeypot.
- Consent-gated analytics endpoint with an allow-list of events and fields.
- Admin overview, order list and lead list require a server-side bearer token of at least 32 characters.
- No card numbers or CVC values are handled or stored by OSGARD.

## Local run

1. Install Node.js 22 or newer.
2. Run npm install in this folder.
3. Copy .env.example to .env and configure PostgreSQL plus Stripe test keys and Price IDs.
4. Run npm test, npm run check and npm run start:local (uses Node's built-in .env loader).
5. Configure a Stripe test webhook to POST to /v1/stripe/webhook. For Stripe CLI, forward events to localhost:8080/v1/stripe/webhook and copy the generated whsec_ value into STRIPE_WEBHOOK_SECRET.

The API boots in degraded mode without secrets so /healthz remains observable, but checkout is disabled until database, Stripe key, webhook secret and prices are configured.

## Deploy on the existing OSGARD Docker host (without Render)

The repository already has an Nginx frontend container and a deployment pipeline. Run Commerce API as a separate Node.js 22 container on the **same private Docker network** as the frontend. Do not publish port 8080 to the public internet.

1. On the OSGARD host, determine the actual network of the existing frontend instead of guessing the name:
   ```sh
   docker inspect osgard-world --format '{{json .NetworkSettings.Networks}}'
   docker network ls
   ```
2. Build the service image from the repository:
   ```sh
   docker build -t osgard-commerce-api:2026-10-13 -f services/osgard-commerce-api/Dockerfile services/osgard-commerce-api
   ```
3. Store the production environment file outside the website and source tree, owned by the deployment operator, with mode 600. Start from `.env.example`, set a reachable PostgreSQL `DATABASE_URL`, Stripe **test-mode** credentials, real test Price IDs and a random `ADMIN_API_TOKEN` of at least 32 characters. Keep `ENABLE_LIVE_PAYMENTS=false` and `ENABLE_OSGARD_PREMIUM_SALES=false`.
4. Start Commerce API on the network identified in step 1. Substitute the actual network name and secure environment file path:
   ```sh
   docker run -d --name osgard-commerce-api --restart unless-stopped \
     --network <actual-osgard-frontend-network> \
     --env-file /secure/path/osgard-commerce.env \
     -e PORT=8080 -e TRUST_PROXY=true \
     osgard-commerce-api:2026-10-13
   ```
   Do not use `-p 8080:8080`: Nginx is the public gateway. `TRUST_PROXY=true` is appropriate only when requests always pass through the single trusted OSGARD Nginx hop.
5. Verify that the frontend container resolves and reaches the API, then test the public gateway:
   ```sh
   docker exec osgard-world wget -qO- http://osgard-commerce-api:8080/healthz
   curl -fsS https://osgard.world/commerce-api/healthz
   ```
   `/healthz` may return 200 in degraded mode. Inspect `/readyz` as well; it must not be treated as ready until the database, Stripe test credentials, webhook and prices are configured.
6. Deploy the reviewed `nginx.conf` with the frontend release and validate it using `nginx -t` before reloading/activating the configuration. The `/commerce-api/` route is defined in the repository and uses Docker DNS at request time.
7. Run checkout success, decline, cancellation, delayed-payment, duplicate-webhook, refund and subscription-cancellation cases using Stripe test mode. Verify both the order state and the protected commerce dashboard.
8. Only after seller identity, taxes, refunds, privacy, support and provider eligibility are reviewed should live processing be considered. Do not enable OSGARD PREMIUM until its benefits, cancellation and account entitlement/revocation flow are implemented.

Never commit Stripe secrets, database URLs, or the admin token. Never embed them in HTML or `commerce-config.json`.

## Static-site configuration

Edit public/games/commerce-config.json only after the API is running and reachable. Set apiBaseUrl either to the API's HTTPS origin without a trailing slash (for example https://commerce-api.example.com), or to the explicit same-origin prefix https://osgard.world/commerce-api when the Nginx proxy and private container are verified. This setting is public and must never contain secrets. If it is empty or invalid, event delivery and admin requests fail closed; lead forms offer the disclosed manual WhatsApp fallback. Do not interpret local queued events as server analytics.

## Admin

Open /games/commerce-admin/ and paste ADMIN_API_TOKEN into the in-memory field. It is not saved in localStorage. The admin endpoints expose customers' contact details; protect and rotate the token if exposed.

## Launch gates

- Confirm the legal entity's country and payment processor eligibility before live mode.
- Create real prices in the provider dashboard; review product names, amounts, applicable taxes and refund rules.
- Do not activate OSGARD PREMIUM until benefits, user identity, subscription entitlement, cancellation and support workflows exist. This first release records subscription status but does not connect a paid tier to a logged-in game account.
- Test successful, declined, cancelled, expired, delayed and refunded payments using Stripe test mode.
- Never treat a browser redirect as proof of payment. The server verifies Checkout Session data and signed webhooks.
- Leads are visible to admins; outbound email notification is not configured.
- Ads are not served by this service. Configure an approved provider separately and request any legally required consent. Do not display fake ads or generate artificial impressions.


## Consented analytics and retention (added 2026-10-13)

- The event endpoint accepts only allow-listed event names and records only explicit-consent batches.
- Clients supply a random eventId; PostgreSQL's primary key makes retries idempotent. Older clients without this field remain accepted but cannot be de-duplicated across retries.
- The catalog and commerce client reuse a random session ID only for the current browser tab; the game player uses a distinct session ID for a game run. No persistent cross-site visitor profile is created by this code.
- ANALYTICS_RETENTION_DAYS defaults to 90 and accepts integers from 30 to 365. Rows older than this limit are deleted at API startup and then every six hours while the database is ready.
- The operator dashboard reports only consented server-recorded events. It is not a complete count of anonymous page visits, ad impressions, revenue or conversions. UTM clicks only attribute outbound link clicks.
- The environment still needs a real database and a deployed API for data to be persisted; this source change does not prove that production has been deployed or is receiving events.


## Anonymous game feedback (added 2026-10-13)

- The public page at `/games/feedback/` collects a selected game, a 1–5 rating, a fixed-choice return-intent, a category, and an optional comment. It does not ask for an account, email, name, device fingerprint or analytics consent.
- Before storage, the player explicitly acknowledges the feedback-processing notice. Comments are limited to 1,200 characters and the page tells players not to include names, contact details, credentials or payment information. No public display or third-party analytics is connected.
- `POST /v1/feedback` validates every field against allow-lists, includes a honeypot, and is rate-limited to 8 requests per hour. Feedback is only stored if PostgreSQL is configured and ready. Otherwise the page states that nothing was sent and offers a manual draft fallback.
- `GET /v1/admin/feedback` uses the existing `ADMIN_API_TOKEN` guard and returns aggregate counts plus a bounded list of recent comments; the UI renders text as plain text, not HTML.
- `GAME_FEEDBACK_RETENTION_DAYS` defaults to 90, accepts values from 30 to 365, and purges old comments on API startup and every six hours. This is an operational retention control; publish it in the privacy notice and verify it against the launch jurisdictions before production use.
- A source change does not activate the service. Deploy the updated Commerce API with a ready PostgreSQL database, configure `public/games/commerce-config.json` to the verified API origin, then test submission, rate limiting, admin authorization and expiry behavior before advertising the form.
