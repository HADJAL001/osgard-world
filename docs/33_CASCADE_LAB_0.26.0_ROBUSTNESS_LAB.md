# CASCADE LAB 0.26.0 — Robustness Lab

## Purpose

Robustness Lab tests whether a construction that works once keeps working when one chosen class of input is perturbed slightly. It uses the same `PhysicsWorld` implementation as the interactive game with `WORLD.fixedStep = 1 / 120` seconds. Each trial receives a fresh physics-world instance built from snapshots of the current level and device blueprint; it does not modify the live construction or the visible simulation state.

## A series

The player chooses 12, 24, 36 or 48 trials, a severity profile and an integer seed. The seed creates a repeatable sequence of pseudo-random perturbations. Trials cycle through the applicable groups. The angle group is omitted when the blueprint has no directional devices; the placement group is omitted for an empty blueprint. This prevents no-op trials from inflating the measured success rate.

1. **Angle** — directional devices such as spring, fan, belt and bumper receive a small angle offset.
2. **Placement** — each device receives a small X/Y position offset, bounded to the scene.
3. **Launch impulse** — the initial horizontal start speed is adjusted by a small percentage.

Severity profiles are bounded by the module:
- Light: up to ±2°; ±1.5 px; ±1.5% launch speed.
- Standard: up to ±5°; ±3 px; ±3% launch speed.
- Stress: up to ±10°; ±6 px; ±6% launch speed.

Each trial changes only one family. The code snapshots the level geometry and the device blueprint, then runs the existing fixed-step physics in an isolated instance. It yields between trial runs so the interface can update status and progress.

## Results

The report includes:
- one baseline result and every perturbed outcome;
- delivery percentage, median and 90th-percentile times for successful trials;
- per-factor win/fail counts;
- failure-reason groupings such as off-track, missed checkpoint, closed gate/contact, timeout and fragile-cargo impact;
- final-position map, peak speeds and impact-speed samples where available;
- the random seed and severity profile for reproduction.

The module provides local JSON and CSV exports. CSV cells are quoted and formula-leading values are prefixed defensively. A bounded browser-local archive keeps at most 12 reports. This version does not provide network submission or cloud sync.

## Interpretation and limits

“Robust” means only that the chosen construction survived the selected game-model perturbations and bounds in this series. It is not a claim that an actual mechanism would work in the physical world, nor a calibrated engineering simulation. A low success rate indicates sensitivity in the game model and can guide the next controlled test; it does not prove the causal role of a particular device. If a construction has no directional devices, the angle factor cannot meaningfully perturb its angle and should be interpreted accordingly.

## Release checks

- Module: `public/games/cascade-lab/robustness-lab.js`.
- Export envelope schema: `osgard.cascade-lab.robustness-report.v1`; the browser-local archive uses `osgard.cascade-lab.robustness-archive.v1`.
- Physics integration: the local `CASCADELAB026_CORE` interface in `index.html`.
- Smoke command: `npm run qa:cascade-lab-robustness`.
- The direct deployment workflow gates the release on the smoke test and route-matrix checks for the v0.26 shell and public JavaScript asset.
