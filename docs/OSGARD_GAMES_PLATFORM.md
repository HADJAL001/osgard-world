# OSGARD WORLD GAMING — Audit, Product Scope and Release Plan

Date: 2026-10-13  
Implementation branch: `feat/osgard-premium-games-platform`  
Repository: `HADJAL001/osgard-world`

## 1. Executive summary

The repository is an existing React + TypeScript + Vite portal, not a blank site. It already contains five game entries, a game manifest, several game runtimes, a first-party event queue, a Godot project for NULL//SHIFT, Nginx routing and a manual staged-deployment process. The implementation therefore extends the existing architecture; it does not duplicate the portal or migrate unrelated games to one engine.

The work in this branch adds an OSGARD PLAY discovery and commercial surface at `/games`, a custom SVG compass-style brand mark, project/legal routes, responsive styles and a smoke test. It keeps the existing game IDs and hrefs in `src/core/manifest.ts` as the catalogue source of truth.

**Not done:** this branch has not been merged, deployed to production or verified against the running production server. Payment processing, subscriptions, ad-network delivery and rewarded ads are not enabled. No real analytics counters or revenue totals are claimed.

## 2. Technical audit

### Existing stack and release architecture

- Frontend: React 19, TypeScript 5.7, Vite 6, Lucide icons and Three.js.
- Entry/routing: `src/main.tsx`; route selection is pathname-based rather than a dedicated router.
- Catalogue/runtime metadata: `src/core/manifest.ts`.
- Product-event queue: `src/core/eventQueue.ts`; up to 50 recent events are retained in browser storage, queued for retry and synchronized only if the existing player API has a valid auth token.
- Authenticated player endpoints: `src/core/playerApi.ts`.
- Hosting: Nginx and Docker; frontend releases have a staging/checksum/rollback workflow documented in `DEPLOYMENT.md`.
- Build/CI: `npm run check`, `npm run build`, smoke scripts and a production route matrix.

### Existing game catalogue

| Game | Entry point in the existing manifest | Integration decision |
| --- | --- | --- |
| ИМПЕРИЯ ВРЕМЕНИ | `/games/time` | Preserve the current strategy runtime |
| SWARM | `/games/swarm/index.html` | Preserve the standalone browser game and its API/WebSocket contract |
| NULL//SHIFT | `/games/null-shift-godot/index.html` | Preserve the existing Godot Web target as the intended current entry, while keeping the legacy WebGL path separate |
| INHERIT | `/games/inherit/index.html` | Preserve the standalone browser game/PWA |
| REMIX | `/games/remix/index.html` | Preserve the creator/replay runtime |

The public source tree includes `public/games/swarm`, `public/games/null-shift`, `public/games/inherit`, `public/games/remix`, and `godot/null-shift`. During the audit, no checked-in `public/games/null-shift-godot/` export directory was visible in the Git tree listing, although the manifest and the existing test suite expect exported Godot web assets at that path. The build or release process may materialize these assets separately; this must be confirmed from a production build artifact and the desktop/mobile route matrix before deployment. Do not activate a release in which `index.js`, `index.wasm`, or `index.pck` are missing.

### Current telemetry limitation

The portal already has a local event queue and authenticated first-party synchronization. That is not the same thing as a business dashboard or verified revenue ledger. This branch opts the new game hub's non-essential UI events out by default and reuses the existing queue only after consent. The rest of the existing website has its own callers and has not been comprehensively migrated to a site-wide consent manager in this change.

## 3. Brand direction

### Explored directions

1. **Obsidian Compass** — graphite/obsidian base, antique-metal gold, icy blue highlights, a geometric compass/star mark. Reads as an authored system and works at favicon scale.
2. **Arctic Signal** — deep navy, cyan/white signals and technical grid. Strong for sci-fi games, less warm for business and service products.
3. **Aurum Archive** — warm black, brass and editorial serif typography. Premium, but risks feeling like a luxury-services company rather than a game ecosystem.

**Chosen: Obsidian Compass.** The new `public/osgard-mark.svg` is a geometric star/compass built from original SVG shapes. The hub uses CSS-generated game cover graphics and locally available brand typography; it does not hotlink third-party cover art. The favicon is wired in `index.html`.

