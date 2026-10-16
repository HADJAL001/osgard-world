#!/usr/bin/env bash
set -euo pipefail

container_name="${OSGARD_CONTAINER:-osgard-world}"
archive="${OSGARD_ARCHIVE:-/tmp/osgard-gh-release.tgz}"
state_file="/tmp/osgard-frontend-activation.state"
log_file="/tmp/osgard-frontend-activation.log"
rm -f "$state_file" "$log_file"

expected_build="${OSGARD_EXPECTED_BUILD:-}"
if [[ ! "$expected_build" =~ ^[a-f0-9]{40}$ ]]; then
  echo "ERROR: a full 40-character OSGARD_EXPECTED_BUILD SHA is required for release activation." >&2
  exit 1
fi
expected_build_short="${expected_build:0:12}"

# The OSGARD game API is sometimes managed by the host, not by Docker Compose.
# Keep the current release untouched unless the active frontend can reach a healthy API.
api_target="osgard-game-api"
if ! docker exec "$container_name" sh -lc 'wget -q -T 3 -O /dev/null http://osgard-game-api:4317/health' >/dev/null 2>&1; then
  host_api_health="$(curl --max-time 3 -fsS http://127.0.0.1:4317/health 2>/dev/null || true)"
  if [[ "$host_api_health" == *'"status":"ok"'* ]]; then
    gateways="$(docker inspect -f "{{range .NetworkSettings.Networks}}{{.Gateway}} {{end}}" "$container_name" 2>/dev/null || true)"
    echo "Detected Docker gateway candidates: ${gateways:-<none>}"
    for gateway in $gateways; do
      [[ "$gateway" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || continue
      echo "Probing host-managed OSGARD game API through $gateway:4317"
      if docker exec "$container_name" sh -lc "wget -q -T 3 -O /dev/null http://$gateway:4317/health" >/dev/null 2>&1; then
        api_target="$gateway"
        echo "Using reachable Docker host gateway for the host-managed OSGARD game API."
        break
      else
        echo "Gateway health probe failed; collecting bounded HTTP/network diagnostics."
        docker exec "$container_name" sh -lc "wget -S -T 3 -O- http://$gateway:4317/health 2>&1 || true" || true
      fi
    done
  fi
  if [[ "$api_target" == "osgard-game-api" ]] \
    && [[ "$host_api_health" == *'"status":"ok"'* ]] \
    && command -v ufw >/dev/null 2>&1 \
    && ufw status 2>/dev/null | grep -q '^Status: active'; then
    # UFW currently denies incoming traffic by default. Permit the API only
    # from this frontend container to its Docker bridge gateway (TCP/4317).
    # This does not open port 4317 on the public network interface.
    network_info="$(docker inspect "$container_name" --format '{{json .NetworkSettings.Networks}}' 2>/dev/null \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); rows=[(k,v) for k,v in d.items() if v.get("Gateway") and v.get("IPAddress") and v.get("NetworkID")]; print("|".join([rows[0][0],rows[0][1]["Gateway"],rows[0][1]["IPAddress"],rows[0][1]["NetworkID"]]) if rows else "")' 2>/dev/null || true)"
    IFS='|' read -r api_network api_gateway api_container_ip api_network_id <<< "$network_info"
    api_subnet="$(docker network inspect "$api_network" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true)"
    bridge_iface="br-${api_network_id:0:12}"
    if [[ -n "$api_network" ]] \
      && [[ "$api_gateway" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] \
      && [[ "$api_container_ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] \
      && [[ "$api_network_id" =~ ^[0-9a-f]{12,}$ ]] \
      && [[ "$api_subnet" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$ ]] \
      && [[ "$bridge_iface" =~ ^br-[0-9a-f]{12}$ ]] \
      && ip link show "$bridge_iface" >/dev/null 2>&1; then
      echo "Adding a restricted UFW rule for the current OSGARD frontend container only:"
      echo "interface=$bridge_iface source=$api_container_ip destination=$api_gateway tcp/4317"
      if ufw allow in on "$bridge_iface" from "$api_container_ip" to "$api_gateway" port 4317 proto tcp; then
        if docker exec "$container_name" sh -lc "wget -q -T 3 -O /dev/null http://$api_gateway:4317/health" >/dev/null 2>&1; then
          api_target="$api_gateway"
          echo "OSGARD game API is reachable through the restricted Docker-bridge rule."
        else
          echo "Restricted firewall rule was added, but the API probe still fails; activation will be refused." >&2
          docker exec "$container_name" sh -lc "wget -S -T 3 -O- http://$api_gateway:4317/health 2>&1 || true" || true
        fi
      fi
    else
      echo "Cannot safely derive a Docker bridge interface/IP for a restricted API rule; refusing to change firewall policy." >&2
    fi
  fi
  if [[ "$api_target" == "osgard-game-api" ]]; then
    echo "Host API health response: ${host_api_health:-<empty>}" >&2
    echo "ERROR: no reachable, healthy OSGARD game API upstream; refusing frontend activation." >&2
    exit 1
  fi
fi
echo "OSGARD game API upstream selected: $api_target"

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
  if ! docker exec -e OSGARD_GAME_API_TARGET="$api_target" "$container_name" sh -lc "
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
    cp /etc/nginx/conf.d/default.conf /tmp/osgard-nginx-previous.conf
    mv /usr/share/nginx/html /tmp/osgard-gh-previous
    mv /tmp/osgard-gh-next/html /usr/share/nginx/html
    if [ \"\$OSGARD_GAME_API_TARGET\" != \"osgard-game-api\" ]; then
      sed \"s/osgard-game-api;/\$OSGARD_GAME_API_TARGET;/\" /tmp/osgard-gh-next/nginx.conf > /tmp/osgard-gh-next/nginx.runtime.conf
    else
      cp /tmp/osgard-gh-next/nginx.conf /tmp/osgard-gh-next/nginx.runtime.conf
    fi
    grep -F \"\$OSGARD_GAME_API_TARGET;\" /tmp/osgard-gh-next/nginx.runtime.conf >/dev/null
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
  "; then
    echo "ERROR: candidate Nginx activation failed; restoring previous frontend release." >&2
    rollback
    printf 'failed\n' > "$state_file"
    exit 1
  fi

  # Verify the just-activated local Nginx origin before checking the public edge.
  if ! docker exec -e OSGARD_EXPECTED_BUILD_SHORT="$expected_build_short" "$container_name" sh -lc '
    set -eu
    expected="$OSGARD_EXPECTED_BUILD_SHORT"
    hub=/tmp/osgard-games-origin-check.html
    wget -q -T 5 -O "$hub" "http://127.0.0.1/games/?_osgard_route_check=$expected"
    grep -Fq "<meta name=\\"osgard-build\\" content=\\"$expected\\">" "$hub"
    for asset in \
      consented-analytics.js player-lifecycle.js game-session-recommendations.js game-session-recommendations.css \
      daily-circuit.js daily-circuit.css sponsored-campaigns.js sponsored-campaigns.css catalog-runtime.js \
      signal-run/game.js signal-run/daily.js null-shift-godot/index.html cascade-lab/mission-director.js; do
      test -s "/usr/share/nginx/html/games/$asset"
      wget -q -T 5 -O /dev/null "http://127.0.0.1/games/$asset?_osgard_route_check=$expected"
    done
    echo "PASS: local Nginx serves Games revision $expected and required runtime assets."
  '; then
    echo "ERROR: activated Nginx origin does not serve the expected Games build/assets; rolling back." >&2
    rollback
    printf 'failed\n' > "$state_file"
    exit 1
  fi

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
