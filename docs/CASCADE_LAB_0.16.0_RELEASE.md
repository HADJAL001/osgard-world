# CASCADE LAB 0.16.0 — Experiment Dossier

Date: 2026-10-14  
Repository: `HADJAL001/osgard-world`  
Release route: `https://osgard.world/games/cascade-lab/`

## Baseline

The repository's pre-release game was CASCADE LAB 0.15.0 (experiment ledger). This release preserves the existing game's catalogue integration, levels, local progress, daily challenges, duel/share flows, telemetry, CSV export, cosmetics and post-game recommendations. It does not replace the current game with the older local 0.11.0 package.

## Added in 0.16.0

- A `↓ JSON` control in the live telemetry panel.
- Local experiment dossier schema `osgard.cascade-lab-experiment-dossier/v1`.
- Setup capture including a portable arrangement share code.
- Current physics state, summary measures, up to 240 retained samples and up to 64 retained physics events.
- Explicit bounds and flags indicating when the sample buffer is saturated.
- Privacy declaration: file download only; no account identifier; no telemetry upload by the exporter.
- Correct top-level version metadata and local-growth report version.
- A repository smoke test wired into the production deployment workflow.

## Verification contract

CI must pass `npm run qa:cascade-lab-dossier`, existing frontend checks, the game hub and game detail smoke tests, game-assets checks, build/preflight, and the production route matrix. A green source build alone is not sufficient to claim the public release; use the deployment run plus public route checks.

The dossier is a snapshot of the current bounded telemetry buffers. Its arrangement code allows reproducing a setup, but it does not promise bit-identical deterministic physics across browsers. Data is downloaded locally and is not uploaded by this feature.

## Not activated by this release

This change does not enable an ad network, paid reward video, live payments, subscription billing or remote telemetry collection. Those require separate provider configuration and consent/security review.
