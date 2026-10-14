# OSGARD performance architecture: route bundles and delivery budgets

Date: 14 October 2026

## What changed

The main Vite entry no longer statically imports every React route. It uses React.lazy and a shared Suspense boundary for MiniApp, game-detail pages, the time simulation, social surfaces, legacy prototypes, and the ecosystem sections. Their route CSS is imported from those route modules, so the 65 KB time stylesheet and other page-only styles are not required to render the OSGARD home route.

The interactive Three.js globe is now a separate dynamic import. The home page paints a lightweight CSS/HTML orbital placeholder first, then requests the globe after a short delay. Users who ask the operating system for reduced motion keep the static illustration and do not initialize WebGL. The MiniApp shares the same deferred globe behavior.

## Performance quality gates

Run from the repository root:

    npm ci
    npm run qa:performance-tests
    npm run build
    npm run qa:performance-budget

The budget command writes `artifacts/osgard-performance-budget.json` and returns a non-zero exit code if:
- total initial JavaScript (entry plus modulepreloads) exceeds 700 KiB;
- any single initial chunk exceeds 450 KiB;
- any Vite application JavaScript chunk exceeds 650 KiB.

These are transfer-size guardrails in bytes, not a claim about a specific Lighthouse score or all-device runtime performance. The check budgets only `dist/assets`: standalone games under `dist/games` have their own loading paths and must be measured with their respective game diagnostics, not misclassified as initial portal JavaScript.

## Evidence and limitations

The JSON report lists every initial JavaScript file, exact byte counts, total JavaScript chunk count, the largest Vite app chunk, and the status of each budget. Frontend CI and release-readiness CI run the source-contract regression tests and enforce the built-artifact budget. A failed threshold blocks the build.

For production profiling, use browser DevTools and Lighthouse on desktop and low-end mobile devices, with cache disabled and a cold navigation. Compare LCP, INP, CLS, main-thread CPU time, and transferred bytes before and after the change. Do not infer a performance percentage from bundle splitting alone.

## Rollback

The changes are isolated to route imports, route stylesheet ownership, the deferred globe and the performance QA scripts. To roll back only the deferral, restore the imports of `LivingGlobe` in `App.tsx` and `MiniApp.tsx`; to roll back route splitting, restore the static page imports in `main.tsx`. Keep the bundle budget tests even if implementation details change.
