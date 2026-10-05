# OSGARD Player Data API v1

The `osgard-game-api` service is the server-authoritative persistence boundary for player data. Every route requires a Supabase bearer token; the token subject is the only player key accepted by the service.

| Method | Route | Payload | Purpose |
|---|---|---|---|
| GET | `/api/v1/player/profile` | - | Read the current profile document |
| POST | `/api/v1/player/profile` | `{ "profile": object }` | Replace the versioned profile document |
| GET | `/api/v1/player/events` | - | Read the latest 100 immutable CORE events |
| POST | `/api/v1/player/events` | `{ "event": { "name": string, "payload"?: object } }` | Append an authenticated CORE event |
| POST | `/api/v1/player/results` | `{ "gameId": string, "payload": object }` | Append a result envelope |
| GET | `/api/v1/player/results?gameId=media-clip&limit=50` | - | Read the authenticated player's recent results/drafts |
| POST | `/api/v1/player/replays` | `{ "gameId": string, "payload": object }` | Append a replay envelope |
| GET | `/api/v1/player/replays?gameId=remix&limit=50` | - | Read the authenticated player's replay archive |
| GET | `/api/v1/leaderboards/:gameId` | - | Return deterministic top-100 score ranking |
| POST | `/api/v1/moderation/reports` | `{ "subjectId": string, "reason": string, "note"?: string, "roomId"?: string }` | Create a moderation report |
| GET | `/api/v1/moderation/reports?status=open&limit=50&offset=0` | `X-Moderation-Token` header | List reports for operators |
| POST | `/api/v1/moderation/reports/:reportId/status` | `{ "status": "open"|"reviewing"|"resolved"|"dismissed" }` + operator token | Update report review state |
| GET | `/api/v1/moderation/audit/:reportId` | operator token | Read immutable report action history |
| GET | `/api/v1/analytics/summary?from=epochMs&to=epochMs` | `X-Moderation-Token` header | Read bounded ledger aggregates for liveops |
| GET | `/api/v1/analytics/export?from=epochMs&to=epochMs` | `X-Moderation-Token` header | Export anonymized event counts as JSONL |
| GET | `/api/v1/analytics/cohorts` | `X-Moderation-Token` header | Read bounded first-seen cohort activity aggregates |
| POST | `/api/v1/analytics/snapshots` | `X-Moderation-Token` header | Persist current aggregate snapshot |
| GET | `/api/v1/analytics/snapshots` | `X-Moderation-Token` header | Read latest 100 persisted snapshots |

Responses include server timestamps and generated IDs. SQLite is mounted at `/var/lib/osgard-game-api` in production-compose, so container replacement does not remove player data. Invalid JSON, unauthenticated requests, and malformed contracts are rejected without writes.

Result writes require a finite non-negative numeric `payload.score`. Leaderboard ties are ordered by score descending, creation time ascending, then player ID; this makes rank generation deterministic.

Moderation reports accept only `harassment`, `cheating`, `spam`, `unsafe_content`, or `other`; notes are capped at 1000 characters and begin in `open` status. Review tooling and escalation policy are separate operational work.

The review routes require `MODERATION_ADMIN_TOKEN`, compared through the `X-Moderation-Token` header. Deployments must provision a strong secret outside source control. Listing is bounded to 100 rows per request; legal escalation, sanctions, and reviewer identity/audit history are not implemented by this endpoint.

Every report creation and status change appends an immutable audit event. The current lightweight adapter records the operator actor as `operator`; production identity federation should replace that value with the verified operator subject.

`osgard-game-api/test_api.py` is the repeatable smoke gate for startup and anonymous-access rejection; it uses a temporary database and never touches production data.

The portal `/profile` surface uses the API when `localStorage.osgard.auth.accessToken` exists, and retains its local CORE-event fallback for guests or unavailable API responses.

Event ingestion accepts an event name up to 80 characters and an 8 KB JSON envelope. The shared frontend `syncPlayerEvent` adapter is optional and never sends without a bearer token.

When an event includes a client `id`, ingestion uses it as an idempotency key scoped to the authenticated player; retries return `duplicate: true` instead of inserting a second row.

Result envelopes with `payload.resultId` are likewise idempotent per player and game; a replayed submission returns the original result ID with `duplicate: true`.

The analytics summary exposes only aggregate counts (events, distinct players, results, games, reports, and open reports) and is operator-token protected. The optional window is capped at 366 days. It is a read-model precursor to a full warehouse, not a replacement for retention/cohort pipelines.

The export endpoint emits only `eventName` and `count` JSONL rows, never player IDs; it uses the same one-year window cap and operator token.

The cohort endpoint groups up to 10,000 players by first-seen UTC day and returns player count plus aggregate active-day totals; it does not expose identities. It is an initial read model, not a full retention warehouse.

Snapshots are stored in SQLite with capture timestamps and aggregate payloads. Scheduling remains an operational responsibility; the endpoint is safe to call from a cron/systemd timer.

The repository includes `osgard-analytics-snapshot.service` and `.timer` units. Installation is an operator action; the units read `MODERATION_ADMIN_TOKEN` from `/etc/osgard-game-api.env` and never embed the secret.

Use `install-analytics-snapshot.sh /etc/osgard-game-api.env` to validate the secret before installing and enabling the timer. The script exits without changes when the token is absent.

The shared `submitPlayerResult(gameId, payload)` adapter is available for authenticated game result surfaces and returns `false` without a token, preserving guest play.

The published result screen uses this adapter for the NULL//SHIFT result envelope (`gameId: null-shift`, score, result ID, and mode) once per result ID.

The MEDIA creator flow uses the same authenticated result boundary for `gameId: media-clip`, with format/title metadata and `status: draft`; guests continue with local draft confirmation only.

Result listing is player-scoped, bounded to 100 rows, and can filter by game ID; it never exposes another player's payload.

Replay listing follows the same player-scoped, bounded contract and is the read-back surface for creator replay/clip tooling.

The frontend `listPlayerReplays(gameId?)` adapter consumes this route and returns an empty list for guests or unavailable APIs.

This pass provides the persistence boundary and storage contract. Leaderboard aggregation, moderation, multiplayer sessions, and warehouse analytics remain separate services and are intentionally not claimed as complete here.
