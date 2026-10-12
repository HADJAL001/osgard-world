# OSGARD Games — admin, analytics and monetization control plane

**Status: not deployed.** The frontend PR does not introduce an insecure client-only admin panel. The currently audited `osgard-world` source exposes authenticated player endpoints, but no confirmed administrator-role contract or verified admin CRUD endpoints were found in the repository reviewed for this change. The game API sibling referenced in deployment notes was not accessible in the linked repository list. The control plane below is the implementation contract to complete when the backend and auth authority are available.

## Security boundary
Do not rely on a hidden route, a client-side password, a localStorage flag, or a frontend role check. Every admin request must be authorized server-side. A valid player JWT alone must not grant administrative rights. Use an explicit role/permission claim checked by the API, short-lived sessions where possible, CSRF protections if cookies are used, audit records for writes, request validation and rate limiting.

## Data model
- `Game`: slug, display title, description, genre, tags, entry URL, runtime type, version, supported input modes, status, visibility, related game IDs, seo title/description, created/updated timestamps.
- `Placement`: stable ID, location, format, sponsor label, campaign ID, start/end time, frequency cap, eligible game IDs, consent/geo rules, creative URL, destination URL, status.
- `Campaign`: brand/sponsor, signed-off disclosure text, landing URL, budget reference, dates, creative, expected and reported metrics, approval status. Avoid treating client clicks as verified paid impressions.
- `Entitlement`: server-owned account/subscription/product IDs, active dates, provider transaction reference and revocation state. Never trust client-side purchase state.
- `AnalyticsEvent`: event ID, event type, event schema version, timestamp, consent state and constrained non-PII dimensions. Do not store contact-form free text in analytics.

## Proposed endpoints (contract, not currently implemented)
- `GET /api/v1/admin/games` — list and status summary.
- `POST /api/v1/admin/games`, `PATCH /api/v1/admin/games/:id` — create/edit catalog entries with schema validation.
- `GET/POST/PATCH /api/v1/admin/placements` — manage labelled sponsor inventory and scheduling.
- `GET /api/v1/admin/analytics/summary?from=&to=&game=` — aggregate page views, game detail opens, launch clicks, trusted completed sessions, outbound clicks and lead handoffs.
- `GET /api/v1/admin/campaigns`, `POST/PATCH /api/v1/admin/campaigns/:id` — approve and schedule campaigns.
- `GET /api/v1/admin/audit-log` — read-only view of who changed a catalog, campaign, or monetization setting.
- `POST /api/v1/leads` — validate and store a lead only after a delivery target, retention rule, spam control and privacy disclosure are agreed.

All write endpoints should enforce named permissions such as `games:read`, `games:write`, `campaigns:approve`, `analytics:read`, `leads:read` and `settings:write`. Admin writes must use optimistic concurrency or version tokens to prevent lost updates.

## Analytics and consent
The new Games frontend gates its optional catalogue event calls on an explicit local consent choice. The existing `recordOsgardEvent` queue is shared with authenticated product/session APIs and is not a public, anonymous reporting service. Before using it for platform-wide reporting:
1. confirm server retention, event validation, access controls and schema;
2. define a consent policy for each applicable jurisdiction and audience;
3. remove/avoid PII, free-text briefs and sensitive URL/query data;
4. aggregate by date, source, game and campaign, with role-checked dashboards;
5. distinguish source-client events from server-verified game completion, impressions and paid transactions.

## Monetization status
No ad SDK, reward-video callback, payment provider, checkout, subscription, server entitlement or campaign serving is added by this PR. The visible partnership CTA is a business inquiry invitation, not a paid advertising unit. The frontend does not claim revenue from a CTA click. See `docs/GAMES_MONETIZATION_MODEL.md` for clearly labelled hypothetical scenarios.
