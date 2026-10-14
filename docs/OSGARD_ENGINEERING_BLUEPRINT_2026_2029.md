# OSGARD WORLD Engineering Blueprint 2026–2029

Date: 14 October 2026
Status: strategic plan; targets become binding only after an owner approves them.

## Executive intent

The objective is not to accumulate features. It is to make every shipped experience reproducible, measurable, accessible, privacy-aware, recoverable, and capable of improving without destabilizing the rest of the ecosystem.

OSGARD has multiple product surfaces with different runtime risks: a static React/Vite shell, browser-based games, a Godot/WebAssembly game, consent-controlled analytics, commerce/API services, content discovery and release automation. The engineering system must treat them as one product with explicit contracts while keeping their runtimes and trust boundaries separate.

The North Star is proof-carrying releases: every release has a source revision, deterministic build evidence, contract checks, runtime tests, route checks, a privacy review, and a human-readable risk summary. AI helps discover risks and explain evidence; deterministic tests and human approvals remain authoritative.

## Operating principles

1. **One source of truth.** Product identity, routes, game metadata, build IDs, release versions and compatibility claims must be generated from explicit registries where practical, not hand-copied across pages and scripts.
2. **Reproducible evidence.** Every release report includes commit SHA, toolchain versions, named checks, artifacts and stable hashes. A green summary without retained evidence is not sufficient.
3. **Fail closed for critical contracts.** Missing evidence is not success. A required check that did not run is distinct from one that passed.
4. **Small blast radius.** Preview, stage, verify and activate are separate steps. Production changes require explicit approval and a verified rollback path.
5. **Privacy by construction.** Analytics stay opt-in. Player content, credentials, tokens and raw personal data never enter the AI reviewer or build logs.
6. **Local deterministic tests first.** Model-generated suggestions must be converted into normal tests before they can become release blockers.
7. **Accessibility and performance are features.** Keyboard/touch use, reduced motion, low-memory devices and real-world network conditions are part of the product contract.
8. **No silent AI authority.** A model can summarize evidence and propose actions; it cannot pass failed tests, change source code, merge pull requests or deploy production.

## Target architecture

### A. Product contract plane
- Canonical registry for worlds, games, IDs, routes, capabilities, SEO identity, share-card assets and post-game links.
- Generated or checked derivatives: catalogue cards, JSON-LD, invite allow-lists, device diagnostics, launchers, recommendation graphs and sitemap.
- A contract audit reports missing, duplicate and unexpected entities with stable IDs and machine-readable evidence.

### B. Experience/runtime plane
- Browser-game smoke tests for entry, state transitions, saves, sharing, accessibility and offline fallback.
- Headless Godot tests for gameplay rules, daily challenge determinism, save migrations, rendering telemetry and WebAssembly export.
- Device profiles covering desktop, touch, gamepad, reduced motion, keyboard navigation, low-memory browsers and slow connections.
- Runtime diagnostics must be independent from optional UI components; one missing HUD panel must not disable observability.

### C. Trust and privacy plane
- Versioned consent semantics, default-deny analytics, data minimization and documented retention.
- Dependency and secret scanning; only reviewed environment variables may be passed to deployment.
- Strict separation between public static assets, server-side credentials, user progress, commerce data and telemetry.
- Incident runbooks for suspected credential exposure, corrupted release assets, API outage and failed rollback.

### D. Release-evidence plane
- Typecheck → unit/contract tests → browser/game smoke tests → build → artifact preflight → runtime/route verification.
- File-level SHA-256 inventory and release attestation.
- Quality report is bound to the exact artifact it describes; stale or edited evidence fails verification.
- Staging and production activation are separate; the old artifact is retained until post-deploy probes pass.

### E. Optional AI engineering plane
- An opt-in OpenAI Responses API reviewer summarizes only minimized CI reports with Structured Outputs.
- The reviewer has no tools, shell access, repository write access, merge permissions or deployment authority.
- Requests use store=false; the prompt excludes source code, credentials, player data and raw command output.
- Every AI finding has evidence references, confidence and a proposed verification step. No finding is treated as fact until verified.
- Curated evaluation fixtures test hallucinated blockers, missed deterministic failures, prompt injection in report fields, malformed outputs and unsupported claims.
- An absent API key or unselected AI review must never block a normal release.

## Phase 0 — Stabilize the release path (days 0–30)

**Deliverables**
- Remove known flaky or stale smoke assertions; replace release-version magic strings with assertions against versioned release metadata.
- Make game lifecycle and HUD diagnostics independently testable.
- Ensure every failed/blocked/skipped check has a structured reason; failed deployment probes trigger safe rollback and retain logs.
- Establish a release manifest outside the artifact with immutable source SHA, build/run ID, toolchain versions, sorted per-file SHA-256 inventory and a deterministic tree digest. Generate it after all packaging transformations, against the exact HTML tree included in the deployment archive; retain the manifest, archive checksum, archive and post-deploy route matrix together, bound to the same source revision.
- Add a human-reviewed deployment runbook and staging-only default.
- Introduce the local test command for the AI reviewer; keep live API use manual and optional.

**Acceptance gates**
- 100% of critical game entry routes are represented in a route matrix.
- All release-critical tests are required rather than silently skipped.
- The final packaged HTML tree is re-hashed after version-stamping and compression, then its manifest is retained beside the archive checksum and post-deploy route matrix. Production route verification must confirm that the deployed marker matches the commit SHA; symlinks, mojibake HTML and self-referential manifests fail closed.
- An invalid or blocked quality report cannot be labelled ready.
- A simulated failed post-deploy health check exercises rollback in a disposable fixture.
- AI review sends no request unless explicitly enabled and a server-side API key is present.

