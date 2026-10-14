# CASCADE LAB 0.27.0 — Reliability Atlas

## Why this release exists

CASCADE LAB already has an experiment ledger, Hypothesis Lab, Experiment Studio, Trajectory X-Ray, Adaptive Mission Director and Evidence Integrity. Reliability Atlas adds a separate question: *does the same construction keep producing a similar outcome when it is repeated?*

## What it measures

- A cohort key combines the level, play mode, daily challenge date where applicable, and a canonical, sorted list of devices with rounded position and angle. Reordering a list of devices does not create a new cohort; moving or rotating a device does.
- Every completed run stores at most 41 evenly sampled trajectory frames for the repeatability view, alongside the outcome, duration, device count, grade and a bounded event summary.
- Delivery rate is shown as successes / attempts and a 95% Wilson interval. A small sample should produce a wide interval, rather than implying certainty.
- Timing variation is reported as median, range and population standard deviation.
- Trajectory variation is reported as the mean, 95th percentile and maximum distance from each normalized-position centroid across runs in the same cohort.
- The display marks samples under three runs as exploratory and samples under eight as early. These are interface guidance bands, not scientific certification.
- If identical construction records show mixed results, the suggested action is to repeat without edits and inspect mode/context and the event timeline before changing the design.

## Archive and offline behavior

- Local storage schema: `osgard.cascade-lab.reliability-atlas-archive.v1`.
- Maximum archive size: 50 attempts.
- Maximum JSON import: 400 KiB.
- Imports are rejected for unknown schema, invalid or incomplete trajectories, invalid modes/levels, duplicated IDs, more than 50 records or oversized input.
- CSV fields beginning with spreadsheet formula characters are prefixed with an apostrophe before quoting.
- The module reads existing Trajectory X-Ray runs when available and uses the matching run ID for the same completed event, avoiding duplicate copies of the same trial.
- No network API is called. The atlas is local to the browser/device and can be exported manually. Clearing this atlas does not delete Trajectory X-Ray's archive.

## Statistical limits

The Wilson interval describes uncertainty around the observed delivery proportion; it does not guarantee future success. The path-spread statistic is a descriptive measure of stored screen-space trajectories, not a certified physical tolerance. Exact-blueprint grouping does not control unknown factors outside the recorded game state. A repeatable association is not proof of causality or evidence that the game physics model is suitable for real engineering work.

## Release verification

- Game version: `0.27.0-reliability-atlas`.
- Module: `/games/cascade-lab/reliability-atlas.js?v=0.27.0`.
- Offline cache: `osgard-cascade-lab-shell-v0.27.0`.
- Test command: `npm run qa:cascade-lab-reliability-atlas`.
- The full game-detail suite also runs the Reliability Atlas test and PWA pre-cache checks. The production route matrix checks the exact page version, module schema, content type and local-only boundary before the direct deployment can be considered verified.
