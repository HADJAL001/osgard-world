# OSGARD Production Release Handoff

## Ownership matrix

| Area | Owner role | Required evidence | Release gate |
|---|---|---|---|
| Product and narrative | Game Director / Narrative Director | brief coverage and season notes | audit updated |
| Frontend | Technical Director | build artifact and route matrix | `npm run qa:release` |
| API and data | Backend owner | smoke test, health, migration note | API health + smoke |
| Moderation | Trust & Safety operator | reports, sanctions audit | operator token provisioned |
| Infrastructure | DevOps/SRE | backup, rollback archive, service status | deploy checklist |
| QA | QA lead | viewport/device evidence | route gate + screenshots |
| Community | Community manager | clubs/friends/re-engagement checks | authenticated fixtures |

## Release sequence

1. Run `npm ci` and `npm run qa:release`.
2. Attach `release-readiness.json` and device-lab evidence.
3. Publish the frontend archive or backend archive only after checksum/compile validation.
4. Check production health and the route matrix.
5. Record the pass in `docs/OSGARD_EXECUTION_LOG.md`.

## Rollback

Keep the previous validated archive until the route matrix and health checks pass. If either fails, restore the previous archive and record the failure; do not leave a partial extraction active.
