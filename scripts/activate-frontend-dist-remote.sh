#!/usr/bin/env bash
set -Eeuo pipefail

container="${OSGARD_CONTAINER:-osgard-world}"
archive="${OSGARD_ARCHIVE:-}"
expected_sha256="${OSGARD_SHA256:-}"
health_url="${OSGARD_HEALTH_URL:-https://osgard.world/}"
release_id="${OSGARD_RELEASE_ID:-}"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$container" =~ ^[A-Za-z0-9_.-]+$ ]] || die "Invalid container name."
[[ "$expected_sha256" =~ ^[a-f0-9]{64}$ ]] || die "OSGARD_SHA256 must be a 64-character lowercase SHA-256."
[[ "$release_id" =~ ^[A-Za-z0-9-]{12,96}$ ]] || die "Invalid release id."
[[ "$health_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~/?=&%-]*)?$ ]] || die "Invalid health URL."
[[ -f "$archive" ]] || die "Release archive does not exist: $archive"
command -v docker >/dev/null || die "Docker is not installed or not on PATH."
command -v sha256sum >/dev/null || die "sha256sum is required."
command -v tar >/dev/null || die "tar is required."
command -v curl >/dev/null || die "curl is required."

actual_sha256="$(sha256sum "$archive" | cut -d ' ' -f1)"
[[ "$actual_sha256" == "$expected_sha256" ]] || die "Host archive SHA-256 does not match the verified local digest."

listing="$(tar -tzf "$archive")" || die "Cannot read release archive."
verbose_listing="$(tar -tvzf "$archive")" || die "Cannot inspect release archive."
has_root_index=0
while IFS= read -r entry; do
  [[ -n "$entry" ]] || continue
  normalized="${entry#./}"
  case "$entry" in
    /*|../*|*/../*|*/..|..) die "Unsafe archive path: $entry" ;;
  esac
  [[ "$normalized" != *$'\r'* ]] || die "Control character in archive path."
  [[ "$normalized" == "index.html" ]] && has_root_index=1
done <<< "$listing"
[[ "$has_root_index" == 1 ]] || die "Archive must contain a root index.html."
while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  mode="${line:0:1}"
  [[ "$mode" != "l" && "$mode" != "h" ]] || die "Symbolic and hard links are not allowed in the static archive."
done <<< "$verbose_listing"

inside_archive="/tmp/osgard-frontend-release-${release_id}.tgz"
container_script="$(cat <<'CONTAINER_SCRIPT'
set -eu
archive="${OSGARD_ARCHIVE_PATH:?}"
expected="${OSGARD_EXPECTED_SHA256:?}"
release="${OSGARD_RELEASE_ID:?}"
root=/usr/share/nginx/html
candidate="/usr/share/nginx/html.candidate-$release"
old_live="/usr/share/nginx/html.pre-swap-$release"
backup="/tmp/osgard-html-backup-$release"

rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ -d "$backup" ]; then
    if [ -d "$old_live" ]; then
      rm -rf "$root"
      mv "$old_live" "$root"
    else
      rm -rf "$root"
      cp -a "$backup" "$root"
    fi
    nginx -t && nginx -s reload || true
  fi
  exit "$status"
}
trap rollback EXIT

actual="$(sha256sum "$archive" | cut -d ' ' -f1)"
[ "$actual" = "$expected" ] || { echo "Container copy SHA-256 mismatch." >&2; exit 1; }
[ -d "$root" ] || { echo "Current document root is missing." >&2; exit 1; }
[ ! -e "$candidate" ] && [ ! -e "$old_live" ] && [ ! -e "$backup" ] || {
  echo "Release path collision; refusing to overwrite an existing recovery point." >&2
  exit 1
}
mkdir -p "$candidate"
tar -xzf "$archive" -C "$candidate"
[ -f "$candidate/index.html" ] || { echo "Candidate has no index.html." >&2; exit 1; }
cp -a "$root" "$backup"
mv "$root" "$old_live"
mv "$candidate" "$root"
nginx -t
nginx -s reload
printf 'BACKUP_PATH=%s\nOLD_LIVE_PATH=%s\n' "$backup" "$old_live"
CONTAINER_SCRIPT
)"

docker cp "$archive" "$container:$inside_archive"
docker exec \
  -e "OSGARD_ARCHIVE_PATH=$inside_archive" \
  -e "OSGARD_EXPECTED_SHA256=$expected_sha256" \
  -e "OSGARD_RELEASE_ID=$release_id" \
  "$container" sh -lc "$container_script"

origin="$(printf '%s' "$health_url" | sed -E 's#^(https?://[^/]+).*#\1#')"
if ! curl --retry 2 --retry-delay 2 --retry-connrefused --max-time 12 -fsS "$health_url" >/dev/null \
  || ! curl --retry 2 --retry-delay 2 --retry-connrefused --max-time 12 -fsS "$origin/games/" >/dev/null; then
  printf 'ERROR: post-activation route check failed; restoring the previous document root.\n' >&2
  rollback_script="$(cat <<ROLLBACK_SCRIPT
set -eu
root=/usr/share/nginx/html
old_live=/usr/share/nginx/html.pre-swap-$release_id
backup=/tmp/osgard-html-backup-$release_id
if [ -d "\$old_live" ]; then
  rm -rf "\$root"
  mv "\$old_live" "\$root"
elif [ -d "\$backup" ]; then
  rm -rf "\$root"
  cp -a "\$backup" "\$root"
else
  echo "No rollback copy found." >&2
  exit 1
fi
nginx -t
nginx -s reload
rm -f "$inside_archive"
ROLLBACK_SCRIPT
)"
  docker exec "$container" sh -lc "$rollback_script" || printf 'CRITICAL: automatic rollback failed; inspect container %s.\n' "$container" >&2
  exit 1
fi

docker exec "$container" sh -lc "rm -rf '/usr/share/nginx/html.pre-swap-$release_id' '/usr/share/nginx/html.candidate-$release_id'; rm -f '$inside_archive'"
printf 'Activation verified. SHA-256: %s\n' "$expected_sha256"
printf 'A rollback copy remains at /tmp/osgard-html-backup-%s inside container %s.\n' "$release_id" "$container"
