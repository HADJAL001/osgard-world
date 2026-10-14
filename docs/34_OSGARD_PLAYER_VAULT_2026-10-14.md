# OSGARD PLAYER VAULT — design and rollout notes

**Feature version:** 1.0.0  
**Route:** /games/vault/  
**Implementation:** static HTML + vanilla JavaScript; no API or new dependency  
**Status:** feature branch; production use begins only after PR checks, merge and deploy

## Why this exists

OSGARD PLAY already stores a small amount of progress locally in different game worlds. Without an explicit export/restore route, a player who changes browser or device can lose that local state. PLAYER VAULT adds a user-controlled, offline-capable transfer workflow instead of claiming that all game worlds already have account-wide cloud saves.

## What's included

- Premium responsive PLAYER VAULT page linked from the Games header, hero actions and footer.
- Strict allow-list adapters for:
  - catalog favorites (osgard.games.favorites.v1);
  - the local INHERIT world (inherit-world-v1), author label, journey flags and last-passed generation;
  - SIGNAL RUN daily streak and valid date-specific best scores.
- JSON export with schemaVersion: 1, creation time and SHA-256 integrity checksum.
- Import preview before storage mutation; file, schema, record ID, known storage key, size, date, score, scene-tool and coordinate validation.
- Automatic back-up-before-restore gate when supported local records already exist. The current record signature is rechecked before restore to prevent using a stale backup acknowledgement.
- Rollback attempt if writing a supported record fails partway through.
- Local/offline cache integration with a new service-worker shell version.
- Smoke tests and production route contracts.

## Strict boundaries

This is a **portable local backup**, not cloud sync and not a universal save importer. The supported adapters are intentionally fewer than the 11-game catalogue. Games using other keys, IndexedDB, a remote world API, or their own server save format are not automatically included.

The tool never reads values for non-allow-listed local-storage keys. It does not read sessionStorage at all. Authentication tokens, analytics consent and queues, referral codes, payment information, external API configuration, and unknown keys are excluded. Restore only writes approved keys present in the validated file; it does not delete unrelated or missing keys.

INHERIT state is normalized to a fixed shape. Trace tool IDs must be from the four known tools, coordinates are bounded, and user-entered strings have markup delimiters stripped before restore. This is important because INHERIT currently renders parts of its local world history into the DOM.

## File integrity and privacy

- Files are standard JSON, **not encrypted**. They can contain the local world, player-selected author label, and local progress values. Treat them as personal files and do not publish them openly.
- SHA-256 detects accidental corruption when opening a backup. It is not a digital signature, does not prove who created the file, and does not protect against a person who deliberately edits data and recomputes the checksum.
- The page sends no requests to analytics, Commerce API, ad networks, or a cloud backup service. No tracking event is emitted by this tool.
- Revalidate all restored data at the point where the game consumes it; the Vault is a portability layer, not an authorization boundary or a server anti-cheat mechanism.

## User flow

1. Open https://osgard.world/games/vault/ on the source device.
2. Download the current JSON backup.
3. Transfer the file using a method the player trusts.
4. Open the Vault on the destination device and select the file.
5. Review the supported records. If this device already has supported progress, download its current backup first.
6. Confirm restore. Reload each affected game to read the restored state.

A game with an open tab may not reflect storage writes until reload. Remote/shared INHERIT generations are not changed by the Vault.

## QA contract

Run:

- npm run qa:player-vault — allow-list, checksum, malicious-value normalization, unsupported key rejection, duplicate rejection, size limit and supported-record serialization.
- npm run qa:games-portal — catalog integration regression.
- npm run qa:production-routes — after deploy, verify the Vault page and its two runtime assets from desktop and mobile request profiles.
- the full OSGARD Games pull-request quality gate workflow.

## Rollout

The PR must pass GitHub Actions before merge. The existing frontend deployment workflow may publish it after merge; this change itself does not deploy to production or turn on monetization. After deploy, test a round-trip with a disposable test browser profile, then verify that an unsupported key such as osgard.auth.accessToken is unchanged and absent from the exported file.

## Follow-up path

Add further game adapters only after auditing the actual save schema, migration behavior, XSS surfaces and size limits of each game. For cross-device automatic sync, implement a separate authenticated backend contract with server-side access controls and user-controlled deletion; do not silently turn this local export into cloud collection.
