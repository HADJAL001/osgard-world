# OSGARD Commerce API

Dependency-free Python service for consented game events, project/partner leads, guarded one-time Stripe Checkout and an operator-only commercial dashboard.

## Safety defaults

- Stripe is disabled by default. No payment links or prices are fabricated.
- Only explicitly configured one-time support/consultation products are allowed. This release does not grant game entitlements, sell subscriptions, run rewarded ads or activate sponsor placements.
- Browser-supplied amounts are ignored. Price ID, amount, currency, Checkout Session, payment status and refunds are verified server-side with Stripe.
- The webhook verifies the raw request body and Stripe-Signature timestamp/HMAC. Duplicate events are idempotent.
- Analytics requires an explicit consent flag, uses event/game allowlists, is rate limited, and is marked as client-submitted. Only Stripe-confirmed order updates create server-side checkout_paid events.
- ADMIN_API_TOKEN is required for lead/order lists and overview. It is never sent to browser storage; the operator UI holds the token in the open tab only.
- SQLite is stored in a persistent data volume. Event/lead/refunded-order retention defaults are configurable. The defaults need legal/accounting review before launch.

## API

- GET /health and /health/ready — readiness and payment mode; never returns secrets.
- GET /v1/products — returns only configured support/consultation products and asks Stripe to recheck each Price before enabling checkout.
- POST /v1/leads — consented request intake with a honeypot and bounded fields.
- POST /v1/events — consented, allowlisted game/referral/funnel events.
- POST /v1/checkout/session — creates a hosted Stripe Checkout Session only when mode/key/webhook are configured.
- GET /v1/checkout/status?session_id=... — verifies the matching server-side order and Stripe session; redirects alone do not mean payment succeeded.
- POST /v1/webhook/stripe — idempotent Stripe webhooks, signature checked against raw body.
- GET /v1/admin/overview, /v1/admin/leads, /v1/admin/orders — Authorization: Bearer ADMIN_API_TOKEN.

## Environment and Stripe setup

Never put secrets into public/games/commerce-config.json, HTML, JavaScript, Dockerfiles or Git.

For test checkout:
1. Create a one-time Price in the Stripe test dashboard.
2. Set STRIPE_MODE=test, STRIPE_SECRET_KEY=sk_test_..., STRIPE_WEBHOOK_SECRET=whsec_....
3. Set COMMERCE_PRODUCTS_JSON to a JSON array of actual product/Price IDs, such as:

    [
      {
        "key": "support-starter",
        "label": "Поддержать OSGARD",
        "description": "Разовый вклад в поддержку авторских игр и инфраструктуры.",
        "stripePriceId": "price_REPLACE_WITH_REAL_TEST_PRICE",
        "fulfillmentMode": "support",
        "mode": "payment",
        "active": true
      }
    ]

4. Configure the webhook endpoint https://osgard.world/commerce-api/v1/webhook/stripe for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, and charge.refunded.
5. Test completed, cancelled, expired, repeated webhook, refund and failure flows in Stripe test mode.

For live checkout, the server additionally requires STRIPE_MODE=live, an sk_live key, live Price IDs, a matching live webhook secret, LIVE_PAYMENTS_ACK=I_UNDERSTAND_LIVE_PAYMENTS, SELLER_LEGAL_NAME, SELLER_COUNTRY, SUPPORT_EMAIL, TERMS_URL and PRIVACY_URL. These gates are engineering guardrails, not legal/tax approval. Do not enable live payments until seller verification, tax, refunds, consumer terms, support and retention policy are approved.

The only supported fulfillment modes are support and consultation. Subscription, digital entitlement and pay-to-unlock flows remain unavailable until a server-side entitlement ledger and refund/cancellation logic are implemented.

## Retention

Default cleanup: consented events 90 days, closed/spam/deleted leads 180 days, failed/expired/refunded orders 365 days. Override with EVENT_RETENTION_DAYS, LEAD_RETENTION_DAYS and ORDER_RETENTION_DAYS after a retention review. Paid orders remain available for accounting/support until a documented retention policy is implemented.

## Local test

    python3 -m unittest discover -s commerce-api -p 'test_*.py' -v

Run the server locally with:

    DATABASE_PATH=/tmp/osgard-commerce.sqlite3 python3 commerce-api/app.py

Docker runs as UID 10001, exposes only the internal 8080 port, and must be attached to the private network used by the OSGARD Nginx service.
