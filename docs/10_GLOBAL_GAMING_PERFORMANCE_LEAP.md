# OSGARD WORLD — Global Games Launch & Performance Leap

**Status:** implementation branch, not yet published  
**Date:** 2026-10-14  
**Repository:** `HADJAL001/osgard-world`  
**Branch:** `feat/global-gaming-performance-leap`

## Audit findings

The repository already uses Vite 6, React 19 and TypeScript, with a static Games hub at `/games/`, eleven game entry points, local favourites/recent-play state, a separate owner-listed ecosystem directory, partner pages and consent-aware analytics infrastructure. It has a substantial route matrix and game-specific smoke tests. Replacing it with a new portal would duplicate working systems.

The main performance opportunities were architectural: `src/main.tsx` eagerly imported most route components, the root page imported the Three.js globe immediately, and many route stylesheets were loaded by the global entry even on unrelated pages.

## Implemented in this branch

### Performance
- Route components use React lazy imports and are split into on-demand chunks.
- An accessible loading shell covers route-chunk loading.
- Route-only styles are imported by their owning components so Vite can associate CSS with lazy page chunks.
- The Three.js globe waits until its container is within 100 px of the viewport and then delays its import briefly to give the primary text and actions time to paint.
- The globe container reserves space to reduce layout shift. Reduced-motion and small-screen styles remain.
- The Games static-asset optimizer minifies `/games/en/styles.css` and `/games/en/app.js` when present, while remaining compatible with existing fixtures where these optional assets are absent.

**Expected effect, not yet a measured result:** less route code and route-only CSS must load when a user visits a page; WebGL setup is deferred until the main hero has become relevant. Actual bytes, LCP, INP and layout shift must be measured before publishing numerical performance claims.

### International entry point
- Added `/games/en/` for the eleven existing game destinations.
- Includes search, genre filters, local favourites, recently opened games, sharing, mobile navigation and accessible status messages.
- Uses campaign attribution on game links and all ten owner-listed project links.
- Favourite and recent-game state stays in the browser; no remote tracker was added.
- Every project card describes its intended scope cautiously and sends visitors to the official site for current availability and terms.
- The page explicitly says no live ad network or checkout is represented as active.
- Added reciprocal `hreflang` links and sitemap entry; the Russian hub links to English in desktop and mobile navigation.

## Existing capabilities retained

This change does not replace the established game catalog, game runtimes, local saved state, PWA, sponsor inventory, privacy/terms pages, partner directory, consent-gated analytics, admin surfaces or the React app. No ad network ID, payment provider, third-party analytics script, secret or test revenue has been added.

## Validation added

- `npm run qa:global-performance` checks lazy routes, deferred Three.js, route-owned CSS, the English catalog, ten attributed project links, localization SEO, local state and mobile/accessibility affordances.
- Static asset smoke tests now cover minification and precompressed files for the optional English CSS/JS.
- The production route matrix includes the English page and its CSS/JS assets.
- The portal smoke test now expects lazy route imports instead of the previous eager `Sections` import.

This environment could not clone the repository because outbound GitHub DNS resolution failed. Therefore `npm ci`, TypeScript, the production build, browser QA and the live deployment have **not** been run here. Repository CI is the authority for build validation.

## Global rollout sequence

1. Merge only after CI typecheck, build and Games smoke tests pass.
2. Verify `/games/en/`, its CSS/JS and every game entry point on desktop and mobile.
3. Measure before/after using the same device/network/build: main JS bytes, route chunk bytes, first contentful paint, LCP, INP and layout shift.
4. Add country/language expansions only when translations and support content are maintained. English is a global entry point, not a claim that every game has been localized.
5. Activate advertising only after provider approval and inventory validation. Activate payments only after verified server-side webhooks, refund/chargeback handling and entitlement tests exist.
6. Use the existing consent-gated analytics for funnel measurement before expanding advertising load or building a subscription.
7. Independently confirm service availability, region limits, terms and privacy practices before promoting a project as available in a given country.

## Illustrative monthly unit model — assumptions only

There is no verified Games traffic, eCPM, purchase conversion, signed project lead or platform revenue dataset in this audit. The following figures are sensitivity examples, **not market benchmarks, forecasts or existing income**.

| Input | Conservative | Base | Upside |
|---|---:|---:|---:|
| Catalog visits | 5,000 | 25,000 | 100,000 |
| Game-launch rate | 30% | 35% | 45% |
| Sessions per launcher | 1.5 | 2.0 | 2.5 |
| Ad opportunities per session | 2.0 | 2.0 | 2.5 |
| Assumed fill rate | 50% | 65% | 75% |
| Assumed eCPM | €2 | €4 | €6 |
| Purchase conversion | 0.10% | 0.25% | 0.50% |
| Assumed net purchase value | €4 | €5 | €6 |
| Project lead conversion | 0.15% | 0.30% | 0.50% |
| Lead close rate | 5% | 8% | 10% |
| Contribution per won service project | €300 | €500 | €700 |
| Assumed monthly cost | €150 | €500 | €2,000 |

Formulae:
- Ad impressions = visits × launch rate × sessions per launcher × ad opportunities per session × fill rate.
- Ad revenue = impressions / 1,000 × assumed eCPM.
- Purchase contribution = visits × purchase conversion × assumed net purchase value.
- Service contribution = visits × lead conversion × lead close rate × contribution per won project.
- Illustrative operating result = ad revenue + purchase contribution + service contribution − operating cost.

Under exactly these assumptions, the model gives about **−€13/month conservative**, **€2,903/month base**, and **€37,266/month upside**. The project-contribution inputs are especially speculative and need replacement with actual closed-sale contribution. Currently connected advertising and checkout revenue are **€0 confirmed by this repository audit**; that is not a claim about business income outside the repository.

## Release checklist
- [ ] TypeScript and production build pass in CI.
- [ ] English hub and its dependencies return correct status and content type.
- [ ] Existing game routes still launch.
- [ ] Desktop/mobile route matrix passes.
- [ ] Check that CSS stays attached to its lazy page after chunking.
- [ ] Compare actual compressed build assets to the baseline.
- [ ] Measure LCP, INP and layout shift on representative production devices.
- [ ] Merge to `master` only after review; verify live build marker and `/games/en/` after deployment.
- [ ] Do not treat a merged branch as a published site until the live route has been checked.
