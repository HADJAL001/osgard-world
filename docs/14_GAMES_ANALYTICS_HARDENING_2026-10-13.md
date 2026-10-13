# OSGARD WORLD — hardening consented game analytics

Date: 13 October 2026  
Repository: HADJAL001/osgard-world  
Implementation branch: feat/games-analytics-hardening-2026-10-13

## Baseline audit

The repository already includes a React 19 / Vite 6 / TypeScript portal, static browser/WebGL game builds, a Godot export workflow for NULL//SHIFT, the Games catalogue, player-session instrumentation, a Node 22 Commerce API, an optional Postgres store, consent-gated events, lead intake, a token-protected commerce admin panel, a local revenue-assumptions calculator, and an inactive sponsor inventory. This change set extends those existing pieces rather than replacing the portal or forcing every game onto the same engine.

## Changes in this branch

- Added optional, validated client event IDs. New clients submit a unique eventId; the database primary key now de-duplicates retries. Old clients without this field remain accepted for backward compatibility.
- The browser commerce client uses a random, tab-scoped session identifier for catalogue, partner, Premium and outbound promotion events; game sessions continue using a separate per-run session identifier.
- Added consent-gated page-view events catalog_viewed and partners_page_viewed, and ensured the Premium store loads the shared consent-aware client. Page views are not sent before explicit consent.
- Added a server-side retention setting ANALYTICS_RETENTION_DAYS: valid values 30–365, default 90. Expired analytics rows are purged on startup and every six hours when the database is ready. An index supports game/time aggregation.
- Extended the protected commerce admin API/UI with 30-day metrics by game and summary funnel events (catalog views, game starts, completed sessions, cross-promotion clicks, lead events and Premium visits). The UI renders untrusted values with textContent, not interpolated HTML.
- Corrected privacy and partner-form copy to match the current API-first, manual-WhatsApp-fallback behavior and documented the retention policy.
- Added service-domain tests and static rollout assertions for event IDs, backward compatibility, consent gate, retention, API aggregates and dashboard wiring.

## Evidence and boundaries

- This is a proposed GitHub branch/PR; it does not by itself publish changes to https://osgard.world.
- The event endpoint stores only consented allow-listed events. Its event rows do not include contact fields, email, phone or bearer tokens. Host/proxy operational logs may be governed separately.
- A deployable API and PostgreSQL database are still required to persist leads/events. Production credentials were not read or changed by this branch.
- No advertising network, rewarded-ad callback, live payments or subscription entitlement activation is added here. Those remain disabled until provider accounts, review, server configuration and game-account access rights are ready.
- Aggregates are consented recorded events, not all page visits. UTM clicks do not prove downstream purchases. The financial model in /games/monetization/ remains a scenario calculator, not verified revenue.
- Automated CI checks are required on the PR. Static source assertions are not evidence of live production behavior; a deployed route matrix and manual device QA remain release gates.

## Next highest-impact deployment steps

1. Let CI pass and review the branch.
2. Deploy the Commerce API on the private frontend network and provision PostgreSQL; keep live Stripe and Premium flags off.
3. Verify the public route matrix and API health through the existing TLS reverse proxy.
4. Test consent accept/refuse/revoke, page view, duplicate event replay, retention cleanup and mobile catalogue navigation in a browser.
5. Confirm the legal operator, jurisdiction, data contact and retention settings before using the service commercially.
6. Verify external project domains and their visible terms/contact/security before sponsoring or buying traffic. Existing audit evidence says their live content could not be independently fetched; keep any domain requiring a trust review out of paid campaigns until checked.