Core palette:
- Graphite `#070a0e` and raised panels `#0d1219`
- Antique gold `#cdb47d`
- Ice accent `#8eafc9`
- High contrast text `#edf2f8`
- Muted text `#9aa8b9`

The style uses restraint rather than stacking glow on every element: typographic hierarchy, precise borders, controlled gold accents, game-specific color signatures, and reduced-motion support.

## 4. Implemented in this branch

- `src/GamesPlatform.tsx`: a new OSGARD PLAY catalogue using the existing game manifest, with search, genre filters, sort order, favourites, recently opened history, a “continue” card, sharing, game-specific descriptions/controls labels and responsive card artwork.
- `src/games-platform.css`: desktop/tablet/mobile layouts, focus-visible states, reduced-motion support, consent surface, sponsor inquiry and accessible empty states.
- `src/GameDetailPage.tsx`: individual game profiles at `/games/info/:id`.
- `src/GamePlayer.tsx` and `src/game-player.css`: immersive launch shell at `/games/play/:id`, with loading/timeout/error/retry states, fullscreen, a NULL//SHIFT Godot-to-WebGL fallback, consent-gated session start/duration events, and recommendations.
- `src/LegalPages.tsx` and `src/legal.css`: working `/privacy` and `/terms` information pages with an explicit draft/legal-review notice.
- `public/osgard-mark.svg`: original scalable brand mark used as the favicon.
- `src/main.tsx`: new `/games`, `/privacy`, and `/terms` routes and SEO metadata.
- `src/App.tsx`: the home-page all-games gateway now points to `/games`.
- `public/entertainment/index.html`: the legacy static entertainment catalogue remains in place and links to the new hub.
- `nginx.conf`: exact `/games` and `/games/` rules allow the SPA hub to coexist with the static `/games/*` game files.
- `scripts/games-platform-smoke.mjs`: static integration checks.
- `package.json`, `.github/workflows/frontend-check.yml`, `scripts/production-route-matrix.mjs`, `scripts/release-readiness.mjs`: wire the new smoke suite into CI/release checks and add hub/legal routes to the runtime matrix.

### Games page behaviour

- Uses the real five-item manifest; no fictional reviews, user counts, ratings, or performance metrics.
- Favourites and recent history are stored in local browser storage and sanitized when loaded; no account or cross-device sync is claimed.
- Sharing uses the browser share API where available, with clipboard/prompt fallback.
- Ten project cards use external destinations with campaign/source/content UTM parameters. These are attribution links, not a guarantee that the destination accepts or reports those parameters.
- The project inquiry validates basic form fields and opens the user's own mail client with a draft. It does not silently post form contents to a server.
- The optional product analytics choice starts unset; in this new page the existing event queue is called only after opting in. Local favourites/history remain available when analytics is disabled.
- The sponsor panel invites a discussion and explicitly notes that no ad network is connected.

### Legal scope

The new privacy and terms routes are draft product disclosures. They intentionally say that advertising/payment integration is not connected and that counsel needs to review the material against actual deployments and jurisdictions. These pages are not a legal certification, and the site does not become fully compliant merely because the routes exist.

## 5. Project network — factual copy and open questions

The hub includes all ten destinations supplied by the owner:

| Project | Destination used in this branch | Copy scope |
| --- | --- | --- |
| OSGARD development | `https://osgardbewworld.com` | Digital product development |
| O2 SYSTEM | `https://o2system.art` | Digital accounting/business operations |
| SENJOR | `https://senjorio.com` | Personal mobility/ride service |
| SUPER DAY | `https://superday.run` | Day planning and productivity |
| MARCOSA | `https://marcosa.club` | Social/community space |
| OSA / MYOSA | `https://myosa.world` | AI product direction |
| GG EMPIRE | `https://gold-glamour.online` | Premium services |
| GARD VPN | `https://gardvpn.is` | VPN/secure connection service |
| OSGARD OS | `https://osgardos.com` | Business/product development |
| VANGUARD STUDIO | `https://osgardvanguard.studio` | Video and creative services |

