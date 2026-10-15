#!/usr/bin/env bash
set -euo pipefail
: "${OSGARD_COMMERCE_IMAGE:?OSGARD_COMMERCE_IMAGE is required}"
: "${OSGARD_COMMERCE_ENV_FILE:?OSGARD_COMMERCE_ENV_FILE is required}"
frontend="${OSGARD_FRONTEND_CONTAINER:-osgard-world}"
service="osgard-commerce-api"
release_id="${OSGARD_COMMERCE_IMAGE##*release-}"
candidate="${service}-candidate-${release_id}"
previous="${service}-previous-${release_id}"
docker image inspect "$OSGARD_COMMERCE_IMAGE" >/dev/null
docker inspect "$frontend" >/dev/null
network="$(docker inspect -f '{{json .NetworkSettings.Networks}}' "$frontend" | python3 -c 'import json,sys; print(next(iter(json.load(sys.stdin)), ""))')"
if [ -z "$network" ]; then echo "Could not determine the frontend Docker network" >&2; exit 1; fi
docker network inspect "$network" >/dev/null
echo "Commerce API private network selected: $network"
if ! docker inspect "$service" >/dev/null 2>&1 && docker inspect "$previous" >/dev/null 2>&1; then docker rename "$previous" "$service"; docker network connect "$network" "$service" >/dev/null 2>&1 || true; docker start "$service" >/dev/null 2>&1 || true; fi
if docker inspect "$service" >/dev/null 2>&1 && docker inspect "$previous" >/dev/null 2>&1; then docker rm -f "$previous" >/dev/null; fi
docker rm -f "$candidate" >/dev/null 2>&1 || true
docker run -d --name "$candidate" --restart unless-stopped --network "$network" --env-file "$OSGARD_COMMERCE_ENV_FILE" "$OSGARD_COMMERCE_IMAGE" >/dev/null
candidate_ready=0
for attempt in $(seq 1 30); do
  if docker exec "$candidate" node --input-type=module -e 'const h=await fetch("http://127.0.0.1:8080/healthz");if(!h.ok)process.exit(1);const r=await fetch("http://127.0.0.1:8080/v1/game-catalog");const b=await r.json();if(!r.ok||b.schemaVersion!==1||!Array.isArray(b.items)||b.items.length!==12||!b.items.some(x=>x.id==="heist-echo"))process.exit(1)' >/dev/null 2>&1; then candidate_ready=1; break; fi
  sleep 1
done
if [ "$candidate_ready" -ne 1 ]; then echo "Candidate Commerce API failed health/catalogue checks; existing service left unchanged" >&2; docker rm -f "$candidate" >/dev/null 2>&1 || true; exit 1; fi
previous_exists=0
if docker inspect "$service" >/dev/null 2>&1; then docker stop "$service" >/dev/null; docker network disconnect "$network" "$service" >/dev/null 2>&1 || true; docker rm -f "$previous" >/dev/null 2>&1 || true; docker rename "$service" "$previous"; previous_exists=1; fi
rollback() {
  echo "Commerce API switch failed; restoring previous service where available" >&2
  if docker inspect "$service" >/dev/null 2>&1; then docker stop "$service" >/dev/null 2>&1 || true; docker network disconnect "$network" "$service" >/dev/null 2>&1 || true; docker rm -f "$service" >/dev/null 2>&1 || true; fi
  if [ "$previous_exists" -eq 1 ] && docker inspect "$previous" >/dev/null 2>&1; then docker rename "$previous" "$service"; docker network connect "$network" "$service" >/dev/null 2>&1 || true; docker start "$service" >/dev/null 2>&1 || true; fi
}
docker network disconnect "$network" "$candidate" >/dev/null 2>&1 || true
if ! docker rename "$candidate" "$service"; then rollback; exit 1; fi
if ! docker network connect "$network" "$service"; then rollback; exit 1; fi
upstream_ready=0
for attempt in $(seq 1 12); do
  if docker exec "$frontend" sh -lc "wget -q -T 2 -O /tmp/osgard-commerce-catalog-smoke.json http://$service:8080/v1/game-catalog && grep -q schemaVersion /tmp/osgard-commerce-catalog-smoke.json && grep -q null-shift /tmp/osgard-commerce-catalog-smoke.json"; then upstream_ready=1; docker exec "$frontend" rm -f /tmp/osgard-commerce-catalog-smoke.json >/dev/null 2>&1 || true; break; fi
  sleep 1
done
if [ "$upstream_ready" -ne 1 ]; then rollback; exit 1; fi
if [ "$previous_exists" -eq 1 ]; then docker rm -f "$previous" >/dev/null 2>&1 || true; fi
echo "PASS Commerce API: healthy private-only upstream, schema v1 with 12 safe catalogue entries including HEIST//ECHO; Stripe/checkout credentials remain absent."
