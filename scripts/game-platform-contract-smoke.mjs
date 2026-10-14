import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const root = process.cwd();
const gamesRoot = resolve(root, 'public/games');
const read = path => readFileSync(resolve(root, path), 'utf8');
const registry = JSON.parse(read('public/games/game-registry.v1.json'));
const catalog = read('public/games/index.html');
const page = read('public/games/platform-map/index.html');
const runtime = read('public/games/platform-map/platform-map.js');
const styles = read('public/games/platform-map/platform-map.css');
const serviceWorker = read('public/games/osgard-play-sw.js');
const packageJson = JSON.parse(read('package.json'));

assert.equal(registry.schemaVersion, 1, 'Capability registry schema must be v1.');
assert.equal(registry.games.length, 11, 'Registry and release catalogue currently contract to 11 games.');
assert.match(registry.registryVersion, /^\d{4}\.\d{2}\.\d+$/, 'Registry version must be explicit.');
assert.ok(registry.verificationScope.includes('not a benchmark'), 'Registry must disclose its source-only verification scope.');

const ids = registry.games.map(game => game.id);
assert.equal(new Set(ids).size, ids.length, 'Registry IDs must be unique.');
const catalogIds = [...catalog.matchAll(/data-game="([a-z0-9-]+)"/g)].map(match => match[1]);
assert.deepEqual([...ids].sort(), [...catalogIds].sort(), 'Registry must track exactly the visible catalogue game IDs.');
for (const game of registry.games) {
  assert.match(game.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Game IDs must be URL-safe.');
  assert.ok(game.title && game.genre && game.description, game.id + ' needs a basic catalogue identity.');
  assert.ok(game.route.startsWith('/games/') && !game.route.includes('..') && !/[?#]/.test(game.route), game.id + ' has an unsafe route.');
  assert.ok(['browser-prototype','browser-js','browser-simulation','browser-lab','browser-canvas','browser-physics','browser-puzzle','godot-web','unity-webgl'].includes(game.runtimeFamily), game.id + ' has an unknown runtime family.');
  assert.ok(['local','api-for-online','not-verified'].includes(game.network), game.id + ' has an unknown network state.');
  assert.ok(['device-local','mode-dependent','not-documented'].includes(game.progressScope), game.id + ' has an unknown save scope.');
  assert.equal(game.touchValidation, 'not-device-verified', game.id + ' must not overstate physical-device validation.');
  assert.ok(Array.isArray(game.evidence) && game.evidence.length > 0, game.id + ' needs source evidence.');
  for (const sourcePath of game.evidence) assert.ok(existsSync(resolve(root, sourcePath)), game.id + ' missing evidence file: ' + sourcePath);
  const routeRelative = game.route.replace(/^\/games\//, '').replace(/\/$/, '');
  const localEntry = resolve(gamesRoot, routeRelative, 'index.html');
  const fallbackRelative = game.fallbackRoute?.replace(/^\/games\//, '').replace(/\/$/, '');
  const localFallback = fallbackRelative ? resolve(gamesRoot, fallbackRelative, 'index.html') : '';
  const generatedGodot = game.entrypointMode === 'ci-generated-godot-web-export';
  assert.ok(existsSync(localEntry) || (fallbackRelative && existsSync(localFallback)) || generatedGodot,
    game.id + ' route must be present or explicitly declared as a CI-generated Godot entrypoint.');
  assert.ok(!('rating' in game) && !('playerCount' in game) && !('revenue' in game), game.id + ' must not contain fictional performance/social proof.');
}

for (const id of ids) assert.ok(catalog.includes('data-game="' + id + '"'), 'Catalog is missing ' + id);
assert.ok(page.includes('<link rel="canonical" href="https://osgard.world/games/platform-map/">'), 'Platform map needs a canonical URL.');
assert.ok(page.includes('id="game-search"') && page.includes('id="runtime-filter"') && page.includes('id="network-filter"') && page.includes('id="save-filter"'), 'Capability filters are incomplete.');
assert.ok(page.includes('/games/game-registry.v1.json') && page.includes('platform-map.js') && page.includes('platform-map.css'), 'Page must use its versioned registry runtime and styles.');
assert.ok(page.includes('href="https://wa.me/79640027222') && page.includes('href="mailto:osman.osmanov0099@gmail.com"'), 'Commercial/contact CTA routes are missing.');
assert.ok(!/https?:\/\/(?:cdn\.|unpkg\.com|jsdelivr\.net|fonts\.googleapis\.com)/i.test(page + runtime + styles), 'New page must not add external CDN dependencies.');
assert.ok(styles.includes('prefers-reduced-motion:reduce') && styles.includes(':focus-visible'), 'Map must honor reduced motion and keyboard focus.');
assert.ok(runtime.includes('credentials: \'same-origin\'') && runtime.includes('OSGARD_CONSENTED_ANALYTICS') && !runtime.includes('innerHTML') && !runtime.includes('sendBeacon'), 'Runtime must use safe DOM updates and the existing consent-gated analytics queue.');
assert.ok(runtime.includes('not-device-verified') && runtime.includes('fetch('), 'Runtime must surface the physical-device validation boundary and load the source registry.');
assert.ok(!runtime.includes('document.cookie') && !runtime.includes('localStorage.setItem') && !runtime.includes('sessionStorage.setItem'), 'Map must not introduce new tracking persistence.');

for (const navId of ['Карта платформы']) {
  assert.ok(catalog.includes(navId), 'Existing Games navigation must link to the new map.');
}
assert.ok(catalog.includes('/games/platform-map/'), 'Games catalog must link to the capability map.');
assert.equal((catalog.match(/href="\/games\/platform-map\//g) || []).length >= 2, true, 'Desktop/mobile navigation must both expose the map.');
assert.ok(serviceWorker.includes("CACHE_NAME = 'osgard-play-shell-v1.0.3'"), 'Service-worker shell cache version must be bumped.');
for (const path of ['/games/platform-map/','/games/platform-map/index.html','/games/platform-map/platform-map.css','/games/platform-map/platform-map.js','/games/game-registry.v1.json']) {
  assert.ok(serviceWorker.includes("'" + path + "'"), 'Service worker must include ' + path);
}
assert.ok(packageJson.scripts['qa:platform-map'], 'Dedicated platform map QA command must be registered.');
assert.ok(packageJson.scripts['qa:games-portal'].includes('npm run qa:platform-map'), 'Platform map contract must run with the existing Games QA gate.');

console.log('PASS OSGARD PLAY Signal Atlas: 11 catalogue IDs aligned, source evidence exists, routes reviewed, filters/SEO/accessibility checked, consented-only analytics retained, offline static allow-list and regression gate wired.');
