# OSGARD WORLD Games — run and publish runbook
Version 1.0 · 13 October 2026

## Local development

1. Clone the repository and checkout `feat/osgard-games-hub-2026-10`.
2. Install the package lock's dependencies with the package manager used by CI.
3. Run `npm run qa:games` to verify catalog schema, routes, entry points, consent rules and no-fake-metrics constraints.
4. Run `npm run check` and `npm run build`.
5. Run `npm run preflight:frontend` and `npm run qa:production-routes` against a staging base URL with `OSGARD_BASE_URL` before considering deployment.

The static hub entry point is `public/games/index.html`; Vite copies the public files to the production output. It loads only its own `/games/catalog.json`, `/games/hub.css` and `/games/hub.js`. Individual game entry points remain separate. The new `/games` route must be checked on both desktop and narrow mobile viewports.

## Current routes

- `/games` — new Games hub.
- `/games/catalog.json` — versioned catalog.
- `/games/time` — React/TypeScript Time game.
- `/games/swarm/index.html` — SWARM browser build.
- `/games/null-shift/index.html` — tracked NULL//SHIFT browser build.
- `/games/inherit/index.html` — INHERIT.
- `/games/remix/index.html` — REMIX landing page/Unity WebGL.
- `/games/privacy.html` — Games hub privacy/usage information.
- `/entertainment` — legacy link with a forward to `/games`.

## Production release

1. Review the feature branch changes and the QA run.
2. Merge only after the pull request's checks pass and the route matrix succeeds against staging.
3. Build with the existing `npm run build` flow; do not replace the site's Vite/React stack with a game engine.
4. Deploy via the existing controlled deployment workflow/runbook. The repository's deployment workflow uses server secrets; do not commit secrets or trigger a live deployment just to test.
5. Verify `/games`, catalog JSON, CSS/JS asset MIME types, all five launch routes, /entertainment forwarding, icon and mobile viewports.
6. Check browser console/network failures. A successful iframe HTML load is not considered proof that Unity/WebGL or a whole gameplay session started successfully.

## Unconfigured integrations

- Ad network publisher IDs and approval.
- Rewarded-video SDK and signed server reward receipts.
- Checkout provider and server-side payment webhooks.
- Subscription entitlement service and refunds.
- Admin CMS for catalog/ad campaign changes.
- Aggregate analytics dashboard and role-based access.
- Server-side lead form/CRM. The current form deliberately opens a prefilled mailto instead of claiming a server submission.

Do not add any API key or private credential to `public/games/`; every file in that folder is public client-side code.
