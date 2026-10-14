# SWARM production asset contract and loading quality

Date: 14 October 2026  
Repository: `HADJAL001/osgard-world`  
Branch: `fix/commerce-readiness-decouple-payments-20261014`

## Finding

The production route matrix had explicit shell validation for SWARM, but SWARM CSS and JavaScript did not have asset-specific validators. Both fell through to unrelated generic checks: the CSS fallback expected SkillCred design tokens/fonts and the JavaScript fallback expected generic portal markers. On the 14 October deployment, four desktop/mobile route checks therefore failed for `/games/swarm/` and `/games/swarm/index.html`, even though their assets returned HTTP 200 with the correct CSS and JavaScript MIME types.

This was a contract-selection defect in the diagnostic. The smoke report did not by itself prove whether all production bytes matched the current source; the post-deploy matrix must still run against the published release.

## Change

- Add distinct SWARM CSS and game-entry validators before generic fallback validators.
- Normalize whitespace for stable checks of minified or reformatted assets.
- Pin the stylesheet contract to the actual SWARM visual tokens, arena/playtest surface, and first-party font paths.
- Pin the game script contract to its role-based control system, room session restoration and invite-attribution path.
- Add a fast static contract smoke test so the wrong fallback cannot silently return.

## SWARM loading and accessibility improvement

- Replace the blocking third-party Google Fonts CSS import with the existing same-origin Inter Variable and JetBrains Mono WOFF2 files.
- Use `font-display: swap` to avoid invisible text while fonts load.
- Add a `prefers-reduced-motion` stylesheet rule for non-essential interface animation and scrolling.
- No ad SDK, third-party analytics or additional trackers were added.

## Validation

Run from the repository root:

```sh
node --check scripts/production-route-matrix.mjs
node scripts/production-route-matrix-contract-smoke.mjs
npm run qa:production-routes
```

The first two commands validate the source contract locally in CI. The final command performs a real route check against `OSGARD_BASE_URL` (default `https://osgard.world`) and is the required post-deploy proof. HTTP 200 alone is not enough; HTML signatures and relevant assets must match their game-specific contract.

## Remaining release gate

This change is not a claim that the live deployment is already clean. Merge only with green CI. After deployment, preserve the route-matrix report and check all 218 routes on desktop and mobile. If SWARM still fails after the contract correction, inspect the actual served HTML/CSS/JS and any outer reverse-proxy routing rather than weakening the content checks.
