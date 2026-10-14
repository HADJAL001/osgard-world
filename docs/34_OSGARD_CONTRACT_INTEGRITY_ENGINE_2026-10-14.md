# OSGARD Contract Integrity Engine

Date: 14 October 2026

## Purpose

The OSGARD product registry is distributed across the TypeScript manifest, static catalogue, JSON-LD, browser diagnostics, player launcher, post-session recommendation graph, invitation allow-list, contextual recommendations, generated share cards, production route matrix and XML sitemap. Individually green tests can still miss drift between those surfaces.

Run `npm run qa:contracts`. The network-free command regenerates the share-card assets, checks the cross-surface contracts and executes a regression against the real catalogue-state normalizer. It writes `osgard-contract-audit.json` with stable check IDs, actionable missing/extra IDs or routes, summary counts and a SHA-256 fingerprint of normalized product contracts.

The catalogue regression checks 12 IDs and a 120-ID input. The allowed number of selected games scales with the live allow-list and stays capped at 100, preventing new games from being silently dropped after an old hard-coded limit.

## What is covered

- Unique, well-formed world, game and event IDs in the core manifest.
- Exact game identity set across catalogue cards, JSON-LD, diagnostics, launcher, post-session map, referral allow-list, share-card generator and contextual recommendation graph.
- No invalid, duplicated, or self-referential recommendation edges.
- Production route matrix coverage for every game launch URL and each diagnostic route.
- Canonical sitemap URL for every registered game.
- Presence and dimensions of each generated 1200×630 share-card PNG.
- Dynamic share-selection/favorites limits instead of a stale eleven-game cap.
- Default-deny analytics consent and browser diagnostics that do not transmit reports.

## Release integration

Release workflows must run `npm run qa:contracts` before building and running `npm run preflight:frontend`. The preflight's `release-manifest.json` binds the exact contract-report SHA-256 and normalized contract fingerprint to the file inventory. `npm run release:verify` rechecks both the public artifact and the current contract report. A missing, blocked or edited report fails closed.

The optional OpenAI review accepts only allow-listed JSON reports and sends minimized summaries, never source files, raw logs, credentials or player records. It is manual opt-in; deterministic failures always force a `hold` recommendation and human review remains mandatory.

## Adding a game

Add the new game to `src/core/manifest.ts`, then add the matching catalogue card/JSON-LD entry, diagnostic route, launcher record, post-session map, referral entry, recommendation metadata, share-card metadata, route-matrix probe and sitemap URL. The audit should fail with a specific missing/extra list if a derivative is forgotten.

## Safety boundary

The audit is deterministic and makes no network requests. It is not a live uptime test, a cryptographic signature, or a replacement for post-deployment route probes and manual browser/device QA. The SHA-256 fingerprint proves content consistency only; release identity still depends on the immutable Git commit and trusted CI record.
