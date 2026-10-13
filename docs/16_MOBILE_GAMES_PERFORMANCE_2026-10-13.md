# OSGARD PLAY — mobile startup optimization

**Date:** 13 October 2026  
**Baseline:** deployed Games build 370e27893c25 measured by the existing post-deploy Lighthouse workflow.

## Measured baseline

| Lighthouse category / metric | Mobile | Desktop | Gate |
|---|---:|---:|---:|
| Performance | 78/100 | 100/100 | Mobile ≥85; desktop ≥90 |
| Accessibility | 96/100 | 100/100 | ≥90 |
| Best Practices | 96/100 | 96/100 | ≥90 |
| SEO | 100/100 | 100/100 | ≥90 |
| Total Blocking Time | 932 ms | 0 ms | Mobile ≤500 ms; desktop ≤300 ms |
| Largest Contentful Paint | 1.73 s | 0.36 s | Mobile ≤4 s; desktop ≤3 s |

The desktop result is already strong. The main release issue is mobile main-thread work and style/layout, not the initial largest-contentful element.

## Change in this branch

- Stop requesting player-lifecycle.js, game-session-recommendations.js, and recommendation-only CSS in the initial HTML load.
- Load the gameplay lifecycle runtime only on the first actual launch click.
- Queue the clicked game link while the lifecycle script loads, then replay the click once after the runtime has registered. If the script fails, fall back to the existing catalogue launcher instead of leaving the card inert.
- Load the referral/recommendation module and its CSS alongside the first game start, not during the ordinary catalogue view.
- If the URL contains a well-formed existing og_ref invitation code, load the referral module early so the invite ribbon/open measurement can still work. Consent checks remain inside the existing growth module.
- Preserve the existing version marker: dynamic assets use the same deployed build hash as the page.
- Keep luxury.css, luxury.js, the commerce client and all game files as currently configured; this is a focused first pass rather than a broad rewrite.

## Regression gate

The Games portal smoke suite now checks:
- player lifecycle and recommendations aren't eager script or blocking stylesheet requests;
- the lazy loader is syntactically valid and references only same-origin, versioned asset paths;
- the first game click is prevented while the runtime is loading, then replayed exactly once after the player listener registers;
- referral CSS is added only when the growth module is requested;
- a valid invite landing still loads the referral/recommendation module;
- the existing game launch registry, post-run recommendation hooks, analytics-consent rules and share-conversion fix still hold.

## Acceptance criteria

After merging and deploying this branch, the existing Lighthouse job must measure the matching build marker and report mobile Performance ≥85 and TBT ≤500 ms. LCP and desktop scores must remain within their existing guardrails. If the post-deploy result misses those thresholds, use the uploaded Lighthouse JSON and the browser trace to pick the next measured issue; do not loosen guardrails just to make CI green.

No improvement score is claimed in advance. Lazy loading adds a short first-game startup step, so it is important to confirm the whole user flow (including the first launch, invite link, keyboard/mouse and touch behaviour) on real devices.