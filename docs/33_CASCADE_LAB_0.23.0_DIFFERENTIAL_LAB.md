# CASCADE LAB 0.23.0 — Differential Lab

## Purpose

Differential Lab extends the experiment tools introduced in 0.20–0.22. It compares the actual construction stored with two Trajectory X-Ray runs, reports changed device placement/rotation/additions/removals, checks whether the observed construction difference is a single localized edit, and groups repeated runs by exact layout signature.

This is a browser-based analysis layer. The physics solver is unchanged and is not represented as a validated engineering simulator.

## Capabilities

- Side-by-side blueprint views for the baseline and the variant, with changed device slots highlighted.
- Type-aware device matching. For multiple devices of the same type, a bounded minimum-cost assignment chooses the correspondence that minimizes total position/angle displacement. This is a matching heuristic, not a persistent device identity.
- Change list for moved, rotated, added and removed devices, with coordinates, distances and angles.
- Scenario guard: comparisons require the same level, mode and daily challenge date. A run cannot be compared with itself.
- Single-edit eligibility: a pair is only labelled a single edit when exactly one device operation and one change factor are detected. Multiple edits/factors remain visible instead of being collapsed to one explanation.
- Observed deltas for outcome, time, device count, peak speed, impact speed, activation count and average trajectory deviation.
- Repeatability atlas: same scenario + same exact normalized device layout; reports saved sample count, success rate, mean time, sample standard deviation and time range. Three or more samples are required before a descriptive stability label is shown.
- Explicit user-triggered JSON and CSV report exports. CSV cells that begin like spreadsheet formulas are prefixed safely.
- Local-first operation: reads the existing local Trajectory X-Ray archive and makes no network request. It does not create a second run archive or transmit private notes.

## Interpretation boundaries

Position changes of 2 pixels or less and angle changes of approximately 2 degrees or less are below the UI's practical display thresholds. Layout grouping uses an exact normalized canonical form, so the repeatability atlas may distinguish layouts whose changes are too small to display as separate operations in a pairwise comparison.

Short fingerprints use FNV-1a for convenient display/grouping only. They are not cryptographic digests, signatures, or provenance proofs.

A one-edit comparison is better controlled than a multi-edit comparison, but does not establish causation. Repeated runs describe only the locally saved sample and do not provide a population-level statistical proof. Reports set `causalClaim: false` and include the limitations.

## Verification

- Test command: `npm run qa:cascade-lab-differential`
- Integration: game detail and portal smoke tests, production route matrix and the direct deployment workflow.
- Route: `/games/cascade-lab/differential-lab.js`
- UI is loaded after Trajectory X-Ray so it consumes the current local archive and follows newly recorded runs.
