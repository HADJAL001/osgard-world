# OSGARD Partner Lead Pipeline — 13 October 2026

## Scope

This change turns the existing Commerce API lead list into a small, protected intake workflow. It does not change the public games catalogue, expose leads publicly, activate a third-party ad network, or enable live checkout.

The public Partner Studio form continues to create a lead only when the Commerce API and database are configured. Otherwise, the existing manual contact fallback remains in effect.

## Lead statuses

- `new` — a submitted request that has not been reviewed.
- `contacted` — OSGARD has responded or started contact.
- `qualified` — the request is a plausible project opportunity.
- `won` — the deal was accepted/signed; this is an operator-entered CRM label, not a payment claim.
- `lost` — closed or declined.
- `spam` — unsolicited or abusive request.

These labels are manually maintained by the operator. They do not infer a payment, signed contract, or conversion from analytics.

## Protected endpoints

- `GET /v1/admin/leads?limit=100` — reads the latest leads.
- `PATCH /v1/admin/leads/{leadId}` with JSON `{"status":"qualified"}` — updates one allow-listed status.
- Both require `Authorization: Bearer <ADMIN_API_TOKEN>`. IDs must be UUIDs, payloads accept only the `status` field, and unsupported statuses are rejected.
- Responses use private/no-store cache controls. CORS permits PATCH for the existing configured API origins. The page does not persist the token into localStorage or sessionStorage and is marked noindex.

The API adds `updated_at` to the existing `commerce_leads` table using an idempotent schema migration. This stores the time of the latest status change; it is not a full audit log of every transition.

## Deploy and configure

1. Deploy the Commerce API and PostgreSQL database using the repository's existing runbook.
2. Set `ADMIN_API_TOKEN` to a strong random value of at least 32 characters in the API service's secret environment. Do not place it in source code, a URL, public JSON, or a client build.
3. Set `public/games/commerce-config.json`'s `apiBaseUrl` to the actual same-origin proxy URL (normally `/commerce-api`) only after the API is deployed and its Nginx/proxy route is confirmed.
4. Build and deploy the frontend; open `/games/commerce-admin/`, provide the server token and load the page. The latest 100 leads can be searched and filtered locally; changes are saved to the server.
5. Keep live payments disabled until Stripe keys, Price IDs, webhook verification, refund handling and terms have been independently checked.

## Tests

From the repository root:

```sh
cd services/osgard-commerce-api
npm test
npm run check
cd ../..
node scripts/commerce-rollout-smoke.mjs
```

No production deployment is implied by the source change. The Render workspace inspected during this work contained the unrelated SkillCred service and no OSGARD Commerce API/Postgres instance, so production configuration still needs confirmation in the correct hosting account.
