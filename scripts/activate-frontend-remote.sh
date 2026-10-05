#!/usr/bin/env bash
set -euo pipefail

container_name="${OSGARD_CONTAINER:-osgard-world}"
archive="${OSGARD_ARCHIVE:-/tmp/osgard-gh-release.tgz}"
state_file="/tmp/osgard-frontend-activation.state"
log_file="/tmp/osgard-frontend-activation.log"
rm -f "$state_file" "$log_file"
(
  set -euo pipefail
  docker exec "$container_name" sh -lc "rm -rf /tmp/osgard-gh-next /tmp/osgard-gh-previous && mkdir /tmp/osgard-gh-next && tar -xzf '$archive' -C /tmp/osgard-gh-next && test -f /tmp/osgard-gh-next/index.html && mv /usr/share/nginx/html /tmp/osgard-gh-previous && mv /tmp/osgard-gh-next /usr/share/nginx/html"
  if curl --max-time 10 -fsS https://osgard.world/ >/dev/null && curl --max-time 10 -fsS http://127.0.0.1:4317/health | grep -q '"status":"ok"'; then
    printf 'success\n' > "$state_file"
  else
    docker exec "$container_name" sh -lc 'rm -rf /usr/share/nginx/html && mv /tmp/osgard-gh-previous /usr/share/nginx/html'
    printf 'failed\n' > "$state_file"
    exit 1
  fi
) >"$log_file" 2>&1 &
pid=$!
for _ in $(seq 1 45); do
  [[ -f "$state_file" ]] && break
  kill -0 "$pid" 2>/dev/null || break
  sleep 1
done
if [[ ! -f "$state_file" ]]; then kill "$pid" 2>/dev/null || true; cat "$log_file" || true; exit 1; fi
cat "$log_file" || true
grep -q '^success$' "$state_file"
