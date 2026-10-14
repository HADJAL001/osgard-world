# OSGARD WORLD — Engineering Masterplan and Operations Copilot

**Audit date:** 14 October 2026  
**Repository:** HADJAL001/osgard-world  
**Base branch:** master  
**Status:** source-code audit and implementation plan; not a claim that production deployment or external-domain checks have passed.

## 1. Executive decision

Do not rewrite OSGARD WORLD from zero and do not force all games onto one engine. The repository already contains a React 19 / Vite 6 / TypeScript portal, eleven game entry points with different runtimes, a Node.js + PostgreSQL Commerce API, a consent-aware analytics pipeline, commercial readiness gates, a sponsor campaign manager, game-detail pages, and growth experiments.

The most useful next layer is to connect these capabilities without duplicating them:

1. A single game contract for route, runtime, control scheme, save mode, compatibility and release status.
2. Evidence-based launch gates: configuration alone must not mean that a feature is production-ready.
3. An AI Operations Copilot that summarizes current server-generated readiness statuses, while remaining read-only and unable to approve payment/ad activation.
4. A consent-first measurement loop that separates visits, game starts, completed sessions, leads and verified revenue.
5. A staged commercial plan: prove game launches, return sessions and attributable leads before activating ad networks or subscriptions.

## 2. Current architecture found in the repository

| Area | Evidence in source | Engineering implication |
|---|---|---|
| Portal | Vite 6, React 19, TypeScript; public assets are included in the static build | A second SPA or separate portal is not needed |
| Games | Eleven stable IDs in src/core/manifest.ts, with catalogue, game details, recommendations, favorites/history and player lifecycle | Keep the manifest as source of truth; protect against duplicate catalogue arrays drifting |
| Game runtimes | Time is a React/TypeScript prototype; SWARM is a browser game plus room/match API; INHERIT is HTML/localStorage; REMIX uses Unity/WebGL and a backend; NULL//SHIFT is a Godot Web export; remaining titles are independent web/React experiences | Preserve each game's runtime; do not migrate all games to one engine |
| Commerce API | Node.js 22+, Express 5, PostgreSQL, Stripe SDK, server-side validation, signed webhooks, rate limits and protected admin routes | Payment and admin decisions stay server-side |
| Sponsor campaigns | Server-side campaign manager with required disclosure, HTTPS destination checks, date windows, frequency caps; unintegrated in-game slots are blocked | Prefer existing real campaign inventory; do not invent ad impressions |
| Analytics | Optional consent, event validation, bounded retry queue and retention window | Do not add a second analytics SDK or transmit pre-consent events |
| Premium/payment | A read-only readiness endpoint exists; Premium remains blocked until entitlements are implemented; live payments are disabled by default | Do not weaken launch gates just to present a monetization demo |
| Search/accessibility | SEO metadata, JSON-LD, reduced-motion support and responsive layouts already exist | New surfaces inherit keyboard, reduced-motion and narrow-screen requirements |
| CI/release | Route matrix, static game smoke tests, Godot Web export job, Commerce tests and release-readiness scripts exist | Add contracts and tests to current CI instead of replacing it |

Useful existing documents: docs/09_OSGARD_GAMES_PLATFORM_AUDIT.md, docs/10_OSGARD_ECOSYSTEM_LINK_AUDIT.md, docs/27_OSGARD_REVENUE_ACTIVATION_GATE_2026-10-14.md, docs/28_OSGARD_PLAY_INTERMISSION_SPONSOR_2026-10-14.md, docs/33_OSGARD_PRODUCT_EXPERIMENT_ENGINE_2026-10-14.md and docs/34_OSGARD_GAME_TO_BUSINESS_CONVERSION_2026-10-14.md.

## 3. Engineering risk register

### P0 — trust, security and truthful measurement

- Never return API keys, admin tokens, payment secrets or database URLs to the browser or the AI context.
- Do not infer that an empty data table means zero audience or zero revenue.
- Do not activate payments, subscriptions, advertisements or in-game rewards through a single client-side flag without end-to-end release checks.
- A configured URL is not proof that an external project is available, safe or accurately described.
- HTTP 200 for a game page is not proof that the game engine, multiplayer API, save flow or checkout actually works.

### P1 — architecture consolidation

- Compare the game tiles in src/EntertainmentCatalog.tsx with OSGARD_GAMES in src/core/manifest.ts; consume the manifest directly where feasible or keep a parity test.
- Standardize runtime contracts such as web_static, react_route, godot_web, unity_webgl and api_dependent.
- Distinguish page opened, game runtime loaded, session started, session completed and result verified.
- Give every runtime a launch contract: route, supported input, save persistence, fullscreen capability, offline behaviour, version pin, health dependency and rollback path.
- Keep sensitive admin data behind the authenticated server API. The existing Commerce Admin holds its bearer token only in page memory.

