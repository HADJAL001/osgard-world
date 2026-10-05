# Production deployment

1. Point these Namecheap records to `207.180.248.95`:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `207.180.248.95` | Automatic |
| A | `www` | `207.180.248.95` | Automatic |

2. On the server, copy this directory to `/opt/osgard-world`, the SWARM source to `/opt/swarm-mvp`, and the REMIX backend source to `/opt/remix/backend`, then run:

```sh
docker compose -f docker-compose.production.yml up -d --build
```

3. Add `osgard.world` and `www.osgard.world` to the existing reverse proxy, forwarding to `127.0.0.1:4189`. Issue TLS certificates after DNS propagation.

4. Verify desktop and mobile interaction, all product links, `https://t.me/OSGARD_world_bot`, and the TimeCoin Rules page.

5. REMIX browser matches use the same origin endpoint `https://osgard.world/api/remix`. The compose stack starts the API and Nginx proxies `/api/remix/` to it.

6. SWARM is served at `https://osgard.world/games/swarm/`. Its same-origin `/rooms`, `/health`, `/ready`, `/metrics`, `/matches`, and `/players` requests are proxied to the authoritative `swarm-api` container; WebSocket and SSE upgrades use the same route. The worker is configured with an explicit browser origin allowlist.

The OSGARD production build runs `npm run sync:swarm` first, copying `index.html`, `game.js`, and `styles.css` from the sibling `/opt/swarm-mvp` source. Keep both source directories present on the build host so the portal cannot silently ship a stale SWARM client.

## Safe frontend replacement

Before replacing the running frontend, build and verify the complete archive locally:

```sh
npm run qa:release
tar -tzf osgard-world-dist.tgz >/tmp/osgard-world-files.txt
grep -Fx 'index.html' /tmp/osgard-world-files.txt
grep -E '^assets/.+\.(js|css)$' /tmp/osgard-world-files.txt
```

On the server, upload to a new staging directory and validate the archive there. Do not empty the active serving directory before extraction. Only after the archive listing, byte count, and SHA-256 match the local `release-manifest.json` should the container's document-root reference be switched to the staging directory. Keep the previous validated directory until the route matrix and container health check pass; if either check fails, switch back to the previous directory and restart the container.

The release gate is source-side evidence. A successful local build does not by itself prove that the new bundle is serving on `https://osgard.world`; record the remote container status and route-matrix result in `docs/OSGARD_EXECUTION_LOG.md` for every runtime publication.

The resumable publisher is `scripts/publish-frontend-resumable.ps1`. It uploads 64 KB chunks with retries, verifies the remote archive byte count and SHA-256, and stages without activation by default:

```powershell
./scripts/publish-frontend-resumable.ps1
```

Use `-Activate` only after reviewing the verified staging output. The activation path keeps a rollback copy inside the container and restores it if the public root health check fails.

GitHub also contains a manual `OSGARD frontend deploy` workflow. It requires repository secrets `OSGARD_DEPLOY_HOST`, `OSGARD_DEPLOY_USER`, and a dedicated least-privilege `OSGARD_DEPLOY_KEY`. Do not reuse a personal root key; the workflow is intentionally manual until that dedicated key is provisioned.

Do not direct production traffic to the server until the reverse proxy has a valid TLS certificate.