The live website copy and availability of the destinations must be checked again before advertising them in a campaign. A browser inspection showed SUPER DAY has product detail and an onboarding/waitlist flow. MARCOSA explicitly showed a local workspace preview and stated that payments/ad billing are disabled; the card does not claim otherwise. Some domains only returned a title or limited content in the inspection environment, which is insufficient to substantiate more detailed product claims.

**Domain mismatch to confirm:** the owner's requested development domain is `osgardbewworld.com`, while the existing `src/App.tsx` world catalogue points to `osgardnewworld.com`. This branch follows the URL from the new request in the Games cross-promotion card but does not silently change the pre-existing world card. Confirm which domain is canonical before the next cross-site rollout.

## 6. Monetization plan — what is and isn't live

| Model | Current status | Required before a live launch |
| --- | --- | --- |
| Display ads in catalogue/game shells | Not connected | Publisher account/approval, placement review, consent/CMP requirements, viewability/fraud monitoring and a non-overlapping layout |
| Rewarded ads | Not connected | Game-by-game design review and a server-verified completion callback; idempotent reward ledger and replay/fraud protection |
| Premium game access | Not connected | Real entitlement service, pricing/legal terms, access checks on protected server content |
| In-game purchases | Not connected | Payment processor, server-side verification/webhooks, order/refund state and idempotency; do not trust browser-only purchase flags |
| OSGARD PREMIUM subscription | Not connected | Validate demand first; recurring billing, cancellation, entitlement/expiry handling, customer support and tax/legal review |
| Sponsor placements | Inquiry surface only | Signed scope, clear “реклама/партнёрский материал” label, campaign dates, caps and actual reporting |
| Cross-promotion | Implemented as UTM links | Verify destination routing and use first-party conversion logs or destination reports |

Prioritization recommendation: make games reliably discoverable and playable, instrument consented first-party events, then test measured cross-promotion and qualified development leads. Add display ads only after confirming traffic, game-session length and viewability. Add purchases/subscription only after players demonstrate repeat use and a clear value proposition. Do not place advertisements over the game controls, in the middle of a critical interaction, or in a way that can trigger accidental clicks.

The current repository has an event queue and player APIs, but the branch does not add a revenue dashboard or server revenue ledger. A trustworthy revenue panel should aggregate verified server events from ad callbacks and payment webhooks—not infer income from client clicks.

## 7. Financial scenarios (illustrative assumptions, not forecasts)

There is no verified traffic, eCPM, ad-fill, payer-conversion or lead-close dataset in this change. The numbers below are only a scenario model to expose the economics and decide what to measure. They are not actual data, a market-rate assertion, or guaranteed revenue. Values are monthly and in RUB.

### Formulae

- Game starters = visits × game-start rate.
- Game sessions = starters × sessions per starter.
- Paid impressions = sessions × slots per session × ad-fill rate.
- Ad revenue = paid impressions × assumed eCPM ÷ 1,000.
- Purchase revenue = starters × purchase conversion × average purchase.
- Leads = visits × lead conversion.
- Expected development-project value = leads × lead-close rate × average project value.
- Combined expected result = ad revenue + purchase revenue + expected development-project value − operating expenses.

| Input/output per month | Conservative | Base | Optimistic |
| --- | ---: | ---: | ---: |
| Visits | 20,000 | 100,000 | 500,000 |
| Game-start rate | 15% | 25% | 35% |
| Game starters | 3,000 | 25,000 | 175,000 |
| Sessions per starter | 3 | 4 | 5.5 |
| Sessions | 9,000 | 100,000 | 962,500 |
| Ad slots / session | 2 | 3 | 3.5 |
| Ad fill assumption | 45% | 65% | 80% |
| Paid impressions | 8,100 | 195,000 | 2,695,000 |
| Assumed eCPM per 1,000 paid impressions | ₽70 | ₽130 | ₽220 |
| Illustrative ad revenue | ₽567 | ₽25,350 | ₽592,900 |
| Buyers as share of starters | 0.2% | 0.5% | 1.0% |
| Assumed average purchase | ₽199 | ₽249 | ₽349 |
| Illustrative purchase revenue | ₽1,194 | ₽31,125 | ₽610,750 |
| **Gaming revenue (ads + purchases)** | **₽1,761** | **₽56,475** | **₽1,203,650** |
| Lead rate per visit | 0.03% | 0.05% | 0.08% |
| Leads | 6 | 50 | 400 |
| Lead-to-project close rate | 3% | 5% | 8% |
| Average project value | ₽80,000 | ₽120,000 | ₽180,000 |
| Expected development pipeline value¹ | ₽14,400 | ₽300,000 | ₽5,760,000 |
| Operating-cost assumption | ₽35,000 | ₽120,000 | ₽900,000 |
| **Gaming-only operating result** | **−₽33,239** | **−₽63,525** | **+₽303,650** |
| **Combined expected result incl. service pipeline²** | **−₽18,839** | **+₽236,475** | **+₽6,063,650** |

