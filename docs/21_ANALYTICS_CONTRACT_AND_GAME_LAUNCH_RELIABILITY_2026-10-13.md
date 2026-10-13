# Analytics contract and game-launch reliability — 2026-10-13

## Audit finding

The OSGARD Games catalog and canonical TypeScript manifest included ten games, including `afterimage-run`. The consented browser event queue and the commerce API each maintain an allowlist of game identifiers. Before this change, both allowlists omitted `afterimage-run`, so its valid consented events were rejected during client normalization or server validation and did not reach aggregate reporting.

A second usability gap existed in the React game detail player: the frame had a `load` readiness retry and an `error` fallback, but a request that never triggered either event could leave the loading overlay visible indefinitely.

## Changes in this patch

- Add `afterimage-run` to browser and API game-ID allowlists.
- Add a server domain regression test and an offline/online queue test for an AFTERIMAGE//RUN completion event.
- Add `scripts/analytics-contract-smoke.mjs` to require equality between browser/API event allowlists, browser/API game identifiers, and the canonical `OsgardGameId` union (except the analytics-only `unknown` identifier).
- Register the analytics contract smoke test in the npm scripts, release-readiness checks, and frontend CI workflow.
- Add a 15-second wall-clock watchdog to the React game iframe. A stuck launch now reaches the existing recovery screen.
- Normalize the explicit analytics consent vocabulary across the React detail page (`granted`/`denied`) and static Games hub (`yes`/`no`). Either page now respects a decision made on the other, including clearing the pending queue after denial.
- Add a real retry button that increments the iframe key, forcing the browser to recreate the embedded game instead of merely hiding the error.

## Validation scope

Static/source and deterministic unit tests are added for CI. This patch is not proof that the live production host has changed, that all ten remote games launch on every browser, or that a database contains traffic. Those claims require a green CI run and post-deploy route/device checks.

## Deployment safety

The change is on a feature branch and does not activate live checkout, advertising, or production deployment. The existing consent requirement, deduplicated event IDs, bounded retry queue, and backend allowlist are preserved.
