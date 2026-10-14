# OSGARD Contract Integrity Engine

Date: 14 October 2026

## Purpose

The OSGARD product registry is distributed across the TypeScript manifest, the static catalogue, browser diagnostics, player-launch routing, the post-game recommendation graph, referrals, generated share cards, the production route matrix, and the XML sitemap. Those surfaces can each be locally correct while the overall product becomes inconsistent.

scripts/osgard-contract-audit.mjs adds a deterministic, network-free release gate for those cross-surface contracts. It does not replace the existing game-specific smoke tests: it checks that they all describe the same product.

## What is checked

- Unique, valid world/game/event IDs in the core manifest.
- Exact equality of game identities across catalogue cards, structured-data ItemList, device diagnostics, player launcher, post-game continuation graph, invitation allow-list, image-card generator, and curated recommendations.
- Recommendation edges point to registered games, do not point back to the current game, and have no duplicates.
- ItemList totals and game launch URLs align with the manifest.
- Every manifest launch URL and diagnostic route is explicitly probed by the production route matrix.
- Every launch route is represented in the XML sitemap.
- Generated per-game share cards exist and have a valid PNG signature and 1200×630 dimensions.
- The catalogue's shared-selection/favorites cap is derived from the live allowed-ID set, not frozen at eleven forever.
- The event queue remains default-deny and diagnostics stay local-only.

## Commands and output

Run:

    npm run qa:contracts

The command explicitly regenerates the 1200×630 share-card PNGs from their versioned source, then writes osgard-contract-audit.json and exits non-zero on a failed contract. The current source contains 33 stable contract assertions, including source-surface equality, consent boundaries, SEO and production-route coverage. A separate regression check runs the actual catalogue-state normalizer with 12 and 120 IDs to prove that future games are not silently truncated. The JSON report includes stable check IDs, actionable missing/extra IDs or routes, counts and a SHA-256 fingerprint of the normalized product contract. The fingerprint excludes generated time and other volatile fields, so it can be compared across builds. Override the output path with OSGARD_CONTRACT_REPORT.

The audit makes no network requests and emits no player data. CI uploads the report as a build artifact, allowing a release reviewer to inspect what was checked.

## Adding a game

Add the new game to src/core/manifest.ts first. Then update its catalogue card, diagnostic route, player-launch record, post-game recommendation graph, referral allow-list, contextual recommendation graph, share-card generator and production route matrix. Provide the generated 1200×630 PNG and a discoverable sitemap URL. The audit intentionally fails when a new game exists in only some of these places; it is a release contract, not a reminder document.

A new route should not be considered production-ready merely because the catalogue button exists. It needs to be probeable by the route matrix and discoverable in the sitemap too.

## Safety boundary

This engine audits source/build contracts, not the live site's uptime or authenticated behavior. A ready result is evidence that these source surfaces are internally consistent. After deployment, the existing remote production route matrix and manual device QA remain necessary.