¹ Expected pipeline value = lead count × close probability × average project value. Because close rates produce fractional expected projects, this is a statistical expectation across comparable periods, not a promise of a fraction of a real contract.  
² Combined result counts the expected service-project value as if recognized in the same month; real delivery, collection, tax and labour costs may occur later, and the figures must not be confused with gaming revenue or cash profit. Operating costs are coarse assumptions that should be replaced with actual hosting, development/support, acquisition, fees and taxes. This model is pre-tax and excludes VAT/tax treatment, refunds, ad-network fees beyond the assumed eCPM, payment fees, chargebacks, revenue-share contracts and working capital.

### Sensitivity and first measurements

- At constant rates, doubling traffic doubles the modelled ads, purchase and lead volume; it does not establish that conversion remains constant at scale.
- Ad income is directly proportional to eCPM and fill. If traffic and fill both fall to half the base assumption, ad income falls to one quarter, all else equal.
- The base gaming-only model is negative: subscriptions or sponsorship should not be assumed as a solution until observed return rate and willingness to pay are measured.
- First measure real sessions, session duration, return visits, game errors, external-project click-throughs and qualified submitted leads. Only then replace these assumptions.

## 8. Privacy, safety and integrity

- No client-side payment secret, ad-network secret, signing key or privileged API token is added.
- The form uses `mailto:`; there is no server-side lead storage, spam protection or lead dashboard in this branch.
- The optional analytics gate applies to event calls initiated by this new Games page. Existing pages elsewhere in the portal may send events via other paths; a future task should inventory each call site and implement a consistent site-wide consent policy before adding ad pixels or third-party analytics.
- LocalStorage preferences are not a secure account store and are not synced between devices.
- No ad impression/click is simulated. The sponsor panel is a labeled inquiry opportunity, not a paid ad.
- Privacy and terms pages are explicitly marked as project drafts for legal review.

## 9. Test and release plan

The new `scripts/games-platform-smoke.mjs` checks repository wiring, all five manifest games, routes, favicon, Nginx route priority, responsive/accessibility styling markers, consent gating, local state sanitation, UTM project URLs and disclosure of non-live advertising/payment status. It is registered as `npm run qa:games`, added to the frontend workflow, and added to the release-readiness gate. The production route matrix now includes `/games`, `/games/`, `/privacy` and `/terms`.

### Run locally

```sh
npm ci
npm run check
npm run qa:games
npm run build
npm run preflight:frontend
npm run qa:release
```

For a preview:

```sh
npm run dev
```

### Pre-production checklist

1. Review the branch diff and allow the pull-request CI to complete.
2. Check the Godot web export artifacts noted in the technical audit.
3. Build using the existing deployment process, including the SWARM source in the expected sibling directory.
4. Stage the archive; compare file list, byte count and SHA-256 to `release-manifest.json`.
5. Set `OSGARD_BASE_URL` for the production route matrix against staging; require desktop and mobile route checks to pass.
6. Confirm TLS, route behavior, the three new routes, all five game entry points, and the ten outgoing links.
7. Activate only using the existing guarded deployment process with rollback retained. Do not delete the previous serving directory first.
8. Record remote server/container and route-matrix evidence in `docs/OSGARD_EXECUTION_LOG.md`.

The manual GitHub deploy workflow remains the controlled production path. It requires `OSGARD_DEPLOY_HOST`, `OSGARD_DEPLOY_USER` and a dedicated least-privilege `OSGARD_DEPLOY_KEY`. The branch work itself does not deploy or change public production traffic.