## Phase 1 — Deterministic product contracts (days 31–90)

- Generate route and SEO derivative data from the canonical game registry, reducing duplicated hard-coded lists.
- Add schema validation and migration fixtures for persisted player progress, share-link payloads and release metadata.
- Add route contract tests for expected status code, content type, build marker and critical content—not only HTTP 200.
- Add accessibility smoke tests for keyboard focus, accessible names, motion preferences, contrast tokens and touch target sizes.
- Add performance budgets for JavaScript/CSS, critical images, startup work, WebAssembly download and main-thread long tasks.
- Add synthetic fixtures for API outage, invalid/expired tokens, rate limits, missing configuration and stale service-worker caches.

**Acceptance gates**
- A new game fails CI if its registry entry is missing in any required derivative.
- Every persisted schema has a migration and rollback/compatibility fixture.
- Performance budgets are visible and tracked; regressions require a documented exception.
- Every critical browser flow has at least one positive and one negative test.

## Phase 2 — Reliability and product observability (months 3–12)

- Move from static duplicated metadata to generated derivatives wherever this can be done without weakening editorial review.
- Add deterministic seeded simulation tests for game mechanics, progression, economy, daily challenges and post-session recommendations.
- Add a compatibility matrix for browsers, mobile devices, WebGL/WebAssembly capability and reduced-motion mode.
- Measure user-experience SLOs using consented, aggregate, minimal analytics only; keep operational health probes separate from product analytics.
- Introduce release channels: local preview, CI preview artifact, internal staging, production.
- Build disaster-recovery exercises: restore static build, roll back API configuration, restore player-save fixture, rotate credentials.
- Maintain an owner for each critical service and a tested incident runbook.

**Initial targets to validate against baseline**
- 99.9% monthly availability for critical public routes, excluding declared maintenance.
- 99.5% successful launch rate for supported game/device combinations measured through synthetic testing.
- 100% of production deployments carry verifiable build evidence and a rollback reference.
- Zero secrets in client bundles; zero raw player content in analytics.
- P95 initial route response and interaction latency budgets documented per surface, not collapsed into one misleading site-wide number.

## Phase 3 — Risk-based release engineering (months 12–24)

- Use change impact mapping to select focused tests, while always retaining a small mandatory cross-product smoke suite.
- Add canary or staged rollout for server/API changes and reversible flags for risky UI changes.
- Track recurring incidents, flaky tests, mean time to detect, mean time to restore and rollback success.
- Add contract fuzzing for share URLs, import/export payloads, API validation and save-file migrations.
- Add a curated visual regression set for high-value screens and devices.
- Add AI-generated test proposals only in a branch or artifact; promote them only after deterministic reproduction and human review.

**Acceptance gates**
- Every production incident has a root-cause report and regression test where technically feasible.
- No single optional subsystem (analytics, recommendations, diagnostics, AI review) can prevent core gameplay startup.
- Release promotion requires both artifact verification and successful runtime probes appropriate to the change.

## Phase 4 — Evidence-driven adaptive engineering (months 24–36)

- Maintain versioned evaluation datasets for game balance, release-risk classification, content quality, accessibility findings and test-generation success.
- Compare AI reviewers against a labelled historical set; track false negatives, false positives, unsupported claims and agreement with human reviewers.
- Use OpenAI models for structured risk triage, alternative design reviews, adversarial test ideas and evidence summaries—not as the sole truth source.
- Consider automated remediation only in disposable branches with bounded file scope, policy checks and mandatory tests; no agent receives production credentials.
- Adopt stronger provenance/signing where threat modelling justifies it, including signed release attestations and verification of workflow identity.
- Periodically exercise disaster recovery, key rotation, dependency compromise response and supply-chain integrity.

**Acceptance gates**
- AI reviewer quality is measured against a fixed evaluation set and versioned rubric before model/prompt changes are promoted.
- Every model-suggested code change has a diff, deterministic tests and human approval.
- Release provenance identifies source revision, build environment, artifact digest, report digest and approval event.
- Recovery objectives (RTO/RPO) are set per service and demonstrated in a practice drill.

## OpenAI integration contract

The optional reviewer uses the official Responses API and Structured Outputs:
- Endpoint: https://api.openai.com/v1/responses
- Default model ID is configurable through OPENAI_MODEL and may be changed when availability or pricing changes.
- The request sets store=false and includes no tool definitions.
- Only minimized, allow-listed report fields are sent; raw logs, source files, tokens, player data and API responses are excluded.
- Outputs are schema-validated and deterministically overridden when machine reports contain failures.
- Every report states that a human decision is required. It never triggers deployment.
- API use may incur charges and requires a project key. No API key is needed for offline tests or preview mode.

Official references:
- https://platform.openai.com/docs/api-reference/responses
- https://platform.openai.com/docs/guides/structured-outputs
- https://platform.openai.com/docs/models
- https://platform.openai.com/pricing

## Governance and review cadence

- Weekly: check CI failures, flaky tests, dependency alerts, route matrix and performance budgets.
- Monthly: review SLO trends, accessibility issues, privacy boundary and incident follow-up.
- Quarterly: revisit architecture decisions, recovery drills, model evaluations and roadmap priorities.
- Each release: attach the manifest, critical test outcomes, route evidence, artifact digest, known limitations and named human approval.

## Decision log

The blueprint intentionally separates direction from implementation. Teams must create a short Architecture Decision Record (ADR) before adding a new datastore, mandatory third-party service, global telemetry source, production agent, or irreversible migration. Prefer the smallest design that satisfies the measurable release contract.
