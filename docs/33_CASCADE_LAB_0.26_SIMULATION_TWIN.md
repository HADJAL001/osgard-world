# CASCADE LAB 0.26.0 — Simulation Twin

Date: 14 October 2026  
Status: candidate release; production approval requires the deployment workflow and public route matrix to pass.

## Intent

Simulation Twin moves CASCADE LAB from post-run inspection to a bounded, repeatable experiment runner. It reuses the game's actual `PhysicsWorld`, level registry and fixed timestep rather than implementing a second approximation of the physics.

## Runtime contract

- Engine: existing `PhysicsWorld` class and `WORLD.fixedStep = 1 / 120` seconds.
- Adapter API: `window.CASCADELAB026_RUNTIME`, schema `osgard.cascade-lab.simulation-twin.v1`.
- Workbench: `public/games/cascade-lab/physics-twin.js?v=0.26.0`.
- Fixed inputs are copied and normalized; the active live scene, reward economy, local progression and analytics are not mutated by isolated runs.
- Each trial is bounded by the engine time limit, a maximum step guard, at most 12 candidate devices, and at most 420 trajectory samples.
- The control check runs the exact same scenario twice, returns stable fingerprints and compares the generated paths.
- The angle sweep runs five isolated trials at offsets `-2Δ, -Δ, 0, +Δ, +2Δ`, adjusting only the chosen device's angle. The player selects Δ (3°, 6° or 9°; the runtime accepts a bounded 1°–15° step).
- The result view overlays the real trajectories, lists run outcome/time/device count/peak speed/path and allows an explicit local JSON export capped at 1 MiB.
- The new module is included in the v0.26 service-worker precache for installed offline launches.

## Determinism and fingerprints

The adapter fingerprints the fixed-step input/result package to test repeatability inside the current browser implementation. Fingerprints use FNV-1a for accidental-change detection and comparability. They are **not cryptographic signatures**, anti-cheat proofs or a proof that the simulation matches real-world physics.

An identical fingerprint means the same implementation generated the same recorded result for these exact normalized inputs. It does not establish that a mechanism is realistic, safe, or optimal.

## Experimental interpretation

The five-case angle sweep is a small finite local sensitivity study, not a statistically powered reliability estimate. A successful fraction such as 3/5 describes those five selected angle settings only. The UI warns against extrapolating this to real-world reliability. The experiment changes one input at a time, retains a repeated control baseline and calculates trajectory deviation over normalized run time.

## Privacy and safety boundary

- No network requests are made by the Simulation Twin module.
- The default runner has no API key, account ID, session ID or arbitrary user prompt.
- Nothing runs until the player explicitly clicks the control or sweep button.
- JSON export occurs only after an explicit click; the payload states `uploaded: false` and `localOnly: true`.
- The existing optional OSGARD AI Game Coach remains a separate server-side, disabled-by-default feature with its own consent and rate limit. Simulation Twin must work in full with the Coach unavailable.
- No AI output can alter physics, score, rewards, local history, campaign attribution or deployment readiness.

## Verification

Run:
```sh
npm run qa:cascade-lab-simulation-twin
npm run qa:games-detail
npm run check
npm run build
```

The dedicated smoke test executes the **actual production level registry and PhysicsWorld source** inside a headless harness. It checks exact repeated fingerprints, zero control-path deviation, the five-case sweep, a baseline match, mutation isolation, invalid-input rejection, trace bounds, safe UI source and worker precache. The production route matrix checks the new JavaScript asset's HTTP status/content type and its version, schema, capabilities and local-only boundaries.

## Three-year architectural direction

Simulation Twin is a contained runtime component in the 2026–2029 OSGARD engineering blueprint: repeatable contracts first; curated, deterministic evaluations second; optional AI explanation only after the numeric evidence is validated. Follow-on milestones are:
1. 0–90 days: canonical simulation fixtures, route/version registries, physics invariants and deterministic regression fixtures for every level.
2. 3–12 months: browser/device matrix, visual trajectory regression and performance budgets for low-memory phones.
3. 12–24 months: sensitivity and replay contracts versioned across physics-engine releases; compatibility/rollback evidence.
4. 24–36 months: optional OpenAI explanations over minimized, validated experiment summaries, behind per-request consent, server-side spend limits and human review. AI suggests next tests but cannot certify causality or operate production.

No three-year timeline is guaranteed by this release; these are proposed phases with explicit evidence gates.
