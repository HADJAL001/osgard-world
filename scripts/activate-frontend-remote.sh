#!/usr/bin/env bash
set -euo pipefail

container_name="${OSGARD_CONTAINER:-osgard-world}"
archive="${OSGARD_ARCHIVE:-/tmp/osgard-gh-release.tgz}"
state_file="/tmp/osgard-frontend-activation.state"
log_file="/tmp/osgard-frontend-activation.log"
rm -f "$state_file" "$log_file"

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
    test -f /tmp/osgard-gh-next/nginx.conf
    cp /etc/nginx/conf.d/default.conf /tmp/osgard-nginx-previous.conf
    mv /usr/share/nginx/html /tmp/osgard-gh-previous
    mv /tmp/osgard-gh-next/html /usr/share/nginx/html
    cp /tmp/osgard-gh-next/nginx.conf /etc/nginx/conf.d/default.conf
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

  if curl --max-time 12 -fsS https://osgard.world/ >/dev/null \
    && curl --max-time 12 -fsS https://osgard.world/skillcred/ -o /tmp/skillcred-page-check.html \
    && grep -q 'id="issueBtn"' /tmp/skillcred-page-check.html \
    && grep -q 'name="api-base" content="/skillcred-api"' /tmp/skillcred-page-check.html \
    && curl --max-time 12 -fsS https://osgard.world/skillcred/styles.css -o /tmp/skillcred-css-check.txt \
    && grep -q -- '--accent:#c8ff3d' /tmp/skillcred-css-check.txt \
    && grep -oE '/skillcred/styles\.css\?v=[A-Za-z0-9]+' /tmp/skillcred-page-check.html > /tmp/skillcred-versioned-css-paths.txt \
    && css_path="$(sed -n '1p' /tmp/skillcred-versioned-css-paths.txt)" \
    && test -n "$css_path" \
    && curl --max-time 12 -fsS -H 'Accept-Encoding: gzip' -D /tmp/skillcred-versioned-css-headers.txt -o /tmp/skillcred-versioned-css.gz "https://osgard.world$css_path" \
    && grep -qi '^content-encoding: gzip' /tmp/skillcred-versioned-css-headers.txt \
    && curl --max-time 12 -fsS https://osgard.world/skillcred/app.js -o /tmp/skillcred-js-check.txt \
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
