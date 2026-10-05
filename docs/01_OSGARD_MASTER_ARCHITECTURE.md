# OSGARD 2.0 Master Architecture

This document is the implementation-facing architecture package required by the OSGARD brief. It describes the current modular monolith and the boundaries that may later be extracted into services.

## Runtime Shape

```text
OSGARD WORLD (React/Vite portal)
  |-- CORE manifest, event queue, recommendations, archive
  |-- PLAY: TIME, SWARM, NULL//SHIFT, INHERIT, REMIX surfaces
  |-- BUSINESS / CREATE / MOBILITY / MEDIA / MARCOSA
  |
  +--> osgard-game-api (authenticated SQLite persistence)
         |-- profile and event ledger
         |-- result/replay envelopes and leaderboard
         |-- moderation reports, review state, audit trail
         +-- analytics summary/export/cohort/snapshot read models

SWARM authoritative room service
  |-- room lifecycle, ready/start/rematch, reconnect
  +-- WebSocket state stream and match persistence
```

## Ownership Rules

- The portal owns presentation, local optimistic intent, and route composition.
- `osgard-game-api` owns authenticated player data, validated scores, replay/result records, moderation records, and aggregate analytics read models.
- SWARM owns authoritative multiplayer room state and simulation; the portal must not invent competitive state.
- Supabase bearer identity is the player boundary. Missing identity means guest/local-only behavior.
- SQLite volumes are persistent deployment state; replacing a container must not replace the data volume.

## Data Flow

1. A product emits a typed CORE event and writes the local bounded queue immediately.
2. Authenticated clients attempt idempotent event ingestion; pending events retry on later activity.
3. Game completion submits a validated non-negative score and optional `resultId`; duplicate retries are idempotent per player/game.
4. Server-backed profile, replay, moderation, and leaderboard reads remain authoritative over local projections.
5. Operator-only analytics endpoints expose aggregate counts, JSONL event counts, cohorts, and durable snapshots without player IDs.

## Extraction Boundaries

The current system intentionally avoids premature microservices. The first extraction candidates are SWARM workers, analytics warehouse ingestion, notifications, search, and moderation operations. Each extraction requires an explicit API contract, migration, observability, and rollback path.

## Production Gaps

The brief still requires provisioned identity federation, operator secret management, scheduled snapshot activation, warehouse retention/cohorts, cross-game moderation sanctions, media/community services, device lab evidence, and production team/process execution. These are tracked in `BRIEF_COVERAGE_AUDIT.md` and are not silently marked complete here.
