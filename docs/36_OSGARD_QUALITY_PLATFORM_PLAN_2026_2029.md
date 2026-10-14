# OSGARD Quality Platform: engineering plan 2026–2029

**Status:** implementation plan, dated 14 October 2026. Targets below are proposed release gates; they become policy only after the product owner approves them.

## North Star: proof-carrying releases

Every production release should answer four questions with machine-readable evidence:

1. **What did we intend to ship?** The canonical product/game registry, launch paths, capabilities and privacy contract.
2. **What did we actually build?** An inventory of files with sizes and SHA-256 hashes, tied to an immutable commit.
3. **What was verified?** Deterministic contract, type, game, route, privacy, artifact and operational checks with stable IDs and explicit pass/fail/skip states.
4. **What decision remains human?** Release approval, production activation, risk acceptance and any exception.

This PR implements a first end-to-end slice: the Contract Integrity Engine checks mirrored game metadata and routes; the catalogue regression protects growth beyond eleven games; the release attestation binds the exact passing audit report to the actual build inventory. It does not claim to be a cryptographic signature or a replacement for post-deploy checks.

## Architecture and trust boundaries

### Plane A — Product contracts

- Treat the core game manifest as authoritative for IDs, titles and launch paths.
- Audit every mirrored surface: HTML catalogue cards, JSON-LD, device diagnostics, player launcher, post-session recommendations, referral allow-list, contextual recommendation graph, share-card generator, production route matrix and sitemap.
- Fail on missing, duplicate or unknown IDs/routes. Return actionable missing/extra values, not only a red/green badge.
- Next step: move high-confidence derivative lists to generated files from the manifest, keeping human-edited copy in reviewed source files.

### Plane B — Build identity and artifacts

- Reject symlinks, non-regular entries, secret-like filenames and unsafe paths in the public build.
- Hash each file and a normalized inventory of path, byte count and digest.
- Bind the product-contract report by both its exact JSON hash and normalized contract fingerprint.
- Verification must fail if a build file, file inventory, or bound contract report changes after attestation.
- Preserve evidence with the immutable Git commit, workflow run and release ID. SHA-256 by itself is integrity evidence, not proof of signer identity.

### Plane C — Runtime, privacy and product quality

- Keep current typecheck and game smoke tests; add route assertions for expected content/build marker, not just HTTP 200.
- Keep analytics default-deny and opt-in. Diagnostics must not upload raw reports or player data.
- Treat the manifest as the route denominator: every registered product must have a tested launch path, discoverable canonical URL and known compatibility checks.
- Add browser/device coverage for desktop, touch, keyboard, reduced motion, slow connections and WebGL/WebAssembly failure.
- Track known exceptions with an owner, expiry and a verification path.

### Plane D — OpenAI-assisted review (advisory)

The existing OpenAI Responses API reviewer should operate only on allow-listed, bounded summaries of four artifacts: release readiness, contract audit, release attestation and production route matrix.

- Send no source tree, raw command logs, environment variables, credentials, player records, payment data or full HTTP response bodies.
- Use Structured Outputs with a strict JSON schema; no tools, shell access, repository write access, merge access or deployment authority.
- Set `store: false`; preserve an input SHA-256 digest for each review.
- Run the external API only from an explicit manual workflow input. An API call may incur charges and depends on a configured server-side secret and currently available model.
- If any deterministic artifact is blocked or contains failed checks, force the combined recommendation to `hold` regardless of the model assessment. Every review requires a human decision.
- Convert useful AI findings into deterministic tests before they become blocking rules.

## 0–30 days — Make release evidence trustworthy

**Deliverables**
- Contract Integrity Engine and 12/120-item catalogue regression.
- File-level artifact attestation bound to the exact contract audit report.
- Release readiness uploads the JSON audit and attestation alongside route/build evidence.
- Manual OpenAI review consumes the sanitized readiness, contract, attestation and route reports.
- One release runbook defines preflight, stage, verify, activate and rollback; no implicit production writes.

