# OSGARD PLAY — mobile critical-path performance

Date: 14 October 2026  
Repository: \`HADJAL001/osgard-world\`  
Baseline commit: \`31aed256c3be25ee65c9885a0f91688ddee889aa\`  
Source: GitHub Actions run [OSGARD Games Lighthouse Audit #38550221440](https://github.com/HADJAL001/osgard-world/actions/runs/38550221440), artifact \`osgard-games-lighthouse-reports\`.

## Measured baseline

The exact deployed build was verified before measurement. The recorded Lighthouse results for \`/games/\` were:

| Metric | Mobile | Desktop | Guardrail |
|---|---:|---:|---:|
| Performance | 74/100 | 100/100 | Mobile ≥ 85 |
| Accessibility | 100/100 | 100/100 | ≥ 90 |
| Best Practices | 100/100 | 100/100 | ≥ 90 |
| SEO | 100/100 | 100/100 | ≥ 90 |
| Total Blocking Time | 1,562 ms | 0 ms | Mobile ≤ 500 ms |
| Largest Contentful Paint | 1.51 s | 0.41 s | Mobile ≤ 4.0 s |

This is one controlled Lighthouse sample, not a claim about every device or current ongoing traffic.

The mobile trace shows several avoidable startup costs: \`pwa-install.js\` was associated with long tasks of 283 ms and 153 ms; \`experiment-runtime.js\` with a 191 ms task; and the document with multiple long tasks. The trace also lists \`sponsored-campaigns.css\` among render-blocking resources. Some long tasks are attributed to the browser as “Unattributable”; this change does not assume they are all caused by one file.

## Change in this branch

- Move PWA installer and optional product-experiment code behind a tiny versioned scheduler.
- Wait until after the initial load window (4.2 seconds after \`load\`) and prefer \`requestIdleCallback\` before starting non-critical modules.
- Load the PWA installer immediately only if the user explicitly asks to install; show a clear intermediate status if it must be fetched.
- Capture \`beforeinstallprompt\` in the small early scheduler so an existing PWA installation prompt is not lost while the richer install UI is deferred.
- Load the A/B experiment only when analytics consent is present. Warm it on interaction with the hero CTA and after consent is enabled.
- Change the below-the-fold sponsored stylesheet to non-blocking preload with a \`noscript\` stylesheet fallback.
- Keep the actual PWA scripts in the scoped service-worker allowlist/precache and add test coverage for the lazy-loader contract.

## What is not yet claimed

The target remains Performance ≥ 85 and TBT ≤ 500 ms on mobile. The change must pass CI, be reviewed, and be deployed before Lighthouse can determine whether it clears the guardrail. No production release, revenue lift, or live ad integration is claimed by this pull request.

## Validation

\`\`\`sh
npm run qa:pwa
npm run qa:games-portal
npm run qa:games-assets
npm run check
npm run build
\`\`\`

The new smoke test checks delayed execution and the consent boundary without network access. Production verification must rerun the existing Lighthouse workflow on the exact deployed commit and inspect the raw report; it must not weaken the guardrail simply to make CI green.
