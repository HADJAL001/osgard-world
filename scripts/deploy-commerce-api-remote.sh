#!/usr/bin/env bash
set -euo pipefail
umask 077

image_archive=${1:?Usage: deploy-commerce-api-remote.sh IMAGE.tar.gz GIT_SHA}
image_sha=${2:?Usage: deploy-commerce-api-remote.sh IMAGE.tar.gz GIT_SHA}
[[ "$image_sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid release SHA." >&2; exit 2; }
[[ -s "$image_archive" ]] || { echo "Commerce API image archive is missing." >&2; exit 2; }

container_name="osgard-commerce-api"
postgres_name="osgard-commerce-postgres"
volume_name="osgard-commerce-postgres-data"
secrets_dir="/var/lib/osgard-commerce-api"
postgres_env="$secrets_dir/postgres.env"
api_env="$secrets_dir/api.env"
db_password_file="$secrets_dir/database-password"
admin_token_file="$secrets_dir/admin-api-token"

docker inspect osgard-world >/dev/null 2>&1 || { echo "Frontend container osgard-world is absent." >&2; exit 1; }
network_json="$(docker inspect osgard-world --format '{{json .NetworkSettings.Networks}}')"
network="$(python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(2) if len(d)!=1 else print(next(iter(d)))' <<<"$network_json")" || {
  echo "Expected exactly one frontend Docker network; refusing to guess an upstream network." >&2
  exit 1
}
[[ "$network" =~ ^[A-Za-z0-9_.-]+$ ]] || { echo "Invalid frontend network name." >&2; exit 1; }
docker network inspect "$network" >/dev/null 2>&1 || { echo "Frontend Docker network is not available." >&2; exit 1; }

install -d -m 700 "$secrets_dir"
config_files=("$postgres_env" "$api_env" "$db_password_file" "$admin_token_file")
present=0
for file in "${config_files[@]}"; do [[ -f "$file" ]] && present=$((present+1)); done
if [[ "$present" -eq 0 ]]; then
  if docker inspect "$postgres_name" >/dev/null 2>&1 || docker volume inspect "$volume_name" >/dev/null 2>&1; then
    echo "Existing Commerce database state has no complete secret bundle; refusing to regenerate credentials." >&2
    exit 1
  fi
  command -v openssl >/dev/null 2>&1 || { echo "OpenSSL is required to generate private service credentials." >&2; exit 1; }
  db_password="$(openssl rand -hex 32)"
  admin_token="$(openssl rand -hex 32)"
  staging="$(mktemp -d "$secrets_dir/.bootstrap.XXXXXX")"
  trap 'rm -rf "${staging:-}"' EXIT
  printf '%s\n' "$db_password" > "$staging/database-password"
  printf '%s\n' "$admin_token" > "$staging/admin-api-token"
  printf 'POSTGRES_DB=osgard_commerce\nPOSTGRES_USER=osgard_commerce\nPOSTGRES_PASSWORD=%s\n' "$db_password" > "$staging/postgres.env"
  printf 'NODE_ENV=production\nPORT=8080\nTRUST_PROXY=true\nPUBLIC_BASE_URL=https://osgard.world\nALLOWED_ORIGINS=https://osgard.world,https://www.osgard.world\nDATABASE_URL=postgres://osgard_commerce:%s@osgard-commerce-postgres:5432/osgard_commerce\nDATABASE_SSL=false\nADMIN_API_TOKEN=%s\nANALYTICS_RETENTION_DAYS=90\nENABLE_LIVE_PAYMENTS=false\nENABLE_OSGARD_PREMIUM_SALES=false\n' "$db_password" "$admin_token" > "$staging/api.env"
  chmod 600 "$staging"/*
  mv "$staging/database-password" "$db_password_file"
  mv "$staging/admin-api-token" "$admin_token_file"
  mv "$staging/postgres.env" "$postgres_env"
  mv "$staging/api.env" "$api_env"
  rmdir "$staging"
  trap - EXIT
elif [[ "$present" -ne 4 ]]; then
  echo "Commerce credential bundle is incomplete; refusing to rotate secrets or alter database access automatically." >&2
  exit 1
fi
chmod 600 "${config_files[@]}"

db_password="$(cat "$db_password_file")"
admin_token="$(cat "$admin_token_file")"
[[ "$db_password" =~ ^[0-9a-f]{64}$ && "$admin_token" =~ ^[0-9a-f]{64}$ ]] || {
  echo "Private credential bundle failed its format check." >&2
  exit 1
}
grep -Fxq "POSTGRES_PASSWORD=$db_password" "$postgres_env" || { echo "PostgreSQL secret bundle does not match." >&2; exit 1; }
grep -Fxq "ADMIN_API_TOKEN=$admin_token" "$api_env" || { echo "Admin secret bundle does not match." >&2; exit 1; }
unset db_password admin_token

# This database and API are reachable only on the existing private Docker bridge.
docker load --input "$image_archive" >/dev/null
api_image="osgard-commerce-api:$image_sha"
docker image inspect "$api_image" >/dev/null 2>&1 || { echo "Loaded Commerce API image tag does not match the release SHA." >&2; exit 1; }
if ! docker image inspect postgres:16-alpine >/dev/null 2>&1; then docker pull postgres:16-alpine >/dev/null; fi
docker volume create "$volume_name" >/dev/null

if docker inspect "$postgres_name" >/dev/null 2>&1; then
  label="$(docker inspect -f '{{ index .Config.Labels "com.osgard.managed" }}' "$postgres_name" 2>/dev/null || true)"
  [[ "$label" == "osgard-commerce-db" ]] || { echo "A non-OSGARD-managed container already uses the Commerce Postgres name." >&2; exit 1; }
  db_networks="$(docker inspect "$postgres_name" --format '{{json .NetworkSettings.Networks}}')"
  if ! python3 -c 'import json,sys; sys.exit(0 if sys.argv[1] in json.load(sys.stdin) else 1)' "$network" <<<"$db_networks"; then
    docker network connect "$network" "$postgres_name"
  fi
  docker start "$postgres_name" >/dev/null 2>&1 || true
else
  docker run -d --name "$postgres_name" --network "$network" --restart unless-stopped \
    --label com.osgard.managed=osgard-commerce-db \
    --env-file "$postgres_env" \
    --mount "type=volume,src=$volume_name,dst=/var/lib/postgresql/data" \
    --health-cmd='pg_isready -U osgard_commerce -d osgard_commerce' \
    --health-interval=10s --health-timeout=5s --health-retries=12 --health-start-period=20s \
    postgres:16-alpine >/dev/null
fi

postgres_ready=false
for _ in $(seq 1 60); do
  state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$postgres_name" 2>/dev/null || true)"
  if [[ "$state" == "healthy" ]]; then postgres_ready=true; break; fi
  if [[ "$state" == "exited" || "$state" == "dead" ]]; then break; fi
  sleep 2
done
if [[ "$postgres_ready" != true ]]; then
  echo "Private PostgreSQL did not become healthy; existing database data was left in place." >&2
  exit 1
fi

old_image=""
old_existed=false
if docker inspect "$container_name" >/dev/null 2>&1; then
  label="$(docker inspect -f '{{ index .Config.Labels "com.osgard.managed" }}' "$container_name" 2>/dev/null || true)"
  [[ "$label" == "osgard-commerce-api" ]] || {
    echo "A non-OSGARD-managed container already uses the Commerce API name; refusing to replace it." >&2
    exit 1
  }
  old_image="$(docker inspect -f '{{.Image}}' "$container_name")"
  old_existed=true
  docker rm -f "$container_name" >/dev/null
fi

run_api() {
  local image="$1"
  docker run -d --name "$container_name" --network "$network" --restart unless-stopped \
    --label com.osgard.managed=osgard-commerce-api \
    --label "com.osgard.release-sha=$image_sha" \
    --env-file "$api_env" "$image" >/dev/null
}
api_ready() {
  docker exec "$container_name" node -e 'fetch("http://127.0.0.1:8080/readyz").then(async r=>{let j=await r.json();if(!r.ok||j.ready!==true)process.exit(1)}).catch(()=>process.exit(1)' >/dev/null 2>&1
}

run_api "$api_image"
api_ok=false
for _ in $(seq 1 45); do
  if api_ready; then api_ok=true; break; fi
  sleep 2
done
if [[ "$api_ok" != true ]]; then
  echo "Commerce API did not pass its database-backed /readyz probe; starting rollback." >&2
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  if [[ "$old_existed" == true ]]; then
    docker run -d --name "$container_name" --network "$network" --restart unless-stopped \
      --label com.osgard.managed=osgard-commerce-api \
      --label "com.osgard.rollback=true" \
      --env-file "$api_env" "$old_image" >/dev/null
    for _ in $(seq 1 30); do if api_ready; then break; fi; sleep 2; done
  fi
  exit 1
fi

catalog_json="$(docker exec osgard-world wget -q -T 8 -O- http://osgard-commerce-api:8080/v1/game-catalog)"
printf '%s' "$catalog_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); items=d.get("items",[]); ids={x.get("id") for x in items}; expected={"null-shift","time","swarm","inherit","remix","civic-cascade","patina","signal-run","cascade-lab","afterimage-run","aether-grid"}; assert d.get("schemaVersion")==1 and expected <= ids and len(items)==11; assert all(isinstance(x.get("href"),str) and x["href"].startswith("/games/") for x in items)'
docker exec osgard-world wget -q -T 8 -O- http://osgard-commerce-api:8080/readyz >/dev/null

# Daily compressed local backups; retain two weeks and never publish the database port.
backup_script="/usr/local/sbin/osgard-commerce-db-backup.sh"
cat > "$backup_script" <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir="/var/backups/osgard-commerce-api"
install -d -m 700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$backup_dir/.commerce-$stamp.sql.gz.part"
out="$backup_dir/osgard-commerce-$stamp.sql.gz"
docker exec osgard-commerce-postgres pg_dump --no-owner --no-privileges -U osgard_commerce -d osgard_commerce | gzip -1 > "$tmp"
gzip -t "$tmp"
test -s "$tmp"
mv "$tmp" "$out"
find "$backup_dir" -maxdepth 1 -type f -name 'osgard-commerce-*.sql.gz' -mtime +14 -delete
BACKUP
chmod 700 "$backup_script"
install -d -m 700 /var/backups/osgard-commerce-api
backup_schedule="not_configured"
if [[ -d /etc/cron.d ]]; then
  cat > /etc/cron.d/osgard-commerce-api-backup <<'CRON'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 3 * * * root /usr/local/sbin/osgard-commerce-db-backup.sh >/dev/null 2>&1
CRON
  chmod 644 /etc/cron.d/osgard-commerce-api-backup
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl list-unit-files cron.service --no-legend 2>/dev/null | grep -q 'cron.service'; then
      systemctl enable --now cron.service >/dev/null 2>&1 || true
      systemctl is-active --quiet cron.service && backup_schedule="daily_0317_utc"
    elif systemctl list-unit-files crond.service --no-legend 2>/dev/null | grep -q 'crond.service'; then
      systemctl enable --now crond.service >/dev/null 2>&1 || true
      systemctl is-active --quiet crond.service && backup_schedule="daily_0317_utc"
    fi
  fi
fi
if [[ "$backup_schedule" == "not_configured" ]] && command -v crontab >/dev/null 2>&1; then
  (crontab -l 2>/dev/null | grep -v 'OSGARD_COMMERCE_BACKUP' || true; echo '17 3 * * * /usr/local/sbin/osgard-commerce-db-backup.sh # OSGARD_COMMERCE_BACKUP') | crontab -
  backup_schedule="daily_0317_utc"
fi

echo "Commerce API deployment passed: private network, database-backed readyz, and 11-game catalogue."
echo "Database persistence: Docker volume $volume_name."
echo "Payment safety: Stripe keys absent; live payments and OSGARD PREMIUM remain disabled."
echo "Admin token stored privately at $admin_token_file; do not print it to build logs."
echo "Backup schedule: $backup_schedule; script: $backup_script; retention: 14 days."
