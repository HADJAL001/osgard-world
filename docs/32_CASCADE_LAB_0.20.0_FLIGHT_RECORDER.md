# CASCADE LAB 0.20.0 — Flight Recorder

## Product step

Version 0.20 adds a local flight-recorder layer to the existing physics puzzle. It captures the trajectory points already recorded by the simulation engine; it does not synthesize a trajectory after the result.

## Player-facing capabilities

1. Scrub through the recorded run with a time slider.
2. Move one recorded sample backward or forward.
3. Play or pause the stored trace as a visual timeline.
4. Inspect elapsed time, x/y position, speed magnitude and velocity components.
5. View the velocity vector at the selected point.
6. See start/end positions and place event markers over the route.
7. Click or keyboard-activate an event marker to jump to its timestamp.
8. Browse and reopen recent local traces.
9. Overlay the closest earlier run of the same level using a contrasting line.
10. Compare the result, duration, device count and recorded peak speed without asserting causal proof.
11. Export an individual trace as JSON after an explicit click.
12. Continue using CASCADE LAB 0.19 Engineering OS, 0.18 Hypothesis Lab and 0.17 Delta Lens.

## Recorded data contract

- Event: `cascade-lab:run-finished`.
- Input trace: at most 420 samples copied from `PhysicsWorld.history`, whose records contain simulation time, position, velocity, gate state and reached checkpoints.
- Archive schema: `osgard.cascade-lab.flight-recorder.v1`.
- Each stored trace keeps no more than 180 evenly sampled points while preserving the first and last sample.
- At most 12 stored traces; the combined local archive is capped at 120 KiB. Older traces are trimmed first when a new record would exceed the byte limit.
- JSON export is initiated by the player. The module does not upload a trace or call a network endpoint.
- Imported/exported structures are schema-checked; IDs are unique in each accepted archive, trace arrays must contain at least two valid points and archive size is measured in UTF-8 bytes.

## Interpretation limits

The plot displays the game's simulated world coordinates, not real-world measurements. Velocity is derived from the engine's recorded velocity components. The gold overlay is a visual comparison with an earlier run of the same protocol; temporal order or differences between runs do not, by themselves, establish causality. A missing point or event is not proof that the underlying event did not occur.

## Release gates

- Flight Recorder module: `/games/cascade-lab/flight-recorder.js?v=0.20.0`.
- Test command: `npm run qa:cascade-lab-flight-recorder`.
- `qa:games-detail` runs the game shell, Hypothesis Lab, Engineering OS and Flight Recorder checks.
- The OSGARD frontend deploy workflow validates the versioned game shell and both engineering modules through the production route matrix on desktop and mobile.
