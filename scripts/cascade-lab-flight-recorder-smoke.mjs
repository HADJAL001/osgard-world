import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/flight-recorder.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/flight-recorder.js', import.meta.url));
const api = globalThis.__CASCADELAB020_TEST__;

assert.ok(api && api.version === '0.20.0', 'pure Flight Recorder test API must be available');
assert.equal(api.maxRuns, 12);
assert.equal(api.maxSamples, 180);
assert.match(html, /osgard-game-version" content="0\.20\.0-flight-recorder"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.20\.0<\/title>/);
assert.ok(html.includes('id="CASCADELAB019"') && html.includes('engineering-suite.js?v=0.19.0'), 'Engineering OS must remain compatible');
assert.ok(html.includes('id="CASCADELAB020"') && html.includes('flight-recorder.js?v=0.20.0'), 'Flight Recorder must be included with cache busting');
assert.ok(html.includes("new CustomEvent('cascade-lab:run-finished'") && html.includes('trace: (physics.history || []).slice(0, 420)'), 'completed run event must carry actual recorded physics history');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Flight Recorder must not send traces over the network');
assert.ok(!source.includes('.innerHTML'), 'Flight Recorder must build the UI through safe DOM methods');
for (const marker of ['MAX_RUNS = 12','MAX_SAMPLES = 180','MAX_ARCHIVE_BYTES = 120 * 1024','function samplePoints(','function validateArchive(','function compareRuns(','flight-event','velocity-vector','prefers-reduced-motion','localStorage','cascade-lab:run-finished']) {
  assert.ok(source.includes(marker), 'Flight Recorder capability missing: ' + marker);
}

const points = Array.from({ length: 420 }, (_, i) => ({
  t: i / 12, x: i * 2, y: 260 + Math.sin(i / 17) * 90,
  vx: 140 + i, vy: Math.cos(i / 17) * 60, gateOpen: i > 200, checkpoints: []
}));
const sampled = api.samplePoints(points);
assert.equal(sampled.length, 180, 'trajectory should be bounded to 180 samples');
assert.equal(sampled[0].t, points[0].t, 'sampling must preserve the beginning');
assert.equal(sampled.at(-1).t, points.at(-1).t, 'sampling must preserve the final point');
assert.ok(sampled.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), 'sample points must contain safe finite coordinates');

function run(overrides = {}) {
  return {
    id: 'trace-A', capturedAt: '2026-10-14T03:00:00.000Z', levelId: 3, levelTitle: 'Красный шлюз',
    status: 'lost', reason: 'Шлюз закрыт', timeSeconds: 4.2, deviceCount: 3,
    telemetry: { peakSpeed: 500, lastImpactSpeed: 280, contacts: 4, activations: 3 },
    events: [{ type: 'switch', label: 'Контакт активирован', t: 1.5, x: 350, y: 260, speed: 240 }],
    trace: points.slice(0, 30), ...overrides
  };
}
const normal = api.normaliseRun(run());
assert.ok(normal);
assert.equal(normal.points.length, 30);
assert.equal(normal.events.length, 1);
assert.equal(api.normaliseRun(run({ trace: [{ t: 0, x: 0, y: 1 }] })), null, 'a run needs at least two trace points');
const later = api.normaliseRun(run({
  id: 'trace-B', capturedAt: '2026-10-14T03:01:00.000Z', status: 'won',
  timeSeconds: 3.5, deviceCount: 2, trace: points.slice(20, 60)
}));
const delta = api.compareRuns(later, normal);
assert.equal(delta.outcome, 'recovered');
assert.equal(delta.secondsDelta, -0.7);
assert.equal(delta.deviceDelta, -1);
assert.equal(api.compareRuns(later, api.normaliseRun(run({ id: 'other-level', levelId: 4 }))), null, 'overlays must be limited to the same level');

const accepted = api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [normal, later] });
assert.equal(accepted.ok, true);
assert.equal(accepted.archive.runs.length, 2);
assert.equal(api.validateArchive({ schema: 'other', schemaVersion: 1, runs: [] }).ok, false);
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [normal, normal] }).ok, false, 'duplicate IDs must be rejected');
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: Array.from({ length: 13 }, (_, i) => api.normaliseRun(run({ id: 'r' + i }))) }).ok, false, 'archive run count must be bounded');
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [{ ...normal, padding: 'x'.repeat(123000) }] }).ok, false, 'oversized archives must be rejected');
console.log('CASCADE LAB Flight Recorder smoke: PASS — trace sampling, endpoint preservation, safe normalization, local archive limits, same-level comparisons, privacy contract.');
