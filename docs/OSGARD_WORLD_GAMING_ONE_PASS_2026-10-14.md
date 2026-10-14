# OSGARD WORLD GAMING — one-pass implementation & release audit

**Audit date:** 14 October 2026  
**Repository:** [HADJAL001/osgard-world](https://github.com/HADJAL001/osgard-world)  
**Scope:** source repository and automated contracts. This is not, by itself, proof of a live production deployment or a legal/security certification.

## 1. Audit result

The current repository is a working multi-surface project rather than a blank portal template.

- **Frontend:** React 19, Vite, TypeScript and Three.js are declared in the repository package manifest.
- **Games:** public/games/ serves a standalone game hub as static HTML/JavaScript while the main SPA also provides game discovery and detail routes. The game manifest and catalogue currently describe eleven games: Empire of Time, SWARM, NULL//SHIFT, INHERIT, REMIX, CIVIC CASCADE, PATINA Atelier, SIGNAL RUN, CASCADE LAB, AFTERIMAGE//RUN and AETHER GRID.
- **Player experience:** search, genre filters, favourites/recent history, in-portal player, fullscreen/share actions, individual game details and contextual recommendations are already present in source.
- **Owned-project network:** /games/ecosystem/ lists ten first-party project destinations with categories and UTM-style attribution. VPN is excluded from promotional eligibility while connectivity is unverified.
- **Lead intake:** the development form validates project type, contact and description, records explicit permission to process the submitted request, and does not pretend a request was saved when the backend is unavailable.
- **Privacy and consent:** privacy/terms pages, a consent-gated bounded analytics queue and client/server event allow-lists exist. Opt-in funnel events avoid sending raw search text.
- **Commercial tools:** partner inquiry, campaign administration, consented analytics admin, OSGARD SELECT intermission, premium/storefront routes and a local three-scenario financial model exist in source.
- **Backend:** the separate Node.js/PostgreSQL Commerce API includes a server-side product allow-list, Stripe Checkout/webhook contracts, lead intake and consented analytics. Public config has no secrets and keeps the API base empty for safe same-origin discovery/fallback.
- **Operations:** deployment docs, static release preflight, external-project HTTP checker, production-route matrix, API readiness probes and regression scripts are present.

The one-pass release runner added by this change coordinates the existing checks, writes one machine-readable report and attaches a separate ten-project HTTP report. It avoids simulating ad impressions or payments.

## 2. Brand direction

Use the existing OSGARD gold emblem at the main-brand level and the geometric lime/graphite Games mark as the gaming sub-brand. This preserves the current identity rather than introducing a disconnected portal logo.

Three directions considered:
1. **Compass/star in champagne gold** — strongest for the parent OSGARD network: guidance, craft and a premium service umbrella.
2. **Layered geometric gate in acid lime** — strongest for Games: a recognizable small-size icon and a visual metaphor for entering a game world.
3. **OG monogram** — compact for a profile/avatar, but less distinctive as the primary game mark.

**Selection:** preserve direction 1 for the parent brand and direction 2 for OSGARD PLAY/GAMING. Existing vector assets are public/osgard-mark.svg, public/games/favicon.svg and public/games/osgard-play-icon.svg. Keep the current palette: obsidian #080a0b, panel #101315, warm off-white #f2f0e8, metal #d2c9b4 and gaming lime #d3ff69. Use lime for actions/status, not as body-text fill; keep focus states visible and respect reduced-motion preferences.

## 3. Route and capability map

| Area | Source route / component | Implementation status |
|---|---|---|
| Main games catalogue | /games/, public/games/index.html | Search, filters, favourites/history, player, fullscreen/share, PWA and consent-aware telemetry exist in source |
| Game detail and launch | src/GameDetailPage.tsx, src/core/manifest.ts | Per-game descriptions, controls/device support and recommendations exist; validate route matrix against production before release |
| Owned-project directory | /games/ecosystem/ | Ten first-party cards with tracked links and search/filter behavior |
| Partner inquiries | /games/partners/ | Enquiry flow and sponsor inventory contract; inventory is inactive by default |
| Monetization model | /games/monetization/, docs/GAMES_MONETIZATION_MODEL.md | Adjustable scenario calculator, local-only inputs and JSON export; not live revenue |
| Premium/storefront | /games/premium/, Commerce API | Hosted checkout and server verification are present in source; live payments remain disabled pending operator setup |
| Analytics administration | /games/admin/ and /games/commerce-admin/ | Noindex operator screens; protected API paths exist, with configuration required |
| Privacy/terms | /privacy/, /terms/ | Existing policy and consent surfaces; still require legal review for target markets and actual providers |
| Project intake | /development, src/ProjectIntake.tsx | Validation and safe user-confirmed email/WhatsApp fallback when API is unavailable |
| Operational probes | scripts/production-route-matrix.mjs, scripts/external-project-healthcheck.mjs | Automated checks exist; current production/domain status must be verified from the report generated by a network-enabled run |

## 4. Monetization policy and current boundaries

### Implemented in source
- First-party cross-promotion with source/game/campaign tags, contextual placement and user preferences.
- OSGARD SELECT intermissions are configured to appear after each completed game for fresh users; players can select services, change the frequency or pause promotion. Legacy configuration migrates to the current enabled/every-session/share-reward defaults, while explicit schema-v2 operator choices and individual player preferences are preserved.
- Partner inquiry and sponsor-campaign management source paths, with sponsorship disclosure requirements.
- A browser-local three-scenario financial model and export, plus regression tests.
- Commerce API source contracts for server-defined products, payment-provider state, webhook signatures/idempotency and consented events.
- Client analytics that remain off unless the visitor opts in.

### Deliberately not live by default
- ENABLE_LIVE_PAYMENTS=false
- ENABLE_OSGARD_PREMIUM_SALES=false
- public/games/commerce-config.json contains no secret and currently leaves apiBaseUrl blank for same-origin discovery/safe fallback.
- Sponsor inventory is explicitly inactive and requires a sponsor label.
- No third-party ad network has been approved or connected by this source audit. Do not count impressions, clicks or revenue before real provider-confirmed events exist.
- Social-network posts cannot be independently verified by the standard share links. SHARDS are cosmetic/local points and rely on an explicit player confirmation; a click, copied link or share-sheet opening is not presented as proof of a public post. The separate referral reward requires the server's qualified invite/session checks.
- An HTTP 200 response from an owned domain is not approval for paid promotion. The external audit is only a homepage reachability/metadata check; manual checks of product purpose, privacy, terms, primary actions, business identity and destination behavior remain mandatory. New/low-traffic domains should be reviewed cautiously, without treating automated reputation scores as proof of fraud.

### Required operator input before commercial activation
1. Private Commerce API environment: real DATABASE_URL, random ADMIN_API_TOKEN, provider keys and webhook secret; no credentials belong in public files.
2. Stripe account, live/test Price IDs, webhook endpoint, refund/cancel/entitlement workflow and test transactions. Explicitly enable live flags only after those gates pass.
3. An approved ad provider and publisher account, approved domains, consent and age/geography policy, real test ad units, visible sponsorship labels and provider validation.
4. Operator-controlled production host/SSH credentials for deployment where applicable.
5. Manual validation of all ten owned-project destinations before promoting them in-game or buying traffic.

## 5. Financial model — formulas, not actual revenue

The calculator at /games/monetization/ exposes conservative, base and optimistic scenarios with adjustable assumptions. It does not fetch analytics or post the assumptions to a server.

- Game launches = visits × launch conversion.
- Sessions = launches × sessions per player.
- Eligible ad impressions = sessions × ad slots per session.
- Filled impressions = eligible impressions × fill rate.
- Ad revenue = filled impressions / 1,000 × realized eCPM.
- First-time buyers = new visitors × one-time purchase conversion.
- Purchase revenue = first-time buyers × average net receipt per buyer.
- Leads = visits × lead conversion; expected won projects = leads × close rate; expected development contribution = won projects × average contribution per project (not the full contract value unless costs are excluded intentionally).
- Monthly operating result = ad revenue + net purchase contribution + net sponsorship contribution + expected development contribution − infrastructure, provider, payment fees, refunds/chargebacks, operations and acquisition cost.

Do not treat any eCPM, fill, conversion, sponsor contract or paid customer as a measured value unless it comes from a real report. First collect traffic, consented launches/session lengths, qualified enquiries and actual invoices; then replace hypothetical inputs. Defer a recurring subscription until cancellation/refunds and entitlement grant/revoke are operated end-to-end.

## 6. One-pass verification

From the repository root, with the documented Node.js toolchain and dependencies installed:

    npm ci
    node scripts/osgard-one-pass-release-smoke.mjs
    node scripts/osgard-one-pass-release.mjs

The one-pass runner executes the source preflight, focused game/consent/privacy/economics/partner/project checks, a live HTTP homepage check for the ten owned projects, and the existing full release suite (npm run qa:release). It continues through independent gates to produce a complete report.

Generated, non-committed files:
- artifacts/osgard-one-pass-release.json — pass/block/review results and manual commercial gates.
- artifacts/external-project-health.json — current homepage HTTP/metadata observations from that run.
- release-readiness.json and production-route-matrix.json — output from existing release checks when produced.

A network failure in the external homepage audit is marked **REVIEW**, not interpreted as proof that a product is offline. A failure in source QA, build, archive preflight, dependency audit or required production route/API checks remains a block.

The corresponding GitHub Actions workflow runs the same command on pull requests and manual dispatch, and stores the JSON evidence as workflow artifacts. This is quality evidence, not a production deployment.

## 7. Publish procedure

1. Run the one-pass report and resolve every BLOCK; review REVIEW items with the operator.
2. Check the PR diff and wait for all required GitHub Actions checks.
3. Merge reviewed code to master. The existing frontend deploy workflow only runs for its configured path filters; verify whether the changed files match those filters rather than assuming every merge deploys.
4. Inspect the actual OSGARD frontend deploy workflow result in GitHub Actions.
5. Run the production route/API matrix on the exact deployed revision and inspect errors from desktop and mobile browsers.
6. Test project links and form fallback, then separately validate Stripe test-mode checkout/webhook/entitlement lifecycle.
7. Only after provider/consent/legal approval, enable ad inventory and live-payment flags through private operator configuration.
8. Save the JSON and workflow run URL as release evidence.

This document does not certify legal compliance, current uptime, payment readiness or advertising approval. These require live tests and human review.


## Reliability upgrade: bounded, auditable one-pass execution

The one-pass runner now treats every QA stage as a bounded operation and persists evidence incrementally.

### Seven concrete engineering improvements

1. **Per-stage timeouts.** QA stages default to 15 minutes, the full release readiness stage to 35 minutes, and the external HTTP audit to 60 seconds. The global --timeout-ms override accepts only 1,000–2,700,000 ms. A hung stage becomes an explicit BLOCK or review-only REVIEW, rather than silently keeping the workflow alive.
2. **Fresh evidence only.** The runner removes the old external-health report and release-readiness.json before the run. A stale positive report can no longer make a failed or timed-out HTTP process look successful.
3. **Atomic checkpoints.** The latest report is atomically replaced after each stage. A unique JSON snapshot is also retained at artifacts/runs/<run-id>.json; a cancelled runner leaves the last completed checkpoint available for diagnosis.
4. **Secret-redacted logs.** The report captures bounded tails of process output, redacts common Stripe secrets, bearer tokens, credential assignments and private-key blocks, and caps stored output. Commands are normalized so local absolute repository paths are not sprayed into evidence.
5. **Deterministic fingerprints.** Each report includes SHA-256 fingerprints for the normalized plan and its results, along with commit/ref, Node version, platform and architecture. The fingerprint is for integrity/audit comparison, not a digital signature.
6. **Fail-closed plan validation.** The runner rejects duplicate step IDs, unknown npm scripts, malformed arguments and timeout values outside policy before launching the plan.
7. **Operator-ready CI summary.** When running in GitHub Actions, the runner updates the job summary with each check's status, duration, bounded details and plan/result fingerprints. It also uploads the execution plan and per-stage checkpoint evidence.

### Reproduce locally

From the repository root:

    npm ci
    npm run qa:one-pass
    node scripts/osgard-one-pass-release.mjs --plan-only
    node scripts/osgard-one-pass-release.mjs

To tune stage timeouts for a constrained runner, use for example:

    node scripts/osgard-one-pass-release.mjs --timeout-ms 900000

The --plan-only option validates the complete npm command map and prints the plan as JSON without running checks or contacting the server. Unknown CLI flags are rejected.

### How to interpret results

- BLOCKED: a critical release stage failed; do not treat this run as release-ready.
- REVIEW_REQUIRED: all critical stages completed, but one or more optional/external checks need human review.
- SOURCE_READY_FOR_OPERATOR_REVIEW: all automated stages passed; this still does not mean production deployment, payment activation, ad-network approval, legal approval or external-project security approval has occurred.

Network reachability is evidence about an HTTP response at a moment in time. It is not a security audit, uptime SLA, feature verification or approval to spend money on promotion. Payments and sponsor inventory remain disabled by default.
