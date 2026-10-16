# CASCADE LAB 0.26.0 — Replay Observatory

## Purpose

Replay Observatory adds a local-first reproducibility and trace-integrity layer to the existing CASCADE LAB physics experience. It consumes the already emitted `osgard.cascade-lab.run-summary/v1` event; the simulation equations and level rules are unchanged.

## Seven engineering improvements

1. **Canonical blueprint fingerprint.** Sorts object keys and normalizes device coordinates/angles before deriving a compact FNV-1a fingerprint, so a run ID or timestamp does not make an unchanged construction look new.
2. **Trajectory fingerprint.** Produces a repeatable digest from bounded, normalized frame samples and gate/checkpoint states.
3. **Capture-quality score.** Checks minimum trace length, monotonic time, duplicate frames, summary/frame duration mismatch, trace truncation, and missing telemetry events. It grades evidence quality, not player skill.
4. **Same-protocol comparison.** Rejects cross-level comparisons and reports mean/maximum positional deviation, duration delta, device delta, outcome change, and quality delta.
5. **Repeatability signal.** Groups same-level runs by blueprint fingerprint and computes observed trajectory drift. It is descriptive; it does not claim that identical blueprints guarantee identical physics environments.
6. **Bounded research archive.** Keeps up to 30 runs and 420 frames per run, validates imported JSON schemas and duplicate IDs, caps imports at 350 KiB, and exports JSON or spreadsheet-safe CSV.
7. **Local research notebook and privacy boundary.** Notes and archives stay in browser storage. The module makes no network requests, uses text-only DOM rendering, and labels fingerprints as quick integrity hints rather than cryptographic signatures.

## Data contract

- Event input: `cascade-lab:run-finished` with `osgard.cascade-lab.run-summary/v1`.
- Module schema: `osgard.cascade-lab.replay-observatory.v1`.
- Archive schema: `osgard.cascade-lab.replay-observatory-archive.v1`.
- API is local-only; no account, remote service, API key, or OpenAI call is required.

## Verification

Run `npm run qa:cascade-lab-replay-observatory` for deterministic fingerprint tests, malformed-input rejection, same-level guardrails, quality grading, archive round-trip and privacy checks. `npm run qa:cascade-lab-pwa` verifies the module is in the service-worker precache. The production route matrix checks the public JS route and page loader contract.

## Limits

FNV-1a is not cryptographic authentication and should not be treated as tamper-proof proof. Frame interpolation is a sampled comparison, not a full physics replay or a guarantee of deterministic execution. Results are observational; change one variable at a time and validate in the actual simulation.
