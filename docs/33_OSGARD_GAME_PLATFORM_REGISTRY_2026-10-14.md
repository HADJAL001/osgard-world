# OSGARD PLAY Signal Atlas — registry & integration contract

Date: 14 October 2026  
Repository: `HADJAL001/osgard-world`  
Implementation branch: `feat/osgard-game-platform-registry-20261014`

## Why this change

OSGARD WORLD already has a React 19 / Vite / TypeScript portal, an independent static Games hub, eleven game entry points, consent-gated analytics, a partner ecosystem directory, a local financial scenario model, and a Commerce API/admin surface. The platform does not need a second catalogue or one universal game engine. NULL//SHIFT uses a CI-generated Godot Web export with a browser fallback, REMIX ships Unity WebGL assets, and the other games use browser/Canvas/HTML/React surfaces.

The missing common contract was a versioned, machine-readable inventory of runtime family, launch route, network dependency, save scope, device caveat, and repository evidence. This change adds that contract and a user-facing diagnostic map without replacing the existing catalogue or game engines.

## Implementation

- Added `public/games/game-registry.v1.json`, an explicit schema-v1 inventory for the eleven catalogue IDs.
- Added `/games/platform-map/`, a premium responsive Signal Atlas page for searching/filtering by client/runtime, network dependency, and save scope.
- Each entry links to the existing route. The map displays device-support caveats and does not fabricate ratings, players, revenue, uptime, or benchmarks.
- The runtime uses text-safe DOM APIs, validates the fetched registry before rendering, fetches only a same-origin JSON file, and does not add cookies or local persistence.
- The page calls the existing consent-gated analytics interface only for allow-listed event types. The existing consent module remains responsible for opt-in gating.
- Added desktop/mobile catalogue navigation links and a sitemap entry.
- Bumped the PWA shell cache and added the public page/assets/registry to the static cache allow-list and offline precache. No commerce/admin endpoint is added to cache.
- Added `scripts/game-platform-contract-smoke.mjs`, registered it as `npm run qa:platform-map`, and wired it into `qa:games-portal`.
- Extended the production route matrix to check the page, CSS, JS and JSON registry.

## Registry meaning and limits

- The registry is a source-level capability inventory, not evidence of live service uptime, physical-device certification, frame rate, latency, or a completed QA session on every device.
- `touchValidation: not-device-verified` is intentional for all entries; it prevents a desktop browser check from becoming a false mobile-support claim.
- Network dependency and local save labels describe the currently documented architecture. They are not a live API probe.
- A local save is not cloud synchronization.
- NULL//SHIFT has a CI-generated Godot export route, so the static source contract points to its Godot project and browser fallback; production availability still needs a deployment route check.
- The capability map is a public technical overview, not another payment/ad placement. It never enables advertisements or purchase flows.

## Existing commerce/security boundary retained

- `public/games/commerce-config.json` keeps the API URL empty until a production endpoint is configured.
- Live payments and Premium entitlement remain disabled until the payment provider, database, webhook secret, server-side entitlement/cancellation/refund policy, and production smoke tests are configured.
- No ad network, rewarded-ad callback, third-party analytics SDK, or external tracking CDN was added.
- The existing financial model remains assumption-driven, not production revenue.
- The existing partner inventory remains `inquiry_only`; this change does not activate a paid sponsor placement.
- This branch does not deploy to production or modify DNS.

## Validation

Run at the repository root:

```sh
npm run qa:platform-map
npm run qa:games-portal
npm run qa:production-routes
npm run check
npm run build
```

The new network-free contract smoke verifies:

1. exactly eleven unique registry IDs, equal to the cards in the current catalog;
2. allowed runtime, network and save-state enums;
3. source evidence exists in the repository;
4. routes are constrained to `/games/` and do not contain traversal/query fragments;
5. unsupported-device caveats are explicit and no social-proof metrics are included;
6. the map, filters, SEO, reduced motion, keyboard focus, contact CTAs, and same-origin registry fetch exist;
7. consented event use is routed through the existing analytics contract;
8. both catalogue navs, PWA offline/cache assets, sitemap and QA script registration are wired.

## Rollout

1. Review the branch and wait for GitHub Actions to pass.
2. Merge only after the repository's current parallel PR changes are reconciled and the CI matrix is green.
3. Deploy through the repository's existing approved path; do not copy only the HTML, because the registry JSON, CSS, JS, sitemap, and service worker must ship together.
4. In production, run the read-only route matrix against `https://osgard.world` and inspect `/games/platform-map/` on desktop and a physical mobile device.
5. If physical testing confirms touch support for a game, update only that game's contract with test device/browser, date, and QA evidence. Never infer device support from a generic user-agent string.
6. For actual ads or payment sales, follow the existing commerce rollout checklist; keep live keys out of the repository and keep live sales off until verification is complete.
