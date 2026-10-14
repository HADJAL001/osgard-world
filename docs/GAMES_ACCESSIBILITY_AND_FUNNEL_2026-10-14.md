# OSGARD WORLD GAMING — seven upgrades, 14 October 2026

## Audit baseline

Repository: HADJAL001/osgard-world, base branch master. The root application uses React 19, Vite and TypeScript. Games are also served from public/games as static HTML/JavaScript. The current hub has eleven game entries, search and genre filters, favorites/recent history, a modal iframe player, PWA installation, consent-gated analytics, game recommendations, sponsor inventory, a project ecosystem directory, a protected admin area and a separate Node/PostgreSQL commerce API.

The existing code explicitly keeps live checkout and ad-network activation disabled until operator-controlled provider accounts, API keys, database, site approval, webhook and legal setup exist. This work preserves that policy. It does not claim that live advertising, revenue, payment processing or production deployment has been activated.

## Seven delivered upgrades

1. **Accessibility centre.** Persistent preferences for system/reduced/full motion, higher contrast, enlarged type and 44px interaction targets. The dialog includes focus styling, live announcements and a responsive layout.
2. **Player recovery.** The game-player dialog adds a retry action that reloads the selected iframe route without forcing the user to close the modal.
3. **Consent-gated funnel evidence.** New events record coarse search-length buckets, genre filters, favorites, fullscreen intent, retry/error buckets and accessibility preference changes. Raw search terms and form fields are not sent.
4. **Client/server contract parity.** The same seven event names were added to the browser and commerce API allow-lists. Existing explicit consent and bounded queue rules remain.
5. **Safe admin CSV export.** The protected analytics dashboard exports the currently loaded aggregate summary, cohorts and snapshots. It excludes sensitive-looking keys, caps rows and neutralizes spreadsheet formula-leading cells. JSONL export remains.
6. **Focused CI quality gate.** Static contract smoke tests verify asset wiring, client/server event parity, accessibility, privacy, player retry and CSV protections. A GitHub Actions workflow runs the focused check and existing queue/API tests.
7. **Release and operations runbook.** This document records architecture, tests, privacy boundaries and external setup required for release.

## Files added

- public/games/accessibility-center.css
- public/games/accessibility-center.js
- public/games/catalog-funnel-events.js
- scripts/games-accessibility-funnel-smoke.mjs
- .github/workflows/games-accessibility-funnel.yml
- docs/GAMES_ACCESSIBILITY_AND_FUNNEL_2026-10-14.md

## Files updated

- public/games/index.html — loads the accessibility and funnel modules with build-version query strings.
- public/games/consented-analytics.js — expands the consented event allow-list.
- services/osgard-commerce-api/src/core.mjs — matching backend event allow-list.
- public/games/admin/index.html — adds aggregate CSV beside the existing JSONL export.
- services/osgard-commerce-api/test/core.test.mjs — validates the new events through the server consent validator.
- scripts/consented-analytics-queue-smoke.mjs — exercises new events in the client queue.
- package.json — adds the focused QA command.

## Validation

Run from repository root with Node 22:

    npm run qa:games-accessibility-funnel

It runs the contract smoke, existing consented queue simulation and commerce API core tests. The dedicated GitHub Actions workflow performs these checks on pull requests. This suite does not substitute for a formal WCAG audit, production deployment check, actual ad inventory approval, Stripe transactions or legal review.

## External readiness and deployment

- This feature branch must pass CI and be reviewed before merging.
- Production deployment is separate and requires the repository's manual deployment workflow secrets for the dedicated host, user and SSH key.
- The accessibility features do not need third-party services.
- Funnel events require explicit analytics consent and a ready same-origin or configured commerce API. With no API, the UI still works but no fake counters are displayed.
- No advertising network is activated. Partner inventory remains inquiry/planned until account review, consent, placement disclosures and commercial agreement are checked.
- Live Stripe checkout and OSGARD PREMIUM stay subject to PostgreSQL/Stripe configuration, webhook validation, prices, entitlement lifecycle and operator opt-in.
- Run the existing ten-project health audit; transient network errors do not by themselves prove a website is permanently down.

## Commercial priority

First merge and observe real, consented funnel events, then inspect retry/error buckets and development inquiry conversion. Use measured results to prioritize games with genuine replay and onward-navigation signals. Keep sponsorship inquiry-only and defer subscriptions until entitlements, cancellation and recurring benefits are ready.
