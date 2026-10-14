# OSGARD Lead Pipeline CRM — 14 October 2026

## Why this change exists

The OSGARD repository already has consent-gated game analytics, structured game/source/campaign attribution, a rate-limited lead intake endpoint, Stripe-backed orders and a protected Commerce Admin. The missing operational step was the hand-off after a lead was saved: the service could list a lead but had no protected workflow to record outreach, qualification, a next action or an internal history.

This change adds that workflow to the existing Commerce API and its existing protected admin page. It does not introduce another CRM database or a parallel admin token.

## Lead states

- `new` — received; no outreach is recorded.
- `contacted` — the team has started outreach.
- `qualified` — the opportunity was reviewed and is a fit to pursue.
- `converted` — the commercial lead is marked closed by an operator. **This is a CRM status, not proof of payment.** Paid orders remain sourced from verified Stripe events.
- `lost` — this opportunity is not active. It can be reopened as `contacted`.

Allowed transitions are validated server-side. The browser's dropdown is not an authority. Unknown states are not silently overwritten.

## Data and endpoints

The existing `commerce_leads` table gets additive columns `internal_note` and `next_action_at`; existing lead rows and attribution are retained. `commerce_lead_activities` stores status transitions, note changes, follow-up changes and UTC timestamps. Activity records cascade only when the associated lead is deleted.

- `PATCH /v1/admin/leads/:id` updates an allowed state, internal note and/or follow-up datetime.
- `GET /v1/admin/leads/:id/activities` retrieves a bounded timeline.
- Both routes use the existing `requireAdmin` middleware, no-store headers and admin API rate limit.
- The API validates the UUID, input length, transition graph, note size and follow-up range; SQL values are parameterized and each write is committed atomically.
- Admin browser code keeps the bearer token in memory only, sends no credentials/cookies, and uses `textContent` for untrusted lead data.

## Business funnel honesty

The overview adds aggregate counts for each pipeline state and overdue follow-ups. These are stored lead rows, not users, games or paid orders. An operator's `converted` status does not alter Stripe order status or reported paid revenue. Only server-verified commerce data continues to drive paid-order reporting.

No fake leads, events, impressions, sponsor records or revenue are created. This change does not activate ads, live payments or OSGARD PREMIUM.

## Checks

Run from the repository root:

```sh
npm run qa:lead-workflow
npm run --prefix services/osgard-commerce-api check
npm run --prefix services/osgard-commerce-api test
npm run check
npm run build
```

The unit tests exercise legal/illegal transitions, unknown statuses, UUID validation, internal-note bounds, follow-up dates and terminal conversions. The smoke contract checks that the protected API, schema, UI and test script remain connected. CI and production deployment are still required before this feature is live.

## Release steps

1. Review this change and require GitHub Actions to pass.
2. Apply the additive schema via the normal service startup/migration path.
3. Deploy the frontend and Commerce API together.
4. Use a non-sensitive test lead to verify state changes and history through the protected admin.
5. Confirm backup/retention and applicable privacy text for internal follow-up notes before broad commercial operation.
