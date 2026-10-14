# OSGARD WORLD — engineering and commercial execution plan
Date: 2026-10-14
Scope: existing OSGARD World repository, current Games/Entertainment hub and first-party service ecosystem.

## Operating rule
Improve one canonical product in the current React/Vite + static-game architecture. Do not create a parallel Games hub, rewrite every game into one engine or promise a revenue outcome before market evidence. Ship through the existing guarded GitHub Actions → SSH workflow (no Vercel) and verify the deployed SHA, route matrix and post-deploy Lighthouse run.

## Current platform capabilities confirmed in the repository
- Games catalogue and game registry cover eleven experiences: NULL//SHIFT, Empire of Time, SWARM, INHERIT, REMIX, CIVIC CASCADE, PATINA Atelier, SIGNAL RUN, CASCADE LAB, AFTERIMAGE//RUN and AETHER GRID.
- Standalone browser builds coexist with React game/detail pages; `player-lifecycle.js` distinguishes client readiness from a genuine game session and dispatches a completed-session event.
- OSGARD SELECT already provides first-party product promotions, saved service choices/frequency (`each`, `every3`, `off`), contextual spotlight, visible-impression gating, UTM links and a preference editor on Entertainment.
- Commerce API already contains campaign storage and administrative endpoints, after-session public campaigns, consent-gated analytics, referral registration/qualification, SHARDS, checkout and readiness guards. Premium sales and real payments are disabled unless their server contracts/settings are ready.
- Referral flow supports sharing to social destinations, server-validated completed sessions and cosmetic SHARDS. A browser share sheet or copied link is not proof of an actual public post; self-confirmed post rewards are explicitly labelled.
- iOS/TestFlight is already defined by `codemagic.yaml`; the workflow builds local web assets and does not use Vercel.

## New change in this branch
An opt-in OpenAI Game Coach card is added to the existing between-game screen, alongside—not instead of—the owned-service campaigns and reward panel. It asks for a separate one-request consent, checks server availability before posting session data, sends only a fixed minimal summary to the Commerce API, and receives a strict structured response. The key stays in the API process. The feature is disabled by default.

## Reference architecture
```text
Game session ended (existing lifecycle event)
        ↓
Existing intermission
   ├── OSGARD SELECT / owned services
   ├── social invite / SHARDS / qualified referrals
   └── optional AI Coach (separate consent)
            ↓ same-origin Commerce API
       validation + rate limit + feature flag
            ↓ OpenAI Responses API (server key, store=false)
       structured, bounded advice
```

No AI output is allowed to alter scoring, rewards, payment status, access rights or saved gameplay state.

## Monetization ladder — gated by evidence
1. **First-party cross-promotion:** existing owned-service cards, voluntary click-through, clear “advertising / own projects” disclosure and source-specific UTM labels. Measure only consented, visible first-party events; links are not counted as sales.
2. **Sponsor campaigns:** keep the existing campaign admin/API and after-session slot. Require a validated campaign, safe HTTPS target, time window, clear disclosure, frequency cap, visibility-based impression counting and consent for analytics. Do not inject ads over active controls.
3. **Premium game offers / cosmetics:** only where game loop has demonstrated retention. Cosmetics first; do not sell randomness or invent scarcity. SHARDS remain non-cash until there is an actual economy review.
4. **Checkout:** rely on existing Commerce API and verified Stripe webhooks; never accept client-side claims as proof of payment. Premium subscription remains off until account entitlements, cancellation and revocation are complete.
5. **AI Coach:** optional utility differentiator, not an ad. Enable only after API key, spend limits and consent UX are verified.

## Viral loop design
- Daily deterministic challenge or seed → complete a run → generate a game-specific invitation/score card → open a first-party invite route → genuine game session → referral qualification.
- Keep distinct metrics: invite link prepared, consented referral opened, session actually started, session completed, qualified referral and reward claim. Do not treat copy/share-sheet opening as proof of a public post.
- Improve the invite landing preview per game, preserve attribution across navigation and keep referral-code validation/server deduplication in the Commerce API.
- Make every challenge repeatable and shareable with a stable seed, concise result card and “challenge a friend” CTA. Avoid fake leaderboards; public rankings require authenticated, server-validated results and anti-cheat analysis.
- Cross-promo should be user configurable and skippable. Respect the saved schedule and allow one-step “not now”/pause.

## Quality gates before every production push
1. `npm ci`, `npm run check`, `npm run build`.
2. `npm run qa:games-portal`, `npm run qa:games-detail`, `npm run qa:games-model`, `npm run qa:null-shift`, `npm run qa:null-shift-godot`, `npm run qa:ecosystem`, `npm run qa:osgard-select`, `npm run qa:intermission-sponsor`, `npm run qa:game-coach`.
3. Route matrix and accessibility/mobile checks against production/staging.
4. Merge only after CI; master push triggers the existing SSH deployment; require the deployed build marker to equal the master commit SHA.
5. After the deployment workflow succeeds, use the existing Lighthouse workflow to test mobile and desktop. Do not claim deploy success from a merge alone.

## 30-day execution sequence
- **Week 1 — reliability:** finish Game Coach QA, run the full existing suite on CI, validate all eleven detail pages, share links, mobile controls, invite attribution, post-session preferences and deployed routes. Keep AI off until server configuration/spend limits are verified.
- **Week 2 — retention:** evaluate per-game session starts/completions, repeat sessions, daily challenge completion and return visits. Fix the biggest source of drop-off before adding features.
- **Week 3 — monetization:** measure opt-in visible promo impressions → outbound clicks → qualified leads/checkout only where enabled. Activate sponsor inventory only with real campaigns and confirmed rates; keep first-party services labelled as owned projects.
- **Week 4 — controlled experiments:** run one A/B test at a time (e.g. post-game card order, frequency, invitation card treatment). Predefine primary metric, guardrail and sample window; keep a change only if event data supports it.

## Financial model and the $1m aspiration
A million-dollar outcome is a target, not a forecast. Do not base plans on fabricated eCPM, install, retention or purchase conversion values. The first reliable model should use observed visitors, launch rate, completed sessions, referral conversion, sponsor fill/clicks, qualified-lead rate, contract conversion, Stripe-confirmed sales, refunds, API/hosting/support costs and taxes. Keep revenue and forecast fields separate.

## Decisions still requiring a human operator
- Configure `OPENAI_API_KEY` and `OPENAI_GAME_COACH_ENABLED=true` in the Commerce API environment; set OpenAI project spend caps/alerts. These cannot be safely supplied in public Git files.
- Verify the production API environment, database readiness and admin access.
- Confirm legal operator details, ad-market eligibility by geography/age, and App Store listing/privacy nutrition label before paid acquisition or public iOS review.
