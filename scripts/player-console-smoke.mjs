import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const base = new URL('../public/games/', import.meta.url);
const js = await readFile(new URL('player-console.js', base), 'utf8');
const css = await readFile(new URL('player-console.css', base), 'utf8');
const loader = await readFile(new URL('luxury.js', base), 'utf8');
const productionMatrix = await readFile(new URL('./production-route-matrix.mjs', import.meta.url), 'utf8');

test('Player Console is lazy-loaded by the existing catalogue enhancement', () => {
  assert.match(loader, /player-console\.js/);
  assert.match(loader, /player-console\.css/);
});
test('all 30 product improvements have code contracts', () => {
  for (const token of [
    'og-pc-launcher', 'showModal()', "event.key !== '?'",
    'stats.launches', 'secondsByGame', 'visibleGenresForLog',
    'localBadgeList', 'renderNextGame', 'MAX_QUEUE = 5',
    'queue.includes(id)', 'moveQueue(index, -1)', 'data-pc-queue-add',
    'playQueueHead', 'persistQueue()', 'data-pc-challenge-fill',
    'utm_campaign', 'navigator.share', 'navigator.clipboard',
    "attempt('HEAD')", "attempt('GET')", '6000',
    "addEventListener('online'", "addEventListener('offline'",
    'navigator.storage.estimate', "getContext('webgl2')",
    "getEntriesByType('resource')", 'exportData()',
    'validateImportedStats', 'clearLocalData()',
    'og-pc-reduced-motion', 'og-pc-high-contrast', 'data-pc-scale'
  ]) assert.ok(js.includes(token), 'Missing contract: ' + token);
});
test('catalogue checks remain same-origin and do not send events to third parties', () => {
  assert.match(js, /route\.origin !== location\.origin/);
  assert.match(js, /credentials: 'same-origin'/);
  assert.doesNotMatch(js, /https:\/\/(?!osgard\.world)[a-z0-9.-]+\/(v1\/events|collect|analytics)/i);
  assert.doesNotMatch(js, /localStorage\.getItem\(['"]osgard\.auth\.accessToken/);
});
test('personal-data import is capped and accepts only a known schema', () => {
  assert.match(js, /MAX_IMPORT_BYTES = 100 \* 1024/);
  assert.match(js, /parsed\.format !== 'osgard-player-console'/);
  assert.match(js, /parsed\.schema !== 1/);
  assert.match(js, /new Date\(row\.at\)\.toISOString\(\)/);
});
test('lifetime Player Lab aggregates survive the bounded recent-launch log', () => {
  assert.match(js, /MAX_LOG = 1000/);
  assert.match(js, /MAX_TOTAL_LAUNCHES = 10000000/);
  assert.match(js, /MAX_ACTIVITY_DAYS = 4000/);
  assert.match(js, /Math\.max\(raw\.totalLaunches, launches\.length\)/, 'Legacy imports must derive a minimum lifetime count from existing history');
  assert.match(js, /stats\.totalLaunches = Math\.min\(MAX_TOTAL_LAUNCHES, stats\.totalLaunches \+ 1\)/);
  assert.match(js, /stats\.gameIdsEver = \[\.\.\.new Set\(\[\.\.\.stats\.gameIdsEver, id\]\)\]/);
  assert.match(js, /stats\.activityDays = \[\.\.\.new Set\(\[\.\.\.stats\.activityDays, dateKey\(activeWallAt\)\]\)\]/);
  assert.match(js, /const unique = stats\.gameIdsEver\.length/);
  assert.match(js, /const days = stats\.activityDays\.length/);
  assert.match(js, /return \{ schema: 1, launches, totalLaunches, gameIdsEver, activityDays, secondsByGame, completions \}/, 'Exports/imports must preserve the validated aggregates');
});
test('activity-day validator accepts real calendar dates and rejects impossible ones', () => {
  const start = js.indexOf('function isValidDateKey(value) {');
  const end = start >= 0 ? js.indexOf('\n  }', start) : -1;
  const helper = start >= 0 && end >= 0 ? js.slice(start, end + 4) : '';
  assert.ok(helper, 'Player Lab must define a strict activity-day validator');
  const validate = new Function(helper + '; return isValidDateKey;')();
  assert.equal(validate('2026-10-14'), true);
  assert.equal(validate('2024-02-29'), true);
  assert.equal(validate('2026-02-29'), false);
  assert.equal(validate('2026-02-30'), false);
  assert.equal(validate('2026-1-2'), false);
  assert.equal(validate('not-a-date'), false);
});
test('Player Lab measures visible game time with a monotonic clock', () => {
  assert.match(js, /const monotonicNow = \(\) =>[\s\S]*performance\.now\(\)/);
  assert.match(js, /activeStartedMonotonic = monotonicNow\(\)/);
  assert.match(js, /const now = monotonicNow\(\)/);
  assert.ok(js.includes("document.addEventListener('visibilitychange', () => {") && js.includes("if (document.hidden && activeGame && $('#player-dialog')?.open)") && js.includes('lastTick = now;'), 'Visible-session time must be committed when the tab becomes hidden');
  assert.ok(js.includes('stats.secondsByGame[activeGame] = (stats.secondsByGame[activeGame] || 0) + delta'), 'Visible time must accrue against the active game');
  assert.ok(js.includes('Math.min(10, (now - lastTick) / 1000)'), 'Long background suspension must not be charged as visible play time');
  assert.match(js, /new Date\(activeWallAt\)\.toISOString\(\)/, 'Launch timestamps must remain wall-clock dates');
  assert.doesNotMatch(js, /\(Date\.now\(\) - lastTick\) \/ 1000/, 'Session duration must not be derived from wall-clock changes');
});
test('the interface has responsive touch and reduced-motion contracts', () => {
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /og-pc-reduced-motion/);
  assert.match(css, /og-pc-high-contrast/);
  assert.match(css, /--og-pc-scale/);
});
test('production route matrix checks the published Player Lab assets', () => {
  assert.match(productionMatrix, /'\\/games\\/player-console\\.js'/);
  assert.match(productionMatrix, /'\\/games\\/player-console\\.css'/);
  assert.ok(productionMatrix.includes("text.includes('window.OSGARDPlayerConsole')"), 'Production smoke must identify the Player Lab JavaScript bundle');
  assert.ok(productionMatrix.includes("text.includes('.og-pc-high-contrast')"), 'Production smoke must identify the Player Lab stylesheet');
});
test('all UI content is constructed without interpolating untrusted HTML', () => {
  assert.match(js, /\.textContent\s*=\s*[^;\n]*game\.title/, 'Game titles must be inserted through a textContent sink');
  assert.match(js, /document\.createElement\('a'\)/);
  assert.match(js, /dialog\.innerHTML = \[/);
  assert.doesNotMatch(js, /insertAdjacentHTML|outerHTML\s*=|document\.write\s*\(/, 'UI must not add untrusted catalog values through HTML-writing sinks');
});
