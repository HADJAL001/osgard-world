# OSGARD PLAY service API v1

All endpoints require an authenticated OSGARD session in production. Request bodies are validated server-side. IDs are opaque strings. Responses include `schemaVersion: 1`.

## Core

`POST /auth/login` · `GET /profile` · `GET /friends` · `POST /friends` · `GET /archive` · `GET /replays`.

## TIME

`GET /time/world` · `POST /time/build` · `POST /time/decision` · `GET /time/city` · `GET /time/senate` · `POST /time/bill` · `GET /time/election`.

## SWARM

`POST /swarm/match` · `POST /swarm/join` · `POST /swarm/ready` · `POST /swarm/action` · `GET /swarm/session` · `POST /swarm/reconnect`.

## NULL//SHIFT

`POST /null/contract` · `GET /null/facility` · `POST /null/action` · `POST /null/hack` · `POST /null/shift` · `POST /null/extract`.

## INHERIT

`GET /inherit/family` · `POST /inherit/action` · `GET /inherit/characters` · `POST /inherit/marriage` · `POST /inherit/child` · `POST /inherit/inheritance` · `GET /inherit/archive`.

## REMIX

`POST /remix/challenge` · `POST /remix/validate` · `POST /remix/publish` · `POST /remix/play` · `POST /remix/submit` · `GET /remix/leaderboard` · `POST /remix/remix`.

## Replay contract

Replay submissions contain `seed`, ordered `inputs`, state checkpoints, game version, and a hash. Video is an optional derivative, never the authoritative record.

