# OSGARD Games mobile Lighthouse follow-up — 15 October 2026

## Evidence that triggered this change

The latest production Lighthouse workflow for `https://osgard.world/games/` measured mobile Performance at 82/100 (below the 85 guardrail) with Total Blocking Time of 660 ms (guardrail 500 ms). Desktop scored 100/100 across measured categories. The mobile DOM-size audit found 841 elements. The target-size audit flagged the CIVIC CASCADE play/detail links because the nearest card-art link overlapped their safe-spacing region. The label-content-name-mismatch audit flagged the catalogue share button and dynamically-created accessibility button.

Source evidence: workflow `OSGARD Games Lighthouse Audit`, run 38650544359, commit `c526443b4e8221d7e6a2384144a1ccab7b8f946b`. Raw JSON report artifact was preserved by GitHub Actions.

## Changes in this PR branch

- Kept the featured NULL//SHIFT vector inline to protect first-screen rendering.
- Externalized the ten below-the-fold card SVGs to `public/games/card-art/*.svg`, each with explicit SVG namespace and viewBox.
- Replaced nested inline artwork in those cards with decorative `img` elements using `loading=lazy`, `decoding=async`, and versioned same-origin URLs.
- Extended catalogue CSS and unique PATINA/CASCADE LAB visual filters to cover the external images.
- Increased horizontal/vertical spacing of mobile card actions to 32/28 px while preserving 44 px targets.
- Made the visible share-button label and accessible name match.
- Removed the misleading custom `aria-label` from the accessibility button, letting its visible text “Доступность” define the name.
- Added `scripts/games-mobile-lighthouse-fixes-smoke.mjs` and wired it into `qa:games-portal`.
- Added all ten SVG endpoints to `scripts/production-route-matrix.mjs`, validating MIME type and SVG payload at deploy time.

## Verification status

The deterministic smoke test asserts the ten local image assets, standalone SVG safety, lazy loading, hero artwork retention, accessibility-name parity, mobile spacing, and production route coverage.

This patch has not yet been deployed. The next required proof is CI + a production deploy + fresh mobile/desktop Lighthouse reports. A code-level regression test is not a substitute for re-measuring the actual deployed page. Paid advertising, payments and subscription activation are not changed by this patch.
