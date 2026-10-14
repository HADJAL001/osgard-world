# CASCADE LAB 0.19.0 — Engineering OS

## Release intent

Keep the real-time physics game, six construction devices, level objectives, Delta Lens (0.17) and Hypothesis Lab (0.18). Add an explicit run-summary contract and a local engineering workstation around the results. This release does not change the physics equations or claim that the prototype is a validated engineering simulator.

## Thirty improvements in this release

1. A versioned `cascade-lab:run-finished` event exposes the completed run to local tools.
2. A bounded diagnostic classifies known failure patterns instead of showing only a generic retry message.
3. Closed-gate detection checks both the gate state and the presence of a switch.
4. Missed-checkpoint diagnosis names the unvisited objective when the engine identifies one.
5. Fragile-cargo diagnosis cites the recorded impact speed and the in-game damage threshold.
6. Off-track diagnosis shows the final position and velocity vector when available.
7. Timeout diagnosis reports elapsed simulation time against its game limit.
8. Successful runs get an optimisation path that starts from a verified baseline.
9. Evidence is taken from reason codes and physics telemetry, not invented narration.
10. The last four engine events are shown with their elapsed timestamps.
11. Diagnostic confidence is visibly labelled high, medium or low.
12. Observations and hypotheses occupy separate interface areas.
13. Every suggested next step asks for one controlled change rather than a broad rebuild.
14. Run duration is shown as a persistent summary metric.
15. Device count is shown beside the level's par where the data exists.
16. Peak speed is retained and displayed.
17. Last registered impact speed is retained and displayed.
18. Prior results are compared only when they belong to the same level.
19. Outcome changes are labelled as success/failure observations, not causes.
20. Time delta from the prior run is displayed.
21. Device-count delta from the prior run is displayed.
22. Activation and travelled-distance deltas are included in the comparison.
23. The notebook records whether the player performed a control run.
24. It records whether only one variable was intentionally changed.
25. It records whether the outcome and measurements were noted.
26. The player's own hypothesis can be edited for each run.
27. The next-test instructions can be edited for each run.
28. A bounded free-text note can record confounders and observations.
29. The archive has search and success/failure filters.
30. A local archive can be exported as JSON or CSV, and JSON can be imported only after schema, size, record-count and duplicate-ID checks.

The notebook also uses a responsive layout, visible keyboard focus, reduced-motion styling, accessible status messaging and text-safe DOM rendering.

## Data and privacy contract

- Archive key: `osgard.cascade-lab.engineering-suite.v1`.
- Maximum saved attempts: 50.
- Maximum imported JSON file: 200 KiB.
- No account ID, email, name or share code is added by the Engineering OS archive.
- The module does not call a network endpoint. Runs and notes stay in the browser's local storage; browser storage can be cleared by the user or browser settings.
- Import merges validated runs and rejects unknown schemas, malformed records, repeated IDs, oversized archives and archives exceeding the record cap.
- CSV and JSON exports are initiated only by the player's explicit click.

## Diagnostic limits

The module reads the game's own simulated telemetry. A time delta, event sequence, or last-active device is not proof of causality. The UI explicitly separates observed evidence from a hypothesis and instructs the player to make one change at a time. A saved checkbox records the player's declaration; the app cannot verify that only one construction variable actually changed.

## Release and verification

- Game entry: `/games/cascade-lab/`.
- New static module: `/games/cascade-lab/engineering-suite.js?v=0.19.0`.
- Test command: `npm run qa:cascade-lab-engineering`.
- Compatibility tests also cover the existing Delta Lens, experiment ledger, Hypothesis Lab, game detail page and Games catalogue.
- The direct production workflow packages the frontend, checks the archive checksum, activates the release with rollback support, then checks desktop/mobile routes against the expected build before marking the release ready.
