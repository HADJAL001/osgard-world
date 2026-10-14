# OSGARD WORLD — Project Intake & Lead Attribution

Date: 2026-10-14  
Branch: `feat/osgard-project-intake-growth-20261014`  
Repository: `HADJAL001/osgard-world`

## Why this change

The React portal already had a protected Commerce API lead endpoint (`POST /v1/leads`) with rate limiting, a PostgreSQL `commerce_leads` table, consent acknowledgement and a honeypot. The Development page mainly routed visitors to Telegram; the form requested in the product brief was missing. The public `public/games/commerce-config.json` intentionally keeps `apiBaseUrl` empty until an API endpoint is deployed and ready.

## Implemented on this branch

1. Added a premium responsive project-intake form to `/development`, using the existing OSGARD visual system.
2. Added project type, optional budget, reply contact, task description, explicit data-processing acknowledgement and a non-focusable honeypot field.
3. Uses the existing `/games/commerce-config.json`; does not guess a production API address.
4. Accepts only an explicit HTTPS API base (or loopback HTTP for local development), without credentials, query strings, fragments or unapproved paths.
5. POSTs to the existing rate-limited `/v1/leads` endpoint only when the API is configured.
6. Preserves the form draft when the service is unavailable and provides user-initiated WhatsApp/email links. The UI explicitly says when the data was not saved by the server.
7. Sends source, campaign and game labels from allow-listed URL attribution tags, but no referrer URL or free text into attribution.
8. Extends server validation to normalize lead attribution using the same game/source/campaign policy as checkout attribution.
9. Adds columns safely with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, preserving existing leads as `unknown / direct / empty campaign`.
10. Adds a 90-day aggregate by game/source/campaign to the authenticated admin overview and the fields to protected lead detail output.
11. Adds network-free source/contract tests and service unit tests.
12. Does not enable any advertising provider, Stripe live checkout, Premium entitlement or external analytics SDK.

## Lead attribution semantics

- The stored `gameId`, `source` and `campaign` are labels supplied in a URL and validated server-side. They classify the route that delivered the lead; they do not prove a unique visitor or causal incrementality.
- The form's processing checkbox is required for lead submission. It is not consent for unrelated tracking.
- Optional analytics remains governed by the existing separate consent control.
- When the API config is empty or the server does not confirm storage, the site does not say the lead was saved. Manual contact links only open a user-controlled compose screen; they do not auto-send a message.
- Lead details include contact information and remain available only through the authenticated admin endpoint. Aggregates do not expose those fields.
- Budget is optional, description is bounded, SQL inputs remain parameterized, and the existing server rate limit/honeypot remain in place.

## Validation

Run:
```sh
npm run qa:project-intake
node --test services/osgard-commerce-api/test/core.test.mjs
npm run check
npm run build
npm run qa:ecosystem
npm run qa:campaign-manager
```

The GitHub CI result must be green before merging. This branch is not itself a production deployment.

## Still required before live collection

1. Deploy and test the Commerce API with PostgreSQL migrations.
2. Configure the public API base in `public/games/commerce-config.json` or the approved same-origin proxy.
3. Verify cross-origin policy, TLS, environment secrets and the API `/readyz` health state.
4. Confirm the published privacy notice describes the actual retention, access and deletion process for submitted leads.
5. Submit a real test enquiry and verify both the public response and the authenticated admin record without exposing the contact in logs.

## Next commercial experiment

Compare visits to the Development section, form starts, confirmed server saves and qualified enquiries by `gameId/source/campaign`. Do not interpret button clicks or form attempts as saved leads. Use the current admin aggregate only after deployment and only with real records.
