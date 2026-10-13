# OSGARD PLAY — visible touch targets on game cards

Date: 13 October 2026

## Measured finding

The latest available post-deploy Lighthouse artifact for `https://osgard.world/games/` (run 38352854479, build 36247837d0a510e99008ba9b9d3f41a3cbb16e14) reported mobile Performance 99/100, Accessibility 96/100, Best Practices 100/100 and SEO 100/100. The failing mobile accessibility audit was `target-size`, naming the visible `Play` and `Details` links in game cards. Desktop Accessibility was 100/100.

## Change

- Catalog action links now have a visible bordered surface, subtle fill, 48px minimum height and larger horizontal padding.
- The primary action uses the OSGARD acid accent; Details retains the restrained neutral style.
- Hover/focus styling remains visually consistent with the catalog's dark premium design.
- The existing portal smoke test now asserts the visible action surface contract and the 48px minimum height. The fixed catalog still uses the current ten-game routes and does not add new render-blocking scripts.

## Release verification

The frontend CI job must pass the portal smoke suite before merge. After deploy, re-run the existing Games Lighthouse Audit and verify:
- Mobile Accessibility improves from the 96/100 baseline, ideally to 100/100.
- `target-size` no longer lists `article.card > div.copy > div.game-actions > a.play-link` or `a.detail-link`.
- Mobile Performance stays at least 95/100, LCP remains below 2.5 seconds, and TBT remains below 100ms in the same Lighthouse profile.
- Keyboard focus, narrow layout, favourites, search/filter and first-game launch remain functional.

The CSS/test change is not itself proof that Lighthouse has improved; the post-deploy measurement is the acceptance check.