**Exit gates**
- Contract audit passes on a clean checkout.
- Altered/missing files, altered audit report, blocked audit or secret-like build file all fail verification.
- Critical launch routes appear in both the product registry and route matrix.
- AI review never overrides a deterministic failure and never runs without explicit opt-in.

## 31–90 days — Generate rather than duplicate

- Generate safe derivative route/SEO/referral lists from the canonical manifest where the editorial workflow allows it.
- Add schema versions and migration tests for saved game state, shared URLs, release metadata and invitation payloads.
- Add accessibility smoke tests for keyboard operation, focus order, accessible names, contrast tokens and reduced motion.
- Add a performance budget per surface: compressed JavaScript/CSS, largest image, startup work, WebAssembly bytes and long tasks.
- Add negative fixtures for missing assets, unsupported graphics APIs, stale service-worker cache and invalid state payloads.

**Exit gates**
- Registering a game without required derivative metadata fails CI with a specific list of missing records.
- Each persisted schema has a migration fixture and a documented compatibility window.
- Every critical flow has positive and negative tests.
- Performance regressions require a measured exception, not a silent threshold increase.

## Months 3–12 — Reliability and observability

- Build a compatibility matrix for supported browser, mobile, keyboard/touch/gamepad, reduced-motion and WebGL/WebAssembly capabilities.
- Separate operational synthetic probes from consented product analytics; measure only bounded, aggregated, consented data.
- Add seeded deterministic simulation tests for progression, daily challenges, reward safety and recommendation edges.
- Retain release artifacts and a tested rollback reference for every deployment.
- Run quarterly recovery drills: restore the static artifact, revert a release, recover a save fixture, and rotate compromised credentials.

**Proposed targets, to be baselined before commitment**
- 100% of production releases carry a verified artifact inventory and contract fingerprint.
- 100% of critical launch routes are checked in CI and post-deployment.
- Zero credentials in public build inventory and zero raw player content in analytics/AI packets.
- P95 route startup/interaction budgets published for each experience, not hidden behind one site-wide average.
- Critical recovery paths are exercised at least quarterly.

## Months 12–24 — Risk-based quality

- Select a focused test set from file/path impact, but always run critical privacy, artifact and release-contract tests.
- Add signed attestations or a trusted provenance service if the threat model requires publisher identity beyond SHA-256 integrity.
- Add synthetic degradation tests for API outage, rate limiting, stale content, partial route failure and rollback failure.
- Track escaped defects by class and improve tests for the highest recurrence, not just the highest volume.
- Establish owners and a time-to-remediate target for critical and high issues.

## Months 24–36 — Safe, measurable AI assistance

- Evaluate the AI reviewer against a versioned golden set: seeded deterministic failures, prompt injection in report fields, unsupported claims, false blockers and malformed structured outputs.
- Measure precision/recall of findings and calibration of confidence before allowing the model to influence prioritization.
- Allow models to propose test cases and explain evidence, never to suppress tests, grant permissions, merge code or deploy.
- Consider local/browser agent experiments only behind the same policy boundaries, with deterministic replay and explicit human confirmation for external side effects.

## Governance and change control

- The project owner approves each new release gate, performance budget and SLO target after a baseline measurement.
- Production deployment remains separate from PR checks. A green CI report is evidence of source/build consistency, not a claim that every live route or real device was exercised.
- Exceptions require a written reason, named owner, expiry date and a test showing the exception remains bounded.
- The status of this plan and the exact accepted gates should be reviewed every quarter.

## Immediate command sequence

From a clean checkout:

    npm ci
    npm run check
    npm run qa:contracts
    npm run qa:release-attestation
    npm run build
    npm run preflight:frontend
    npm run release:attest
    npm run release:verify

For the paid AI review, start the manual GitHub Actions workflow and explicitly set the input that sends the sanitized report packet to OpenAI. Never place an API key in code or in a frontend build.
