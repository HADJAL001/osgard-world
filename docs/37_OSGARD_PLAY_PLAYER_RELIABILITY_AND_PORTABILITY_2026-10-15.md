# OSGARD PLAY — Seven Improvements Pack (2026-10-15)

## Scope and audit basis

Repository: HADJAL001/osgard-world, branch feat/osgard-play-seven-upgrades-20261015, based on master.

This is a focused continuation of the existing OSGARD PLAY platform, not a replacement portal. The source already includes React 19 + Vite + TypeScript, eleven registered games, a static HTML/JavaScript catalogue, React game-detail pages, search/genre filters, favorites/recent history, a modal iframe player, a 35-second player-lifecycle watchdog, opt-in analytics, owned-project directory, sponsor-management surfaces, consent controls, and a separate Node/PostgreSQL/Stripe Commerce API. Payment and ad vendor activation remain operator-gated.

## Seven changes

1. **Early slow-start warning.** Adds a separate live status hint after 15 seconds without a recognized ready/error state. It complements the existing 35-second lifecycle watchdog and does not replace its status text.
2. **Local player diagnostic report.** The player gains a “Скачать диагностику” control. The JSON report uses an allow-listed game ID, a coarse browser family/major, coarse viewport class, capability booleans, status enums and durations rounded to 500 ms. It caps observations at 20. It omits full URLs, query strings, referrer, full user-agent, typed text and authentication data.
3. **Favorites/history backup export.** A user-initiated JSON download stores only the favorite and recently opened game IDs.
4. **Validated restore.** Import requires schema osgard.player-preferences version 1, an allow-listed game set, no more than 11 entries per list, a file below 100 KB and explicit confirmation before replacing local keys. Invalid IDs or malformed JSON are rejected. No upload occurs.
5. **Keyboard and assistive-technology support.** Both new controls have names, visible focus styles, concise status messages, and mobile wrapping. The reliability hint uses role=status and aria-live=polite.
6. **Regression contracts.** Deterministic Node smoke tests cover report privacy and schema, coarse data, timeout relationship, favorite/history schema, unknown IDs, file size and confirmation behavior.
7. **Release and route integration.** New assets are loaded by the existing Games hub, included in the production route matrix and wired into the existing QA command. No second catalog or analytics pipeline is created.

## Privacy boundary

The report is generated and downloaded only after an explicit user action. The diagnostic helper contains no fetch, XHR or sendBeacon call. The preferences archive is kept on-device and does not contain user ID, game saves, contacts, purchases or entitlements. Analytics behavior remains governed by the current opt-in consent queue. These checks are source-level and deterministic; they do not constitute a legal compliance certification.

## Verification

Run from the repository root:

    node scripts/player-reliability-smoke.mjs
    node scripts/player-preferences-backup-smoke.mjs
    npm run qa:player-tools
    npm run check
    npm run build
    npm run qa:release
    npm run qa:production-routes

The dedicated smoke scripts run without launching Chromium. The full release gate and desktop/mobile production route matrix should pass on the CI/deploy runner before merging or publishing.

## Deployment boundary

These source changes are prepared on a feature branch. They do not change the live osgard.world release until a reviewed PR is merged and the existing frontend deployment workflow succeeds. Production checkout, Premium entitlements and advertising SDKs remain disabled until the operator supplies and validates the required external accounts, secrets, database readiness, provider/domain approval, terms and consent configuration.

## Suggested operator checks

- Verify JSON export and restore manually in desktop Chrome/Edge and mobile Safari/Chrome.
- Verify the 15-second message appears without preventing the lifecycle ready signal from clearing it, and that the original 35-second timeout is still active.
- Run the route matrix after deployment and confirm both new JavaScript assets return HTTP 200.
- Keep live payments and ad integrations disabled until their existing commercial readiness gates pass.
