# OSGARD Technology Roadmap: From Feature Growth to Verifiable Platform

Date: 14 October 2026
Owner: OSGARD engineering
Status: proposed execution plan; the items under "Current upgrade" are implemented in this PR branch and must pass CI before merge.

## North-star objective

OSGARD should be a game and interactive-world platform where every release is traceable, every user-facing route is discoverable, user data is handled by explicit consent, and product growth does not silently break existing games. "More features" is not the quality metric. The quality metric is a measurable, reversible, privacy-preserving change with evidence.

## Current upgrade: release quality platform

This PR introduces:
- A cross-surface contract audit for the canonical game registry, catalogue cards, structured-data routes, player diagnostics, player lifecycle launcher, referrals, post-session recommendations, share-card generator, production route probes, and sitemap.
- A stable SHA-256 fingerprint of the normalized product contract.
- A regression test for catalogue share selection with 12 and 120 IDs, preventing the old eleven-game ceiling from silently truncating future games.
- File-by-file release attestation; the attestation can bind the exact successful contract report and refuses blocked or malformed reports.
- Verification that catches changed, missing, added, or modified build files and an edited contract report.
- CI gates for the audit and attestation tests; release readiness stores the audit report and attestation as evidence.
- No production deployment is triggered by these checks.

Commands:
    npm run qa:contracts
    npm run qa:release-attestation
    npm run preflight:frontend
    npm run release:attest
    npm run release:verify

## Phase 1 — reliability and release evidence

Acceptance gates:
- Required CI checks pass on the exact PR head SHA.
- Every game in the core registry has a catalogue entry, launch route, diagnostic entry, share path, referral policy, recommendation metadata, and sitemap URL.
- The generated contract report has unique stable IDs, explicit string titles, internally consistent counters, zero failures, and a deterministic content fingerprint.
- Every production artifact has a non-empty entry point, per-file SHA-256, total file/byte counts, and no symlinks, special entries, or secret-like files.
- The artifact attestation records the immutable commit SHA and the exact quality-report digest.
- Post-deploy route probes and a human smoke pass remain required; a source audit is not an uptime guarantee.

## Phase 2 — player experience and performance budgets

Introduce per-entry-point budgets rather than a single site-wide number:
- Core marketing page JavaScript transfer: target <= 200 KiB gzip.
- Interactive game initial JavaScript: target <= 350 KiB gzip unless an approved exception identifies why a larger engine is needed.
- Largest Contentful Paint: p75 <= 2.5 seconds on supported mobile hardware.
- Interaction to Next Paint: p75 <= 200 ms.
- Cumulative Layout Shift: p75 <= 0.1.
- No uncaught exceptions during the primary start-play-pause-resume-exit path.
- Every game must respect reduced-motion preference, keyboard focus visibility, minimum touch targets, and a safe low-memory degradation path.

Measurement plan: run Lighthouse/Web Vitals per representative route; keep baseline JSON as CI artifacts; compare against the last successful default-branch build. Treat budgets as initially observational for one baseline window, then convert regressions into blocking gates with explicit exception expiry.

## Phase 3 — offline-first and device resilience

- Define a per-game capability manifest: offline assets, storage needs, input types, rendering mode, known mobile restrictions, and fallback mode.
- Add deterministic offline smoke tests for local assets; do not advertise offline play for a game whose remote dependencies are required.
- Make game save/checkpoint formats versioned and migration-tested.
- Use bounded storage, graceful quota handling, and explicit reset/export controls.
- Run a test matrix for low-memory Android, iOS Safari, desktop Chromium/Firefox/WebKit, touch-only, keyboard-only, and reduced-motion.
- Every failed capability probe should produce a user-readable fallback rather than a dead control.

## Phase 4 — optional OpenAI-powered experiences

AI can add value to OSGARD, but it must not become a hidden trust or cost boundary. Build a server-side adapter only after the owner selects allowed use cases and the runtime environment for secrets.

Potential opt-in features:
- A post-session coach that explains the user's own local game result using a fixed JSON response schema.
- Scenario generation for non-competitive sandbox modes, with deterministic validation before a scenario can load.
- Natural-language discovery over the published game catalogue and help documents.
- A creator assistant for drafting challenge descriptions, not for changing scores, currency, purchases, ownership, or moderation decisions.

Mandatory controls before any OpenAI API integration ships:
- API key exists only in server-side secret storage; never in browser JavaScript, static assets, query strings, telemetry, or committed config.
- Explicit in-product opt-in and a clear disclosure of which user-provided text will be sent.
- No automatic transmission of raw gameplay analytics, account identifiers, private documents, or third-party text.
- JSON Schema validation of every model output; unknown fields and invalid values are rejected.
- Model output is untrusted input. It cannot execute actions, change the authoritative game state, award rewards, process payments, or bypass moderation.
- Per-user and per-IP rate limits, request size limits, timeouts, retries with jitter, spend caps, usage metering, and a global kill switch.
- Content moderation and abuse monitoring appropriate to the selected use case.
- Short retention by default; define deletion behavior, provider settings, and logging redaction before launch.
- Offline fallback and no-API mode remain fully functional; tests must prove that unavailable AI does not block normal gameplay.
- A documented model/version evaluation set and a quality threshold are required before upgrading model versions.

No OpenAI API call is added by this quality-platform PR; this avoids introducing an unapproved external data flow or bill.

## Phase 5 — experiments, analytics, and learning loops

- Keep analytics default-deny until consent is affirmatively granted; withdrawal clears pending queues.
- Make event names and payloads schema-versioned, bounded, and privacy-reviewed.
- Distinguish observed product events from inferred attribution. A campaign query parameter is not proof that a person shared a link or that a conversion was caused by it.
- Experiment assignment must be deterministic, documented, and non-sensitive. Each experiment has a hypothesis, primary metric, guardrail metrics, expiry, and rollback plan.
- Publish aggregate metrics only when consent/legal basis and minimum cohort thresholds permit it.

## Phase 6 — supply chain, security, and incident recovery

- Add dependency and license inventory, lockfile integrity, secret scanning, and an SBOM to release evidence.
- Add threat-model checks for every new backend endpoint, especially authentication, webhook signature verification, replay protection, idempotency, and abuse/rate limits.
- Keep staging and production credentials separated; prohibit production credentials in fork/pull-request CI.
- Require a rollback target, tested health probes, and a documented release owner before irreversible migrations.
- Record incident timeline, blast radius, mitigation, root cause, and regression test for every production incident.

## Release scorecard

A release is "ready" only when:
1. Typecheck/build/tests pass on the same immutable commit SHA.
2. Contract audit returns ready with zero failed checks.
3. Artifact attestation verifies and binds the exact contract report.
4. Security and performance gates show no unapproved blocking regressions.
5. Route matrix passes on the target environment after deploy.
6. Consent/privacy checks pass.
7. Rollback instructions and a known previous-good release are available.
8. Any AI feature has passed schema, privacy, abuse, cost, evaluation, and offline-fallback tests.

## Explicit limits

A SHA-256 fingerprint establishes integrity against accidental or detectable changes; it is not a digital signature and does not independently prove who produced a report. GitHub workflow provenance, immutable commit identity, permissions, branch protection, and review are still required. Automated source checks complement but do not replace real device QA and post-deployment route checks.
