# Commerce API readiness: decouple platform availability from payments

Date: 14 October 2026  
Repository: `HADJAL001/osgard-world`  
Branch: `fix/commerce-readiness-decouple-payments-20261014`

## Finding

The former `GET /readyz` returned HTTP 503 unless PostgreSQL/schema, Stripe, the Stripe webhook secret, and payment-mode flags were all ready. This coupled unrelated capabilities together: a missing payment-provider secret could make a database-backed platform service appear unavailable even while lead intake, consented analytics, referrals and sponsor-campaign storage were otherwise able to operate.

## Change

- `buildServiceReadiness` is now a small, explicit, unit-tested database-backed service readiness model.
- `/readyz` returns HTTP 200 only when the database is configured and schema initialization completed; missing/unavailable database stays HTTP 503.
- The response preserves the `ready` boolean for existing health-check clients and adds redacted `status`/database check details.
- Payment readiness remains separate in the protected `/v1/admin/readiness` report.
- Checkout and webhook endpoints keep their own provider/database/payment-mode guards. This change does not enable Stripe, change prices, enable Premium entitlements or activate ads.
- The commerce rollout smoke test now checks the separation so the regression cannot silently return.

## Validation

Run from the repository root:

```sh
npm run check
npm --prefix services/osgard-commerce-api test
node scripts/commerce-rollout-smoke.mjs
```

The unit tests cover the case where the database is ready but Stripe/webhook are not configured, plus fail-closed behavior when the database is missing or schema initialization fails. CI must pass before merge. A passing test does not prove a live payment, live campaign, database uptime or legal compliance; those still require configured services and post-deploy checks.

## Expected operational effect

The platform can report general database-backed readiness without waiting for payment-provider activation. The operator-facing readiness report continues to make missing Stripe setup, inactive prices, disabled live payments, incomplete Premium entitlements and non-integrated ad networks explicit.
