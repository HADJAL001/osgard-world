# CIVIC CASCADE 1.6.0 — OSGARD PLAY integration

**Route:** `/games/civic-cascade/`  
**Release:** 1.6.0 / ATMOSPHERIC SYSTEM

## Integrated
- Replaced the previous single-file playable page with the modular 1.6.0 browser release.
- Included the city-crisis simulation, tactical zoom/pan and touch camera, adaptive visual quality, reduced-motion support, Strategy Lab, runtime diagnostics and local operation reports.
- Updated the same-origin PWA manifest and offline shell. The cache now contains all code modules and the OSGARD lifecycle bridge under `/games/civic-cascade/`.
- Added a same-origin OSGARD lifecycle bridge for real ready/running/paused/resumed/completed/error transitions so the existing game window can track an actual session.
- Updated the catalog release badge/search terms and the XML sitemap.

## Validation
- The shipped fallback package `npm run check`: **97/97 tests passed** on 14 October 2026.
- Site smoke coverage now syntax-checks every shipped JS module and verifies the PWA/offline shell and lifecycle protocol.
- Native Godot project v0.10.0 remains separate; native import/render and physical-device FPS are not claimed as verified here.
- The previous playable page is preserved at `docs/releases/CIVIC_CASCADE_PRE_1.6.0_INDEX.html`.

## Rollback
Restore `docs/releases/CIVIC_CASCADE_PRE_1.6.0_INDEX.html` to `public/games/civic-cascade/index.html`, then redeploy with the normal frontend workflow.
