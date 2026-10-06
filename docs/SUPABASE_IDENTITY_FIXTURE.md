# Supabase identity fixture

This runbook defines the safe evidence path for authenticated API checks without storing a Supabase secret in the repository.

## Local contract fixture

The API smoke test starts with `OSGARD_AUTH_TEST_TOKEN=test-player-token` and uses bearer tokens `test-player-token` and `test-player-token-2`. The API accepts these identities only when that environment variable is explicitly present. Production does not set it, so production requests continue through Supabase `/auth/v1/user` validation.

Run from `osgard-game-api`:

```text
python test_api.py
```

Expected output:

```text
OSGARD_GAME_API_SMOKE_OK
```

## Supabase-backed fixture

The production project `OSGARD SEVEN` now contains the two named non-privileged fixture users provisioned through the dashboard invitation flow. For a staging or production-like check, obtain short-lived access tokens through the approved Supabase Auth flow and provide those tokens to the browser session only through local environment tooling. Do not place tokens in source, archives, screenshots, logs, or this document. The request contract is:

```text
Authorization: Bearer <access-token>
```

Verify `/api/v1/player/profile`, `/api/v1/player/sessions`, and `/api/v1/player/events` with the fixture identities, then revoke or delete the test users according to the project retention policy.

The repository probe performs the first two safe checks without persisting the token. Set both values only in the local shell or an approved CI secret store, then run:

```text
OSGARD_PRODUCTION_API_BASE=<backend-base-url> OSGARD_PRODUCTION_BEARER_TOKEN=<short-lived-token> npm run qa:production-api
```

The command checks `/health/ready` and the authenticated profile route. It prints status metadata only; never place the token in a command transcript, screenshot, archive, source file, or chat. Without both variables it exits with an explicit `skipped` result.

## Evidence boundary

The repository proves the local contract fixture and production Supabase environment wiring. Pass 143 records dashboard evidence for both production fixture identities without recording secrets. Token issuance, authenticated API verification, and revocation still require a local operator workflow and must never expose credentials in source, archives, screenshots, logs, or chat.
