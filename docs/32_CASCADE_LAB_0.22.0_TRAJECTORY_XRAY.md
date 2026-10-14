# CASCADE LAB 0.22.0 — Trajectory X-Ray

## What changes

Trajectory X-Ray adds a local visual-analysis workstation around the existing physics replay. The physics model and campaign rules are not changed. The viewer uses recorded frames captured by the game, rather than generating a second, synthetic trajectory.

## Included capability set

1. A versioned run-summary contains up to 420 samples selected from the actual replay.
2. Sampling preserves the first and last recorded frames, allowing bounded long-run analysis.
3. Each sample carries time, position, velocity, gate state and checkpoint state.
4. A spatial trace plots the cargo's recorded X/Y movement.
5. A speed-over-time chart uses the recorded velocity vectors.
6. A time slider moves through the samples and interpolates the visible measurement.
7. The scrubber reports time, coordinates, speed, gate state and checkpoint count.
8. The event list shows a time-stamped subset of the engine telemetry.
9. Selecting an event moves the scrubber to its nearest recorded frame.
10. Previous/next event controls support keyboard and touch interaction.
11. A second run can be selected as a baseline.
12. The spatial chart overlays the selected baseline in a contrasting dashed line.
13. Baseline selection is restricted to the same level, mode and daily-date key.
14. A comparison reports outcome change, time delta, device-count delta and checkpoint delta.
15. The comparison reports distance-by-samples and peak/average speed deltas.
16. Mean trajectory deviation is calculated over 41 normalized time samples.
17. The UI labels deviation as descriptive; it does not claim that differences prove causality.
18. A short FNV-1a trace fingerprint helps identify local records but is not a cryptographic signature.
19. JSON export includes the selected trace, derived metrics and optional baseline comparison.
20. CSV export contains frame-level time, position, velocity, calculated speed and checkpoint state.
21. CSV cells are escaped and formula-like text is prefixed to reduce spreadsheet formula injection.
22. JSON import validates schema, trace shape, record IDs, bounds and duplicate IDs.
23. JSON archive size is bounded to 600 KiB; an archive stores at most 18 runs.
24. Each run contains at most 420 trajectory frames and a capped event list.
25. Local storage can be cleared by browser settings; export a JSON backup to preserve an archive.
26. The panel adapts to desktop and mobile layouts with reduced-motion and visible keyboard-focus support.
27. Canvas resolution is bounded for high-DPI displays.
28. Imported labels and event text are rendered using text nodes, not HTML interpolation.
29. The module makes no network requests; traces and notes are not uploaded.
30. Automated smoke checks validate the frame contract, metric calculations, comparisons, archive limits, CSV safety and production route.

## Data contract and limits

- Script: `/games/cascade-lab/trajectory-xray.js?v=0.22.0`
- Run-summary field: `trajectory`
- Archive schema: `osgard.cascade-lab.trajectory-xray.v1`
- Maximum archive: 18 runs, 600 KiB, 420 frames per run.
- Trace signature prefix: `TX22-`; this is a compact FNV-1a checksum, not a security credential.
- Each trajectory frame is a recorded snapshot. Sparse-sample distance is an estimate along the lines between stored points, not exact physical path length.
- The plots visualise an in-game simulation; they are not certified engineering measurements or a new simulation pass.

## QA and release

Run `npm run qa:cascade-lab-trajectory-xray` for the dedicated pure-logic smoke test. The game-detail QA chain, OSGARD PLAY pull-request gate and direct deployment workflow also include the new module. The production route matrix verifies the versioned game shell and the public JavaScript asset.

Merge to `master` triggers the direct frontend deployment workflow. A release is considered published only after the archive checksum, activation, route matrix and mobile/desktop checks pass.
