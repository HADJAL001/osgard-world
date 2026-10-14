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


## Server-to-server conversion attribution for OSGARD-owned services

`POST /v1/attribution/conversions` accepts a server-reported conversion from an OSGARD-owned service. It complements consented game-side impression/click/referral data so the commerce dashboard can distinguish a promo click from a later signup, qualified lead, booking or paid order.

### Configure credentials safely

1. Generate a unique random bearer token of at least 32 characters for each connected service (for example `marcosa`, `projects`, `senjorio`, `superday`, `myosa` or `gold-glamour`).
2. Put the token only in that service's private backend environment, such as `OSGARD_ATTRIBUTION_TOKEN`. Never put it in browser code, a mobile app, public `commerce-config.json`, a URL, Git commit or logs.
3. In the Commerce API's private environment set `OSGARD_ATTRIBUTION_TOKENS_JSON` to a JSON object mapping lowercase service IDs to the same tokens. The sample in `.env.example` is a placeholder, not a working secret. Restart/redeploy Commerce API after configuring it.
4. Call the endpoint from the destination service's server only. Persist permissible UTM fields and, if applicable, the validated `og_ref` with the destination transaction or account flow. Keep contact information in the destination system; do not send names, email addresses, telephone numbers, free text or customer IDs to this API.
5. Obtain consent for destination-side attribution where required by your privacy notice and applicable law. Send `consent: true` only when the destination service has recorded a valid consent state for the attribution processing.

### Minimal payload

```json
{
  "consent": true,
  "serviceId": "marcosa",
  "eventId": "provider-or-internal-unique-event-12345",
  "conversionType": "purchase_paid",
  "gameId": "signal-run",
  "source": "osgard_games",
  "campaign": "after_game",
  "referralCode": "og_a1b2c3d4",
  "amountMinor": 2599,
  "currency": "SEK"
}
```

- Send the token in `Authorization: Bearer …`; only the destination backend sends the request.
- Use a stable opaque `eventId` from the destination backend or payment provider. Retries with the same `(serviceId, eventId)` are idempotent.
- `amountMinor` and `currency` are required for `purchase_paid`, `purchase_refunded`, `subscription_started`, `subscription_renewed` and `subscription_refunded`. Amount is an integer in the currency's smallest unit; for a two-decimal currency, `2599 SEK` means 25.99 SEK. Refunds are sent as positive amounts and reported as negative movement.
- `account_created`, `lead_qualified`, `trial_started`, `booking_confirmed` and `subscription_cancelled` do not accept money fields.
- Attribution labels classify a link, but do not establish that promotion caused the result.
- For payment/refund events, send only after the destination independently verifies settlement/refund with its payment provider. This bridge authenticates the reporting service and deduplicates the report; it does not independently query that provider.

### Server-side example

```js
const response = await fetch(
  "https://osgard.world/commerce-api/v1/attribution/conversions",
  {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.OSGARD_ATTRIBUTION_TOKEN,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      consent: true,
      serviceId: "marcosa",
      eventId: paymentProviderEvent.id,
      conversionType: "purchase_paid",
      gameId: savedAttribution.gameId || "unknown",
      source: savedAttribution.source || "direct",
      campaign: savedAttribution.campaign || "",
      referralCode: savedAttribution.referralCode || "",
      amountMinor: payment.amountMinor,
      currency: payment.currency.toUpperCase(),
    }),
  },
);
if (!response.ok) {
  // Retry server-side with the SAME eventId; never create a new ID just to retry.
  throw new Error("OSGARD attribution ingest failed: " + response.status);
}
```

### Reporting and limitations

- The protected `/games/commerce-admin/` panel reports conversions by service, game, source, campaign and currency for the last 30 days.
- Stored conversion rows are removed after 365 days.
- Totals are reported outcomes, not independent accounting data. They remain separated by currency and are not net profit; fees, taxes and chargebacks beyond reported refunds are not calculated here.
- First-party analytics still measures consented visible promos and outbound clicks separately. A click is not a conversion; UTM labels do not prove causality.
- This source change adds the bridge but does **not** connect the destination domains automatically, provision their secrets, deploy/restart the API, or prove that any conversions exist. Each destination backend needs its own integration and privacy review before its events appear.
