# OSGARD app-shell performance budget

Date: 14 October 2026

## Scope

This gate measures the SPA app shell in the production build: root `index.html` and files under `dist/assets`. Standalone HTML games continue to use their own game-specific smoke and Lighthouse checks; this report does not claim to measure all remote routes or real-device experience.

## Budget policy

Measurements are computed from the actual build files using Node's built-in gzip and Brotli encoders. The report records raw, gzip and Brotli byte counts, largest chunks, a content-based inventory SHA-256, and a stable budget fingerprint.

Hard gates:
- root HTML gzip: at most 16 KiB;
- individual JavaScript: at most 600 KiB raw and 180 KiB gzip;
- all JavaScript combined: at most 380 KiB gzip;
- individual CSS: at most 360 KiB raw;
- all CSS combined: at most 110 KiB gzip;
- app-shell HTML + JavaScript + CSS combined: at most 512 KiB gzip;
- at most 20 JavaScript files and 10 CSS files.

Advisories flag JavaScript chunks above 500 KiB raw and source maps under `dist/assets`. A warning remains visible in release evidence; a hard-budget violation blocks the build. Thresholds are versioned in `scripts/osgard-performance-budget.mjs` and should be changed only with before/after measurements and review—not merely to silence CI.

## Commands

    npm run build
    npm run qa:performance-budget-test
    npm run qa:performance-budget

The command writes `osgard-performance-budget.json` outside `dist`. It rejects symlinks and unsupported filesystem entries in the measured assets. The test suite checks normal builds, raw-size overflow, compressed-size overflow where the offending chunk is not the largest raw file, symlinks, and report-path containment.

## Proof-carrying release

`npm run release:attest` now binds both the contract audit and performance report to the file-by-file build attestation. It records the exact report SHA-256 and the stable budget fingerprint. `npm run release:verify` rejects report tampering after attestation. The AI reviewer receives only a minimized projection of the performance metrics; it does not receive source contents or full raw asset payloads.

## Limits

Compressed byte budgets help control transfer cost and reduce accidental bundle growth, but they are not a substitute for browser performance testing. Actual LCP/INP/CLS, low-end Android behavior, network latency, cache hit rate, and route-specific game startup must continue to be measured with Lighthouse, real devices, and post-deployment checks.
