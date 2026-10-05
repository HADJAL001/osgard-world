# OSGARD CORE Session API

The session contract gives every PLAY surface one lifecycle for authenticated players. Guests continue to use local state without blocking the game.

## Start

`POST /api/v1/player/sessions`

```json
{"gameId":"time","payload":{"surface":"time"}}
```

The server validates `gameId` and payload size, assigns an opaque `sessionId`, and returns `status: active`.

## Complete

`POST /api/v1/player/sessions/:sessionId/complete`

Completion is owner-bound and idempotency-safe: an active session can transition once to `completed`; later transitions return a conflict.

## History

`GET /api/v1/player/sessions?gameId=time`

The response is limited to the authenticated player and can be filtered by game. Stored payloads contain game-specific evidence, not credentials or secrets.

## Surfaces

TIME, SWARM, NULL//SHIFT, INHERIT, and REMIX all call the typed frontend adapter. Session writes are best-effort so network failure never prevents guest or offline play.
