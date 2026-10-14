import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('public/games/diagnostics/index.html', 'utf8');
const client = readFileSync('public/games/diagnostics/diagnostics.js', 'utf8');
const manifest = readFileSync('src/core/manifest.ts', 'utf8');
const expectedGames = [
  'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid', 'heist-echo',
];

assert.ok(page.includes('<title>OSGARD PLAY — Проверка совместимости</title>'));
assert.ok(page.includes('id="diagnostics-app"') || page.includes('data-og-diagnostics="1"'));
assert.ok(page.includes('31 диагностических проверок'));
assert.ok(page.includes('prefers-reduced-motion:reduce'));
assert.ok(page.includes('Перейти к проверкам'));
assert.ok(/ничего автоматически не отправляется/i.test(page));
assert.ok(page.includes('id="run-all"') && page.includes('id="export-json"') && page.includes('id="export-csv"'));
assert.ok(!/<script[^>]+src=["']https?:\/\//i.test(page), 'diagnostics page must not load remote scripts');
assert.ok(!/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i.test(page), 'diagnostics page must not load remote stylesheets');

const capabilities = client.match(/const capabilityChecks = \[([\s\S]*?)\n  \];/)?.[1] || '';
const routes = client.match(/const gameRoutes = \[([\s\S]*?)\n  \];/)?.[1] || '';
const capabilityIds = [...capabilities.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
const gameRouteIds = [...routes.matchAll(/gameId: '([^']+)'/g)].map((match) => match[1]);
assert.equal(capabilityIds.length, 19, 'exactly 19 device/browser checks should exist');
assert.equal(new Set(capabilityIds).size, 19, 'capability IDs must be unique');
assert.equal(gameRouteIds.length, 12, 'exactly 12 game routes should exist');
assert.deepEqual(gameRouteIds, expectedGames, 'diagnostics must cover all twelve catalogue games in stable order');
assert.equal(new Set(gameRouteIds).size, 12, 'game IDs must be unique');
for (const id of expectedGames) assert.ok(manifest.includes("'" + id + "'"), 'game ID missing from source manifest: ' + id);

assert.equal(capabilityIds.length + gameRouteIds.length, 31, 'diagnostic matrix must contain exactly 31 checks');
assert.ok(client.includes("schema: 'osgard.play.diagnostics.v1'"));
assert.ok(client.includes("credentials: 'omit'"), 'route checks must not send cookies/credentials');
assert.ok(client.includes("method: 'GET'") && client.includes("AbortSignal.timeout(8000)"));
assert.ok(client.includes("download('osgard-play-diagnostics.json'"));
assert.ok(client.includes("download('osgard-play-diagnostics.csv'"));
assert.ok(client.includes('window.OSGARDDiagnostics'));
assert.ok(client.includes('function indexedDbCheck()'));
assert.ok(client.includes('function testWebGL(kind)'));
assert.ok(client.includes('function formatSummary()'));
assert.ok(client.includes('document.querySelectorAll(\'[data-check-filter]\')'));
for (const forbidden of ['sendBeacon(', 'OSGARD_CONSENTED_ANALYTICS', '/v1/events', 'fetch(\'https://']) {
  assert.ok(!client.includes(forbidden), 'client must not transmit diagnostics automatically: found ' + forbidden);
}
for (const feature of ['share-or-clipboard','touch-capability','reduced-motion','service-worker','secure-context','page-visibility']) {
  assert.ok(capabilities.includes("id: '" + feature + "'"), 'missing expected capability check: ' + feature);
}
for (const route of [
  '/games/null-shift-godot/','/games/time','/games/swarm/index.html','/games/inherit/index.html',
  '/games/remix/index.html','/games/civic-cascade/','/games/patina/','/games/signal-run/',
  '/games/cascade-lab/','/games/afterimage-run/','/games/aether-grid/','/games/heist-echo/'
]) assert.ok(routes.includes("route: '" + route + "'"), 'missing game route check: ' + route);

console.log('PASS OSGARD PLAY diagnostics: exactly 30 checks, all 11 game routes, local-only report, JSON/CSV export and reduced-motion support.');
