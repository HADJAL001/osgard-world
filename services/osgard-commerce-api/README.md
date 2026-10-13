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
4. Run npm test, npm run check and npm start.
5. Configure a Stripe test webhook to POST to /v1/stripe/webhook. For Stripe CLI, forward events to localhost:8080/v1/stripe/webhook and copy the generated whsec_ value into STRIPE_WEBHOOK_SECRET.

The API boots in degraded mode without secrets so /healthz remains observable, but checkout is disabled until database, Stripe key, webhook secret and prices are configured.

## Render deployment

Create a Web Service from the GitHub repository. Set Root Directory to services/osgard-commerce-api, Runtime to Docker, Dockerfile path to Dockerfile and Health Check Path to /healthz. Attach a Render PostgreSQL database and set DATABASE_URL to its private connection URL. Use PostgreSQL; the service filesystem is not an order database.

Configure in the hosting dashboard, never in Git:
- PUBLIC_BASE_URL=https://osgard.world
- ALLOWED_ORIGINS=https://osgard.world,https://www.osgard.world
- DATABASE_URL=<private PostgreSQL URL>
- STRIPE_SECRET_KEY=<Stripe test secret key first>
- STRIPE_WEBHOOK_SECRET=<endpoint signing secret>
- STRIPE_PRICE_SUPPORT_OSGARD=<one-time Stripe Price ID>
- STRIPE_PRICE_DEVELOPMENT_DEPOSIT=<one-time Stripe Price ID agreed with the client>
- STRIPE_PRICE_OSGARD_PREMIUM_MONTHLY=<recurring Price ID, only after benefits are ready>
- ENABLE_LIVE_PAYMENTS=false
- ENABLE_OSGARD_PREMIUM_SALES=false
- ADMIN_API_TOKEN=<random secret of at least 32 characters>
- DATABASE_SSL=true only if the database's TLS certificate chain is trusted in this runtime.

Register a Stripe webhook endpoint at https://YOUR-API-HOST/v1/stripe/webhook and subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, invoice.paid, invoice.payment_failed and customer.subscription.deleted. Copy the endpoint signing secret into STRIPE_WEBHOOK_SECRET.

## Static-site configuration

Edit public/games/commerce-config.json and set apiBaseUrl to this API's HTTPS URL, without a trailing slash. This value is public and must never contain secrets. If left empty, the checkout page attempts same-origin /commerce-api routes; that only works if the website host has a reverse proxy for that prefix.

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
