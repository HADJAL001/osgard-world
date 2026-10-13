#!/usr/bin/env bash
set -euo pipefail

container_name="${OSGARD_CONTAINER:-osgard-world}"
archive="${OSGARD_ARCHIVE:-/tmp/osgard-gh-release.tgz}"
state_file="/tmp/osgard-frontend-activation.state"
log_file="/tmp/osgard-frontend-activation.log"
rm -f "$state_file" "$log_file"

# Prefer the API container when it exists. Some production hosts run the API
# as a host service; in that case use the gateway from this container's Docker network.
if docker inspect osgard-game-api >/dev/null 2>&1; then
  api_host="osgard-game-api"
else
  networks_json="$(docker inspect "$container_name" --format '{{json .NetworkSettings.Networks}}')"
  api_host="$(printf '%s' "$networks_json" | python3 -c 'import json,sys; networks=json.load(sys.stdin); print(next((endpoint.get("Gateway", "") for endpoint in networks.values() if endpoint.get("Gateway")), ""))')"
fi
if [[ "$api_host" != "osgard-game-api" && ! "$api_host" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "Unable to resolve a safe OSGARD game API upstream" >&2
  exit 1
fi
printf 'Using OSGARD game API upstream: %s\n' "$api_host"

rollback() {
  docker exec "$container_name" sh -lc '
    set -eu
    if [ -f /tmp/osgard-nginx-previous.conf ]; then
      cp /tmp/osgard-nginx-previous.conf /etc/nginx/conf.d/default.conf
    fi
    if [ -d /tmp/osgard-gh-previous ]; then
      rm -rf /usr/share/nginx/html
      mv /tmp/osgard-gh-previous /usr/share/nginx/html
    fi
    nginx -t && nginx -s reload
  '
}

(
  set -euo pipefail
  docker exec "$container_name" sh -lc "
    set -eu
    rm -rf /tmp/osgard-gh-next /tmp/osgard-gh-previous
    mkdir -p /tmp/osgard-gh-next
    tar -xzf '$archive' -C /tmp/osgard-gh-next
    test -f /tmp/osgard-gh-next/html/index.html
    test -f /tmp/osgard-gh-next/html/skillcred/index.html
    test -f /tmp/osgard-gh-next/html/skillcred/styles.css
    test -f /tmp/osgard-gh-next/html/skillcred/app.js
    echo 'Compressed SkillCred assets in candidate release:'
    ls -l /tmp/osgard-gh-next/html/skillcred/styles.css /tmp/osgard-gh-next/html/skillcred/styles.css.gz /tmp/osgard-gh-next/html/skillcred/app.js /tmp/osgard-gh-next/html/skillcred/app.js.gz
    test -s /tmp/osgard-gh-next/html/skillcred/styles.css.gz
    test -s /tmp/osgard-gh-next/html/skillcred/app.js.gz
    test -f /tmp/osgard-gh-next/nginx.conf
    sed 's|osgard-game-api;|$api_host;|' /tmp/osgard-gh-next/nginx.conf > /tmp/osgard-gh-next/nginx.runtime.conf
    test -s /tmp/osgard-gh-next/nginx.runtime.conf
    cp /etc/nginx/conf.d/default.conf /tmp/osgard-nginx-previous.conf
    mv /usr/share/nginx/html /tmp/osgard-gh-previous
    mv /tmp/osgard-gh-next/html /usr/share/nginx/html
    cp /tmp/osgard-gh-next/nginx.runtime.conf /etc/nginx/conf.d/default.conf
    echo 'Nginx compression module diagnostics:'
    nginx -V 2>&1 | grep -o 'http_gzip[^ ]*' || true
    if nginx -t; then
      nginx -s reload
    else
      cp /tmp/osgard-nginx-previous.conf /etc/nginx/conf.d/default.conf
      rm -rf /usr/share/nginx/html
      mv /tmp/osgard-gh-previous /usr/share/nginx/html
      nginx -t && nginx -s reload
      exit 1
    fi
  "

  set -x
  if curl --max-time 12 -fsS https://osgard.world/ >/dev/null \
    && curl --max-time 12 -fsS https://osgard.world/skillcred/ -o /tmp/skillcred-page-check.html \
    && grep -q 'id="issueBtn"' /tmp/skillcred-page-check.html \
    && grep -q 'name="api-base" content="/skillcred-api"' /tmp/skillcred-page-check.html \
    && curl --max-time 12 -sS -D /tmp/skillcred-direct-gzip-headers.txt -o /tmp/skillcred-direct-gzip-body.gz https://osgard.world/skillcred/styles.css.gz \
    && { echo 'Direct .gz URL response:'; grep -Ei '^(HTTP/|content-type:|content-length:|content-encoding:|cache-control:)' /tmp/skillcred-direct-gzip-headers.txt || true; wc -c /tmp/skillcred-direct-gzip-body.gz; } \
    && curl --max-time 12 --compressed -fsS https://osgard.world/skillcred/styles.css -o /tmp/skillcred-css-check.txt \
    && grep -qi -- '--acid:#c8ff3d' /tmp/skillcred-css-check.txt \
    && grep -oE '/skillcred/styles\.css\?v=[A-Za-z0-9]+' /tmp/skillcred-page-check.html > /tmp/skillcred-versioned-css-paths.txt \
    && css_path="$(sed -n '1p' /tmp/skillcred-versioned-css-paths.txt)" \
    && test -n "$css_path" \
    && curl --max-time 12 -fsS -H 'Accept-Encoding: gzip' -D /tmp/skillcred-versioned-css-headers.txt -o /tmp/skillcred-versioned-css.gz "https://osgard.world$css_path" \
    && { if grep -qi '^content-encoding: gzip' /tmp/skillcred-versioned-css-headers.txt; then echo "PASS: CSS served with gzip Content-Encoding"; else echo "WARN: public edge returned uncompressed CSS despite local gzip variants; continuing with valid live site"; cat /tmp/skillcred-versioned-css-headers.txt; fi; } \
    && curl --max-time 12 --compressed -fsS https://osgard.world/skillcred/app.js -o /tmp/skillcred-js-check.txt \
    && grep -q 'demo/issue' /tmp/skillcred-js-check.txt \
    && curl --max-time 12 -fsS https://osgard.world/skillcred-api/health -o /tmp/skillcred-health-check.json \
    && grep -q '"version":"0.3.0"' /tmp/skillcred-health-check.json \
    && curl --max-time 12 -fsS https://osgard.world/skillcred-api/ready -o /tmp/skillcred-ready-check.json \
    && grep -q '"ready":true' /tmp/skillcred-ready-check.json \
    && curl --max-time 10 -fsS http://127.0.0.1:4317/health -o /tmp/osgard-game-health-check.json \
    && grep -q '"status":"ok"' /tmp/osgard-game-health-check.json; then
    printf 'success\n' > "$state_file"
  else
    rollback
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
if [[ ! -f "$state_file" ]]; then
  kill "$pid" 2>/dev/null || true
  cat "$log_file" || true
  exit 1
fi
cat "$log_file" || true
grep -q '^success$' "$state_file"