### P2 — growth on evidence

- Prioritize replayable daily challenges, quick first-session onboarding, sharing and contextually relevant game-to-game recommendations.
- Measure catalogue view → game start → completed session → return → cross-promo click → lead submitted.
- Do not declare A/B wins below a pre-agreed sample-size and measurement horizon.
- Treat owned products as first-party cross-promotion, never as independent third-party sponsors.

## 4. OpenAI Operations Copilot: first implementation

The change introduces a human-invoked, read-only POST endpoint at /v1/admin/ai-ops/review and a panel inside the existing Commerce Admin.

### Data contract

The OpenAI request contains only:
- overall commercial-readiness status;
- aggregate counts by status;
- allow-listed check IDs, labels and statuses.

The request excludes:
- leads, buyer emails, orders, transactions and payment records;
- raw analytics rows or raw logs;
- bearer/admin tokens, API secrets, Stripe values and database URLs;
- arbitrary browser-supplied context and external URLs.

### Guardrails

- OPENAI_API_KEY is held only in private Commerce API service variables.
- The implementation calls the OpenAI Responses API with Structured Outputs JSON Schema. A malformed answer or invented evidence reference is rejected.
- The request is store=false, bounded by a timeout and output-token ceiling; server-side rate limiting and the existing admin bearer-authentication remain in force.
- There are no model tools and no ability to call deploy, change configuration, create a campaign, enable Premium or issue a payment.
- Error responses use a small stable error vocabulary and do not expose upstream response bodies.
- Without an API key the standard deterministic readiness report remains available, and the AI panel reports that the optional service is not configured.
- AI output is advisory only. Server readiness and CI remain authoritative; a human still decides whether a release can proceed.

### Why it is useful

The Copilot is not a generic chatbot connected to the whole business. It compresses actual readiness gates into prioritized work items with owners, effort, risk, success criteria and source check IDs. That shortens manual triage without removing the engineer/operator from the release process.

## 5. Wider OpenAI roadmap

1. **Operations Copilot (now):** redacted readiness statuses → prioritized review.
2. **CI triage:** send only sanitized test names/statuses and short redacted error excerpts; group root causes and link to CI jobs. Never merge or deploy automatically.
3. **Game-economy research:** analyze only aggregate, consented funnel/retention tables; label output as hypothesis rather than causal truth.
4. **Content and localization:** draft tutorial text, game descriptions and SEO alternatives for human review; never create fictional reviews, user counts or case studies.
5. **Sandboxed game QA agent:** run predefined smoke scenarios, create evidence reports and propose a branch diff. Production still requires code review and green CI.

A future usage ledger should record request category, model, provider token usage if returned, duration and outcome. A model budget, cost attribution and alerting are not implemented by this first change and should be added before regular or automated use.

## 6. Target architecture

    Public portal (React/Vite)
      ├── Manifest-driven games catalogue and launch contracts
      ├── Consent control → bounded event queue → Commerce API
      ├── First-party project directory with UTM attribution
      └── Game-to-business CTA → Project Intake / Partner Studio

    Commerce API (Node 22 / Express)
      ├── Read-only commercial readiness gate
      ├── Leads, orders and campaign manager
      ├── Stripe signed webhook + idempotent order state
      ├── Consent-validated event ingestion and retention
      └── Admin-only OpenAI Operations Copilot (redacted statuses only)

    CI / GitHub Actions
      ├── TypeScript and portal smoke checks
      ├── Per-game route, lifecycle and runtime checks
      ├── Commerce API unit/security tests
      ├── Production build and route matrix
      └── Human review → merge → controlled deploy

## 7. Monetization sequence

1. First-party cross-promo and development leads, with consented attribution.
2. Clearly labelled sponsor slots outside gameplay, only after the sponsor, destination, legal terms and inventory are verified.
3. One-time payment for a product with demonstrated value after test checkout, webhook and refund paths pass.
4. Subscription only after entitlement lifecycle (grant, renewal, cancel, revoke, refund) and published terms are complete.
5. Rewarded ads only after an approved provider, server-to-server reward confirmation, idempotency and balance review.

A revenue number is factual only when backed by a verified payment or actual ad-provider reporting. The existing docs/09_OSGARD_GAMES_PLATFORM_AUDIT.md and docs/GAMES_MONETIZATION_MODEL.md already include formulas and illustrative scenarios. Keep those assumptions separate from measured production values.

