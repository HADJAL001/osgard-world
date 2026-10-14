# CASCADE LAB 0.26.0 — Replay Verification

## Release objective

Add a reproducibility laboratory to the current CASCADE LAB physics game without replacing the campaign, six devices, local engineering archive, adaptive missions, evidence tools or offline shell.

The laboratory reruns the exact selected blueprint through the game's existing `PhysicsWorld` implementation. The isolated simulation uses the same `WORLD.fixedStep` (1/120 second), same embedded level definition and same device positions/angles; it does not change the active scene, best scores, Research XP, campaign transitions or consented portal analytics.

## Seven substantial changes

1. **Isolated replay engine.** A versioned `CASCADELAB026_ENGINE` entry point validates level IDs and device data, creates a private `PhysicsWorld`, executes at most 3,600 fixed simulation steps, and restores the global device UID sequence after the run.
2. **Three independent repeats.** The verification panel executes three fresh worlds from the saved blueprint and yields between passes so progress, cancellation and accessibility announcements remain responsive.
3. **Frame deviation measurement.** The comparator interpolates recorded trajectories at common sample times and measures mean/max spatial deviation and maximum velocity delta.
4. **Terminal and event comparison.** Status, reason, time, terminal coordinates/velocity, gate state, checkpoint results, physics event timeline and measured telemetry are compared. Different level IDs, setups or engine contracts are rejected as non-equivalent.
5. **Portable replay certificate.** JSON certificate stores the blueprint fingerprint, original run, three isolated replays, comparison evidence, verdict and an explicit limitations block.
6. **Validated import/export.** Import enforces a 600 KiB size cap, schema/release/engine-contract checks, known level/tool shapes and checksum verification. Altered payloads are rejected.
7. **Local, bounded operations.** The panel keeps no more than five recent certificates in the current browser, permits export/import/delete, provides status updates and focus-visible controls, and makes no network requests.

## Certificate verdicts

- `reproducible`: the three isolated trials agree within the implemented tolerances and the observed run matches the first replay.
- `baseline-drift`: repeated trials agree, but the saved original differs from the current replay.
- `unstable`: the isolated trials themselves disagree.

These are diagnostic labels, not claims about the physical world.

## Important limitations

- The certificate is **not a digital signature**. FNV-1a-32 is used to detect accidental data changes; anyone can recompute it.
- Reproducibility is assessed within the same game release, embedded physics rules and current browser runtime. It does not prove cross-browser or cross-device equivalence.
- An input blueprint may repeatedly fail. This release tests determinism and evidence quality; it does not label a failed construction as a successful solution.
- The existing physics model is a game model, not a validated engineering simulator.

## Data handling and safety

- Entry point: `/games/cascade-lab/`.
- Replay module: `/games/cascade-lab/replay-verification.js?v=0.26.0`.
- Offline shell: service-worker cache `v0.26.2`; replay module is included in precache and its registration URL is versioned.
- Local history key: `osgard.cascade-lab.replay-verification.v1`.
- Certificate import cap: 600 KiB; retained certificates: at most five.
- No run record, certificate or blueprint is sent to a server by the Replay Verification module.

## Release gates

- `npm run qa:cascade-lab-replay-verification` exercises the actual `LEVELS` and `PhysicsWorld` code extracted from the shipping game shell. It repeats a real setup three times and checks exact frame/telemetry identity.
- `npm run qa:games-detail` now includes the replay contract test in addition to existing game integrations.
- `npm run qa:cascade-lab-pwa` checks the worker precache, version equality and old-shell eviction.
- The production route matrix checks the new JS route, current shell release marker, replay engine contract and local-only boundary.
- Direct deployment remains gated by the full front-end build and production route matrix.
