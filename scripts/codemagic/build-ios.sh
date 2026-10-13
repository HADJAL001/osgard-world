#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CAPACITOR_VERSION="8.5.3"
SHARE_VERSION="8.0.3"
GODOT_VERSION="4.7.2"
GODOT_DIR="${TMPDIR:-/tmp}/osgard-godot-${GODOT_VERSION}"
TEMPLATE_DIR="$HOME/Library/Application Support/Godot/export_templates/${GODOT_VERSION}.stable"

echo "== Install locked web dependencies =="
npm ci

echo "== Install pinned Capacitor/iOS/share tooling without modifying package.json or lockfile =="
npm install --no-save --no-package-lock \
  "@capacitor/core@${CAPACITOR_VERSION}" \
  "@capacitor/cli@${CAPACITOR_VERSION}" \
  "@capacitor/ios@${CAPACITOR_VERSION}" \
  "@capacitor/share@${SHARE_VERSION}" \
  "@resvg/resvg-js@2.6.2"

echo "== Run existing game/platform regression suite =="
npm run check
npm run qa:games-portal
npm run qa:games-detail
npm run qa:games-model
npm run qa:null-shift
npm run qa:null-shift-godot
npm run qa:ecosystem
npm run qa:osgard-select
npm run qa:consented-analytics-queue
npm run qa:remix-growth
npm run qa:time-ui

echo "== Install the same official Godot version used by the web release workflow =="
mkdir -p "$GODOT_DIR" "$TEMPLATE_DIR" "$GODOT_DIR/unpacked-templates"
curl -L --fail --retry 3 \
  "https://github.com/godotengine/godot-builds/releases/download/${GODOT_VERSION}-stable/Godot_v${GODOT_VERSION}-stable_macos.universal.zip" \
  -o "$GODOT_DIR/engine.zip"
unzip -q -o "$GODOT_DIR/engine.zip" -d "$GODOT_DIR"
curl -L --fail --retry 3 \
  "https://github.com/godotengine/godot-builds/releases/download/${GODOT_VERSION}-stable/Godot_v${GODOT_VERSION}-stable_export_templates.tpz" \
  -o "$GODOT_DIR/templates.tpz"
unzip -q -o "$GODOT_DIR/templates.tpz" -d "$GODOT_DIR/unpacked-templates"
cp -R "$GODOT_DIR/unpacked-templates/templates/." "$TEMPLATE_DIR/"

GODOT_BIN="$(find "$GODOT_DIR" -path '*/Contents/MacOS/Godot' -type f -print -quit)"
if [[ -z "$GODOT_BIN" ]]; then
  echo "Could not locate the Godot macOS executable in the official archive." >&2
  exit 1
fi
chmod +x "$GODOT_BIN"
"$GODOT_BIN" --version
test -s "$TEMPLATE_DIR/web_nothreads_release.zip"

echo "== Parse Godot project and exercise its headless gameplay smoke test =="
"$GODOT_BIN" --headless --editor --path godot/null-shift --quit
"$GODOT_BIN" --headless --path godot/null-shift --script res://tests/runtime_smoke.gd 2>&1 | tee /tmp/osgard-null-shift-runtime.log
if grep -E 'SCRIPT ERROR:|Parse Error:|RUNTIME_SMOKE_FAILURE:' /tmp/osgard-null-shift-runtime.log; then
  echo "Godot runtime smoke failed." >&2
  exit 1
fi

echo "== Export NULL//SHIFT for the bundled iOS games portal =="
mkdir -p public/games/null-shift-godot
"$GODOT_BIN" --headless --path godot/null-shift --export-release Web "$ROOT/public/games/null-shift-godot/index.html"
node scripts/null-shift-godot-smoke.mjs --export-check public/games/null-shift-godot

echo "== Build the website assets that will be bundled in the iOS application =="
npm run build
npm run preflight:frontend

echo "== Prepare a local-first mobile catalogue and native share-sheet bridge =="
node scripts/prepare-ios-dist.mjs

echo "== Generate the iOS host project and sync native plugins =="
if [[ ! -d ios/App/App.xcodeproj ]]; then
  npx cap add ios
fi
npx cap sync ios
(cd ios/App && pod install)
node scripts/ios/install-app-icon.mjs
npm run qa:ios-package

echo "== Confirm that the App Store release targets the latest available Xcode SDK =="
xcodebuild -version
