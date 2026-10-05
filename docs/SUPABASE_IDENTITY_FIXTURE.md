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

For a staging or production-like check, create two non-privileged users in the Supabase project, obtain short-lived access tokens through the approved Supabase Auth flow, and provide those tokens to the browser session only through local environment tooling. Do not place tokens in source, archives, screenshots, logs, or this document. The request contract is:

```text
Authorization: Bearer <access-token>
```

Verify `/api/v1/player/profile`, `/api/v1/player/sessions`, and `/api/v1/player/events` with the fixture identities, then revoke or delete the test users according to the project retention policy.

## Evidence boundary

The repository proves the local contract fixture and production Supabase environment wiring. Actual Supabase user creation, token issuance, and revocation require project-owner access and must be recorded externally without exposing credentials.
