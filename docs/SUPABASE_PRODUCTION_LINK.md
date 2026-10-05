# Supabase production link

The production OSGARD game API is linked to the Supabase project through the server environment, not through a client-exposed secret.

Verified on 2026-10-06:

- `/etc/osgard-game-api.env` contains `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OSGARD_EMPIRE_DB`.
- `osgard-game-api` is `active`.
- `GET http://127.0.0.1:4317/health` returns `status: ok`.
- `GET http://127.0.0.1:4317/health/ready` returns `status: ready`, `authConfigured: true`, and `operatorConfigured: false` without exposing secret values.

The service uses the Supabase bearer-token validation endpoint for authenticated player requests. The anon key is never copied into frontend source or documentation.

Billing or plan changes are intentionally outside this technical deployment checklist. A payment requires an explicit amount, product, and confirmation immediately before charge.