## 8. Roadmap: 30 / 60 / 90 days

### Days 1–30: reliability and first trustworthy measurement

- Assign a release owner and a single P0 blocker list.
- Consolidate game discovery around the source manifest and protect route parity with tests.
- Run a desktop/mobile checklist for all eleven games: launch, controls, save, return/pause, fullscreen, API dependency and fallback.
- Confirm current CI and production route matrix; distinguish code merged from code actually deployed.
- Configure the Ops Copilot only after setting a server-only OpenAI key and a spending/usage review process.
- Verify consented analytics with aggregate reports and sample-size gates.
- Do not activate live ads/payments as part of the Copilot release.

### Days 31–60: one commercial experiment

- Choose one or two games based on completed sessions and return activity, not subjective excitement.
- Run one controlled CTA or one labelled sponsor campaign outside the gameplay viewport.
- Verify game/source/campaign attribution from click through to the submitted lead.
- Review lead quality manually and distinguish leads from paid work.
- Complete legal, age, consent, external-domain and provider checks before buying acquisition.

### Days 61–90: scale only what has evidence

- Invest in the best-performing replay loops; stop or simplify features that are not used.
- Update the financial model with real sessions, retention, provider-reported fill/eCPM only if a network is live, actual project conversions and operating costs.
- If payment demand is proven, finish access entitlements, cancellation, refund and webhook QA before live rollout.
- Add AI-assisted CI triage only after its redaction contract is reviewed.
- Rehearse rollback and repeat the desktop/mobile release checklist.

## 9. Proposed quality gates

These are proposed acceptance targets, not measured current performance:

- Every public game route in the manifest has a deterministic route test.
- Zero payment/API secrets in client bundles; CI scanning remains mandatory.
- Zero active sponsor campaigns without disclosure, time window and validated HTTPS destination.
- Zero payment or subscription entitlements granted solely because the client says payment succeeded.
- All optional analytics gated by consent and bounded retention.
- No AI Ops call without an authenticated manual action; no customer/order data in the model context.
- Every launch-critical issue has an owner, evidence ID, acceptance criterion and rollback decision.
- New surfaces work at 320px width and with prefers-reduced-motion enabled.
- Set runtime performance targets only after tests on named devices and release builds; do not claim the target has been achieved until measured.

## 10. External systems and deployment limits

- Repository access does not mean the live website has been updated. Production status is confirmed by successful CI/deploy and a post-deploy HTTP route matrix.
- Ten owner-supplied external URLs need rechecking for domain ownership, HTTPS, final redirects, product content, contacts, terms, privacy and primary user journey before paid referrals. The prior link audit could not independently verify their live content. Automated reputation signals are review triggers, not proof of misconduct.
- External ad accounts, payment provider credentials and contracts are not included in this code change.
- The OpenAI key must be configured as a private server secret, never in public assets or browser-side build variables.
- This branch/PR does not itself publish the site; merge and release workflows still need to pass.

## 11. Operator runbook

1. Add OPENAI_API_KEY to the private Commerce API runtime environment. Do not commit the key.
2. Optionally set OPENAI_OPS_MODEL; default is gpt-5-mini.
3. Open /games/commerce-admin/, enter the existing ADMIN_API_TOKEN and load the report.
4. Click “Сформировать инженерный план”. Verify the cited check IDs and review OpenAI usage/cost in the provider dashboard.
5. If OPENAI_API_KEY is missing, readiness still works; the AI panel explains that its optional backend is unconfigured.
6. Run Commerce tests, syntax checks and the static integration smoke; wait for GitHub Actions; review before merge. Never enable live payments or ads because of an AI answer alone.

## 12. Files in this engineering layer

- services/osgard-commerce-api/src/ai-ops.mjs — read-only Responses API helper, minimal/redacted context and answer validation.
- services/osgard-commerce-api/test/ai-ops.test.mjs — mocked-network tests; no real key or provider call.
- services/osgard-commerce-api/src/server.mjs — shared current-readiness function and authenticated, rate-limited AI route.
- services/osgard-commerce-api/.env.example — optional server-only model configuration.
- services/osgard-commerce-api/package.json — syntax check for the new server module.
- public/games/commerce-admin/index.html — AI review panel, using the existing in-memory token and text-only rendering.
- scripts/commerce-rollout-smoke.mjs — checks the API/UI/config integration contract.
- .github/workflows/deploy-frontend.yml — triggers the existing controlled release workflow for these files.
