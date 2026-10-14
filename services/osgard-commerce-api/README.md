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

## Optional CASCADE LAB OpenAI Research Director

The `POST /v1/lab/research-director` endpoint is a separate, rate-limited analysis path. It requires the client's explicit `consentToOpenAI: true` and accepts only a bounded, allow-listed physics summary, compact trajectory samples and up to four attempts from the same scenario. It rejects mixed level/mode comparisons, raw notes and unknown request schemas. The model cannot run tools or change a puzzle automatically.

- Set `OPENAI_API_KEY` in the private API service environment. Never put it in the web client, a mobile bundle, a public config file or Git.
- Optional defaults: `OPENAI_LAB_MODEL=gpt-6-luna` and `OPENAI_LAB_DAILY_REQUEST_LIMIT=100`. The endpoint additionally limits each IP to five requests per 15 minutes and permits at most two concurrent requests per process.
- Uses the OpenAI Responses API with strict Structured Outputs and `store: false`; OSGARD does not persist prompts or model responses. This does not override provider abuse-monitoring or account data controls; review those separately.
- Without the key, the endpoint returns `503 AI_ADVISOR_NOT_CONFIGURED` and the game retains its deterministic, local-only tools. The front-end also offers a research brief that can be copied manually.
- Keep API project spending limits and alerts configured in OpenAI. The in-process daily cap resets at UTC midnight and is a guardrail, not a billing system; multiple API replicas have independent counters.

The model returns a hypothesis plus one controlled next experiment. Its output is schema-validated server-side, its evidence references must exist in the request, and the suggested variable must be among the current run's available controls. It never receives player names, account identifiers, local notes or a full saved archive.

### Verification

`npm test` covers the input allow-list, consent gate, output schema, evidence references, available-variable checks, timeout/provider failures, the `store: false` request contract and the daily concurrency budget. `npm run check` includes the module's syntax check.

Never commit Stripe secrets, database URLs, the admin token or the OpenAI key. Never embed them in HTML or `commerce-config.json`.

## Static-site configuration

Set `apiBaseUrl` to the API's HTTPS origin without a trailing slash (for example `https://commerce-api.example.com`) or to the explicit same-origin prefix `https://osgard.world/commerce-api` after the proxy and private container are verified. This public value must never contain secrets. If `apiBaseUrl` is blank, current browser clients probe only the documented same-origin `/commerce-api/healthz` endpoint with cookies omitted; they use `/commerce-api` only when the response identifies `service: "osgard-commerce-api"` and `databaseReady: true`. An absent, unhealthy or non-matching service remains fail-closed; lead forms offer the disclosed manual WhatsApp fallback. A local queued analytics event is not evidence that the server received it. API/database readiness does not enable Stripe checkout, paid premium or third-party advertising.

## Qualified game invitations and cosmetic rewards

The Games intermission has buttons for Telegram, WhatsApp, VK, X, Facebook and the native share sheet. These open a sharing composer; they do **not** prove the user published anything. The current +50 SHARDS reward for a player-confirmed social share remains local-only and is clearly described as self-reported.

A separate referral reward is server-qualified when the API is deployed and configured:
- `POST /v1/referrals/register` registers `{ consent: true, referralCode, gameId, ownerToken }`. The client creates a random 128-bit owner token only when a sharing action is initiated; the server stores its SHA-256 hash, not the token. A referral code can be registered once and cannot be reassigned to a different owner.
- `POST /v1/referrals/claim` accepts `{ consent: true, ownerToken }`. It only claims registered codes for which the server has a referral-open event and a same-game referral-attributed session start and completion. The server-received completion must be at least 30 seconds after start, report at least 30 seconds of play and occur within seven days of registration. Rewards are one-time and limited to ten per request.
- The endpoint returns cosmetic SHARDS only. These points have no cash value and the server event checks help prevent accidental/repeated claims; they are not proof of a unique human or a fully fraud-proof referral. The wallet itself is stored in the browser and can be cleared, so do not use this mechanism for cash, gift cards or valuable paid items.
- Referral registrations are removed with the same analytics retention job (default 90 days, configurable from 30 to 365 days). Qualified claims are written atomically to prevent repeated claims for the same referral code.

**Deployment prerequisite:** this source change does not deploy/restart the Commerce API container. Build and restart that service with this repository's updated API code, then verify `/healthz` and that `/readyz` reports ready. Only then set the public `apiBaseUrl` in `public/games/commerce-config.json` to the verified same-origin prefix `https://osgard.world/commerce-api` (or a verified HTTPS API origin). It is currently empty by design; while empty, sharing works but server-qualified claims fail closed and will report that Commerce API is not configured. Never put secrets in that public JSON file.

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
