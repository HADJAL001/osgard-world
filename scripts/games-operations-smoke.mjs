import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const productionMatrix = readFileSync('scripts/production-route-matrix.mjs', 'utf8');

const page = readFileSync('public/games/operations/index.html', 'utf8');
const match = page.match(/const TARGETS = (\[[\s\S]*?\n  \]);/);
assert.ok(match, 'Operations console must declare an explicit, inspectable route target list');
const targets = JSON.parse(JSON.stringify(vm.runInNewContext('(' + match[1] + ')')));
const ids = targets.map((target) => target.id);
const paths = targets.map((target) => target.path);
assert.equal(new Set(ids).size, ids.length, 'Route target IDs must be unique');
assert.equal(new Set(paths).size, paths.length, 'Route target paths must be unique');
assert.ok(targets.length >= 18, 'Operations checks should cover games, business pages and security boundaries');
assert.ok(targets.every((target) => target.path.startsWith('/') && !/^https?:/i.test(target.path)), 'All probes must stay on same-origin relative paths');

const byId = Object.fromEntries(targets.map((target) => [target.id, target]));
const requiredGameRoutes = {
  time: '/games/time',
  'null-shift-godot': '/games/null-shift-godot/index.html',
  'null-shift-webgl': '/games/null-shift/index.html',
  swarm: '/games/swarm/',
  inherit: '/games/inherit/',
  remix: '/games/remix/',
  'civic-cascade': '/games/civic-cascade/',
  patina: '/games/patina/',
  'signal-run': '/games/signal-run/',
  'cascade-lab': '/games/cascade-lab/',
  'afterimage-run': '/games/afterimage-run/',
};
for (const [id, path] of Object.entries(requiredGameRoutes)) {
  assert.equal(byId[id]?.path, path, 'Game runtime route changed or is missing: ' + id);
  assert.ok(byId[id].marker, 'Game route needs a source marker to reject generic SPA fallback: ' + id);
}
assert.equal(byId.catalog?.path, '/games/', 'Canonical game catalogue route is missing');
assert.equal(byId.economics?.path, '/games/monetization/', 'Scenario economy page must be checked');
assert.equal(byId.privacy?.path, '/privacy/', 'Privacy page must be checked');
assert.equal(byId.terms?.path, '/terms/', 'Terms page must be checked');
assert.equal(byId['commerce-config']?.type, 'json', 'Public commerce configuration must be read as JSON');
assert.deepEqual(byId['analytics-auth']?.expectedStatuses, [401, 403], 'Protected analytics must reject unauthenticated requests with HTTP 401/403');
assert.equal(byId['analytics-auth']?.type, 'json', 'Protected analytics rejection must be JSON rather than the SPA fallback');

for (const contract of [
  'name="robots" content="noindex,nofollow,noarchive"',
  "credentials: 'omit'",
  "method: 'GET'",
  'new AbortController()',
  '8000',
  'data-estimate="not-live-data"',
  'OSGARD Partner Inventory Editor',
  'OSGARD LIVEOPS',
  'response.status',
  'content-type',
  'Контрольный маркер страницы не найден',
  'Commerce API не настроен',
  'URL.createObjectURL',
  'osgard-games-route-health-',
  'navigator.clipboard.writeText',
  'prefers-reduced-motion:reduce',
  'cookiesSent:false',
  'analyticsEventsCreated:false',
]) {
  assert.ok(page.toLowerCase().includes(contract.toLowerCase()), 'Missing quality/privacy contract in operations page: ' + contract);
}
assert.ok(!/<script\b[^>]*\bsrc=["']https?:\/\//i.test(page), 'Operations console must not load third-party scripts');
assert.ok(!/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']https?:\/\//i.test(page), 'Operations console must not load third-party stylesheets');
assert.ok(!/localStorage|sessionStorage|document\.cookie/i.test(page), 'Read-only route health must not persist browser data or read cookies');
assert.ok(page.includes("'/commerce-api/healthz'") && page.includes("health.service === 'osgard-commerce-api'") && page.includes("health.databaseReady === true"), 'Operations console must safely probe the first-party API before warning about blank static config')
assert.ok(productionMatrix.includes("route === '/games/operations/'") && productionMatrix.includes("reportType:'osgard-games-readonly-route-health'"), 'Production route matrix must recognize the operations console rather than fall through to the SPA root contract');
assert.ok(productionMatrix.includes("content.includes('analytics-pending.v1')") && productionMatrix.includes("content.includes('/v1/events')"), 'Published minified consent analytics must be checked with stable behavior markers');
assert.ok(!productionMatrix.includes("content.includes('MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000')") && !productionMatrix.includes("content.includes('result?.accepted')"), 'Production matrix must not rely on spacing or identifiers rewritten by minification');
assert.ok(!/\b(?:POST|PUT|PATCH|DELETE)\b/.test(page), 'Route health must not mutate service state');
assert.ok(page.includes('status:response.status') && page.includes('checkedAt:new Date().toISOString()'), 'JSON report must preserve actual HTTP status and check time');
assert.ok(page.includes('HTTP-ответ совпадает с базовым контрактом') && page.includes('не доказывает успешный запуск игры'), 'UI must clearly distinguish route availability from playable runtime validation');
assert.ok(page.includes("if (state !== 'fail') state = 'warn'"), 'Build-marker warnings must never downgrade failed route checks');
assert.ok(page.includes('const startedAt = new Date().toISOString()') && page.includes('startedAt, finishedAt:new Date().toISOString()'), 'Export report must capture distinct start and finish timestamps');

const reliabilityTool = readFileSync('public/games/player-reliability.js', 'utf8');
const preferencesTool = readFileSync('public/games/player-preferences-backup.js', 'utf8');
for (const [id, route, marker] of [
  ['player-reliability', '/games/player-reliability.js', 'osgard.play-support-report'],
  ['player-preferences-backup', '/games/player-preferences-backup.js', 'osgard.player-preferences'],
  ['player-tools-css', '/games/player-tools.css', '.player-reliability-hint'],
]) {
  assert.equal(byId[id]?.path, route, 'Player tool must be monitored by the operations console: ' + id);
  assert.ok(byId[id].marker === marker, 'Player tool health check must have a stable body marker: ' + id);
  assert.ok(productionMatrix.includes("'" + route + "'"), 'Production route matrix must check the player tool: ' + route);
}
assert.ok(page.includes("credentials: 'omit'") && page.includes("method: 'GET'"), 'Operations probes must remain read-only and credential-free');
assert.ok(reliabilityTool.includes('window.OSGARDPlayerReliability') && !reliabilityTool.includes('fetch(') && !reliabilityTool.includes('sendBeacon(') && !reliabilityTool.includes('XMLHttpRequest'), 'Diagnostics must remain local and not transmit reports');
assert.ok(preferencesTool.includes('window.OSGARDPreferencesBackup') && preferencesTool.includes('window.confirm'), 'Collection restore must validate schema and require confirmation');
console.log('PASS OSGARD Games operations console: ' + targets.length + ' route contracts, 11 game/runtime entrypoints, same-origin GET-only checks, privacy boundary and JSON export.');
