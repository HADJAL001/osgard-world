# CASCADE LAB 0.26.0 — Counterfactual Foundry

## Product change

Counterfactual Foundry turns a saved Trajectory X-Ray attempt into a small, reproducible model experiment. It does not add another physics engine: the headless virtual runs execute the same `PhysicsWorld` class and the same fixed 1/120-second step as the visible game.

## Core flow

1. Choose a saved X-Ray attempt. The module reads the local browser archive through `window.CASCADELAB022.getRuns()`.
2. Choose one installed device and one allowed parameter: angle, X position or Y position.
3. Run two identical baseline simulations to test whether the deterministic fingerprint matches.
4. Run a five-point sweep around the baseline at offsets `[-2, -1, 0, +1, +2]`. Only the selected device parameter is mutated.
5. Overlay the saved trajectory with the virtual baseline and four altered trajectories. Report the outcome/time, impact metrics, path deviation and agreement between the saved attempt and the predicted baseline.
6. Export the virtual study to JSON or CSV through an explicit player action.

## Fixed-step engine contract

- Global API: `window.CASCADELAB026_ENGINE`.
- Schema: `osgard.cascade-lab.virtual-simulation.v1`.
- Model marker: `PhysicsWorld-fixed-1/120`.
- Inputs are bounded and validated: known level, allowed device type, safe coordinate/angle limits and at most 12 devices.
- Simulation terminates on the actual game physics outcome or a maximum of 3,500 fixed steps; captured traces are capped at 420 frames.
- Virtual simulations do not dispatch `cascade-lab:run-finished`, do not enter ordinary player history and are not submitted to the Mission Director, X-Ray archive or leaderboard.

## Interpretation and safety

A deterministic model fingerprint means the same input reproduced the same game-model output under this implementation. It does not validate the model against the real world. A sweep estimates how the *game* responds to a changed setting; it is not proof of real-world causality.

Everything remains local in the browser. The Foundry module contains no network transport and uses text-safe DOM construction. JSON/CSV exports include explicit virtual-model provenance and are generated only on player action. The service worker pre-caches the cache-busted module for offline use.

## Quality gates

- `npm run qa:cascade-lab-counterfactual` extracts the exact PhysicsWorld source from the game page and exercises its headless API.
- The smoke test covers repeatability, validation of unknown levels/devices/oversized blueprints, one-variable mutation, five-point sweep, exact baseline matching, trajectory delta and safe export contracts.
- `scripts/production-route-matrix.mjs` verifies the public static asset, release loader and privacy boundary.
- `npm run qa:games-detail` runs the new suite alongside the previous module compatibility gates.
