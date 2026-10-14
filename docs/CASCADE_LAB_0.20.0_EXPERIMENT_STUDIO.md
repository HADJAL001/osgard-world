# CASCADE LAB 0.20.0 — Experiment Studio

## What changes

0.20.0 adds a structured, local-first experiment notebook on top of CASCADE LAB 0.19.0 Engineering OS, 0.18.0 Hypothesis Lab and 0.17.0 Delta Lens. It does not replace the game physics, levels, intermission showcase or the earlier diagnostics layers.

A player can create a study from a real baseline run, select one variable, define a goal and expected direction, write a falsifiable hypothesis and the planned change, then collect up to five observations from later runs of the same protocol and mode.

The studio provides same-level/mode metric comparison, notes, search and status, a bounded local archive of up to 40 studies, explicit JSON/CSV exports, schema-validated JSON import, duplicate-ID checks and share-intent links for a short summary. Share links never include the full experiment archive or private notes.

## Boundaries

- Studies, notes and comparison records stay in the local browser unless the player explicitly exports a file.
- The module does not call fetch, XMLHttpRequest or sendBeacon.
- Import is limited to 512 KiB. Archive size is bounded to 40 studies; each study can carry up to five observations.
- The game only matches subsequent observations to the same game protocol and mode. It does not prove that the player actually changed only one variable.
- Differences in outcome, time, grade or device count are observations, not proof of causality or scientific validation.
- Social share-intent buttons open a prepared share destination; they do not publish automatically and do not verify that a post was made.
- No ad network, payment processing, subscription billing or cash payout is added.

## Acceptance

The 0.20.0 static contract is checked by `npm run qa:cascade-lab-experiment-studio`, `npm run qa:games-detail`, the game catalogue smoke test and the production route matrix. The release is only considered publicly deployed after the frontend deployment and route verification succeed.
