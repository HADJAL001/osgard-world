#!/usr/bin/env bash
set -Eeuo pipefail

: "\${REMOTE_STAGE:?REMOTE_STAGE must point to the verified release staging directory}"

container="osgard-commerce-api"
archive="$REMOTE_STAGE/osgard-commerce-api-release.tgz"
checksum_file="$REMOTE_STAGE/commerce-api.sha256"
payload="$REMOTE_STAGE/commerce-api-src"
rollback_dir=""

cd "$REMOTE_STAGE"
sha256sum -c "$checksum_file"
mkdir -p "$payload"
tar -xzf "$archive" -C "$payload"
test -s "$payload/src/server.mjs"
test -s "$payload/src/game-coach.mjs"

# This deploy updates an already managed API container and deliberately preserves
# its environment, network, database, mounted data and restart policy. It does not
# recreate the service or read/print any environment variables.
docker inspect "$container" >/dev/null
rollback_dir="$(mktemp -d /tmp/osgard-commerce-api-rollback.XXXXXX)"
docker cp "$container:/app/src/server.mjs" "$rollback_dir/server.mjs"
if docker exec "$container" sh -lc 'test -f /app/src/game-coach.mjs'; then
  docker cp "$container:/app/src/game-coach.mjs" "$rollback_dir/game-coach.mjs"
  touch "$rollback_dir/game-coach.present"
else
  touch "$rollback_dir/game-coach.absent"
fi

rollback() {
  local original_status="$?"
  trap - ERR
  echo "Commerce API rollout failed; restoring the previous server source."
  docker cp "$rollback_dir/server.mjs" "$container:/app/src/server.mjs" >/dev/null 2>&1 || true
  if [[ -f "$rollback_dir/game-coach.present" ]]; then
    docker cp "$rollback_dir/game-coach.mjs" "$container:/app/src/game-coach.mjs" >/dev/null 2>&1 || true
  elif [[ -f "$rollback_dir/game-coach.absent" ]]; then
    docker exec "$container" rm -f /app/src/game-coach.mjs >/dev/null 2>&1 || true
  fi
  docker restart "$container" >/dev/null 2>&1 || true
  if ! docker exec "$container" node -e 'fetch("http://127.0.0.1:8080/healthz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    echo "WARNING: previous Commerce API source was restored, but its health check did not recover." >&2
  else
    echo "Previous Commerce API source restored and health check recovered."
  fi
  rm -rf "$rollback_dir"
  exit "$original_status"
}
trap rollback ERR

docker cp "$payload/src/server.mjs" "$container:/app/src/server.mjs"
docker cp "$payload/src/game-coach.mjs" "$container:/app/src/game-coach.mjs"
docker exec "$container" node --check /app/src/server.mjs
docker exec "$container" node --check /app/src/game-coach.mjs
docker restart "$container" >/dev/null

ready=0
for attempt in $(seq 1 20); do
  if docker exec "$container" node -e 'fetch("http://127.0.0.1:8080/healthz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
test "$ready" -eq 1

# Validate the public status contract. Only the enabled boolean is logged; no key
# or environment value is queried or emitted. Disabled is a valid fail-closed state.
docker exec "$container" node --input-type=module -e '
  const response = await fetch("http://127.0.0.1:8080/v1/game-coach/status");
  if (!response.ok) process.exit(1);
  const payload = await response.json();
  if (typeof payload.enabled !== "boolean") process.exit(2);
  console.log("Commerce API rollout healthy; Game Coach endpoint contract OK; enabled=" + payload.enabled);
'

trap - ERR
rm -rf "$rollback_dir"
