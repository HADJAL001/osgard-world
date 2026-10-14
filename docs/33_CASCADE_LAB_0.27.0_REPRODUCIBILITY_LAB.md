# CASCADE LAB 0.27.0 — Reproducibility Lab

## Purpose

The Reproducibility Lab adds a controlled same-setup repeat workflow to the existing physics game. It does not replace the Experiment Studio, Trajectory X-Ray or Evidence Integrity. Those tools study experiments and traces; this layer asks a narrower question: does the same recorded setup produce the same observed result in this version of the game?

The physics equations are unchanged. The new module adds measurement and regression evidence around them.

## Seven substantial improvements

1. **Versioned physics profile.** Each finished run includes engine version, fixed time step, gravity, world dimensions, cargo radius and a bounded copy of the active level geometry.
2. **Canonical setup fingerprint.** A stable, non-cryptographic fingerprint is computed from engine version, physics profile, level, mode, daily date and normalized device placements. Device order and equivalent wrapped angles do not create false differences.
3. **One-click controlled repeat.** From a finished result, a player can rerun the same level with the same device placements. The game checks level, mode, date and current blueprint before starting; if the blueprint changed, the request is rejected.
4. **Same-scenario cohort.** The local archive groups runs only when their scenario fingerprints match. Runs from other levels, daily dates, modes or engine profiles are not treated as equivalent repeats.
5. **Trajectory repeatability metrics.** The lab samples each trace to at most 420 frames and computes mean and maximum spatial deviation across normalized simulation time, plus timing spread.
6. **Outcome/event drift gate.** The cohort shows whether success/failure and event ordering remain consistent. Strict pass requires identical outcome and event sequence, mean path deviation at most 0.05 px and time difference at most 0.01 s. A looser “close” tier allows up to 1.5 px mean deviation and 0.05 s time difference when outcomes and event ordering still match. Other cases are reported as drift.
7. **Portable, validated reproduction archive.** JSON export/import carries complete bounded run traces, setup profiles and measurements. Import rejects unknown schemas, malformed traces, changed fingerprints, duplicate IDs, more than 30 runs and files above 320 KiB.

## Data and privacy contract

- Module: `/games/cascade-lab/reproducibility-lab.js?v=0.27.0`.
- Archive schema: `osgard.cascade-lab.reproducibility-archive.v1`.
- Local storage key: `osgard.cascade-lab.reproducibility-lab.v1`.
- Maximum local archive: 30 runs; each run has at most 420 trajectory samples and 32 recent events.
- Import cap: 320 KiB.
- The module makes no network calls. Run history, setup profiles and imported capsules remain in the current browser's local storage until removed or browser data is cleared.
- A setup fingerprint is for consistent grouping, not security. It is deliberately **not** described as a cryptographic hash, digital signature or proof of authorship. The archive validator detects accidental or inconsistent edits when the supplied fingerprint no longer matches the normalized setup, but it cannot establish who created a file.

## Interpretations and limits

- A repeated result is evidence of consistency only for the captured inputs and the same declared engine profile. It is not proof that all browsers or devices will behave identically.
- The simulator uses a fixed integration step, but host scheduling and dropped frame time can affect recorded behavior. The lab reports measurable drift rather than guessing a cause.
- “Repeat without changes” records the current blueprint and challenge context. The host checks the current blueprint before starting the repeat.
- The module does not execute imported traces as live physics. It stores and compares their measured replay data; an imported capsule may be used as a comparison record.
- Existing consented portal analytics are unchanged. The Reproducibility Lab itself stores no private run history on the server.

## Release integration

- App shell: `0.27.0-reproducibility-lab`.
- Offline PWA metadata: `0.27.0-offline-reproducibility`.
- Service-worker cache: `osgard-cascade-lab-shell-v0.27.1`.
- Release smoke: `npm run qa:cascade-lab-reproducibility`.
- Integrated under `npm run qa:games-detail` and OSGARD PLAY pull-request QA.
- Production route matrix verifies the new static module's content type, schema, archive gate and no-network boundary before the direct frontend deployment is considered ready.
