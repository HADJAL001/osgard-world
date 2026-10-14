# OSGARD Experiment Intelligence

## Why this module exists

OSGARD already has a consented analytics queue, a server-side event allow-list, an aggregate operations dashboard and a separate financial scenario model. Experiment Intelligence adds a controlled loop between a product hypothesis and an operational decision. It deliberately avoids pretending that projected values are measured outcomes.

## Entry points

- /games/experiments/ — responsive experiment analysis, sample-size estimator, aggregate JSON/CSV import/export and a protected read-only connection to Commerce API.
- /games/experiments/active.json — public feature flag for the catalogue CTA experiment. The default is enabled=false; leave it disabled until the Commerce API is deployed/configured and event handling has been checked.
- /games/experiments/experiment-runtime.js — consent-gated runtime for the catalogue CTA only.
- /games/experiments/model.js — standalone statistical functions.
- scripts/experiment-lab-smoke.mjs — model/runtime smoke checks.
- services/osgard-commerce-api/src/core.mjs and src/server.mjs — server-side event validation and aggregate reporting.
- public/games/consented-analytics.js — client-side allow-list; must match the server allow-list.
- src/core/manifest.ts — typed event-name manifest.

## Current test setup

Experiment ID: catalog-cta-v1.

- Control A: “Исследовать игры ↘”
- Challenger B: “Выбрать игру ↘”
- Allocation: 50/50, using crypto.getRandomValues when the experiment is enabled.
- Conversion: click on the primary catalogue CTA.
- Exposure/conversion deduplication: once per tab session.
- Population: only visitors who explicitly enabled analytics and have the shared consent queue available. Non-consenting visitors see the control and are not assigned or tracked.
- Initial release flag: OFF. Do not switch it on before the backend route, event pipeline, privacy control and rollback have been verified.

The experiment runtime keeps assignment only in sessionStorage, uses the pre-existing osgard.games.analytics-consent.v1 choice and queues data through window.OSGARD_CONSENTED_ANALYTICS. It does not use fingerprinting, add third-party analytics scripts or store the operator token.

## Event contract

Only aggregate identifiers are allowed in source, with no free-text user input:

- experiment_exposure — source=experiment:<slug>:a|b
- experiment_conversion — source=experiment:<slug>:a|b
- experiment_guardrail — source=experiment:<slug>:a|b

The slug pattern is lowercase a-z, digits and hyphen, up to 40 characters. The API requires consent=true, an accepted event name, a valid session/event ID, known game ID and valid experiment-source format. There are no names, emails, IP addresses, free-text payloads or raw player histories in this contract.

GET /v1/admin/overview is protected by the existing ADMIN_API_TOKEN and returns aggregates for the last 30 days. The lab only calls it after the operator submits a token, and clears that token from the field and in-memory variable after the request. The browser config is public and must only contain the API URL, never a secret.

## How to interpret the result

- Conversion rates are successes divided by observed exposures.
- Individual rates use 95% Wilson intervals.
- Difference interval uses a Newcombe-style combination of the Wilson limits.
- The p-value is an approximate pooled, two-sided two-proportion Z test.
- The sample-size calculator estimates a per-arm count under normal-theory assumptions.
- Guardrail breach halts the challenger recommendation if its failure rate exceeds the control by the configured threshold.
- A candidate winner requires at least 100 exposures and 10 conversions per arm, p-value below 0.05, a difference interval not crossing zero and no guardrail breach.
- This is a decision aid, not a claim of causality. Repeated peeking, multiple comparisons, seasonality, clustering, bots and telemetry loss can invalidate simple-test assumptions. Pre-register one primary metric and a stopping rule before activating a test.

## Deployment checklist

1. Merge only after CI tests and code review pass.
2. Configure and verify Commerce API HTTPS origin (or approved same-origin /commerce-api reverse proxy) in public/games/commerce-config.json. Do not put credentials there.
3. Run npm run qa:experiment-lab, npm run qa:queue, npm run qa:games-portal, npm run qa:games-diagnostics and npm run qa:production-routes.
4. Confirm a consent grant queues events, a revocation clears pending events and events are acknowledged by the server.
5. Confirm experimentVariantStats appears in the authenticated admin overview and is aggregated by experiment and variant.
6. Confirm the production privacy notice accurately describes analytics and obtain any required legal review for the actual audience/geographies.
7. Set enabled to true in active.json only after these checks; deploy; verify exposures and CTA clicks; then switch back to false to roll back.
8. An A/B rollout is not a payment/ad activation. Advertising and checkout retain their separate campaign/Stripe controls.

## Known limits

- The hosted site, Commerce API and Postgres data were not modified by this branch. Deployment and API connectivity depend on the current CI/deploy setup, a configured service URL, a ready database and operator credentials.
- The public website could not be confirmed live from this execution environment; project links and current production health still need the repository's existing external project audit and production route QA jobs against the real deployment.
- The statistical method is approximate and uses consented, browser-observed events; it is not a randomized controlled trial guarantee or a source of verified revenue.
