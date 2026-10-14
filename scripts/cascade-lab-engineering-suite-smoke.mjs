import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/engineering-suite.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/engineering-suite.js', import.meta.url));
const api = globalThis.__CASCADELAB019_TEST__;

assert.ok(api && api.version === '0.19.0', 'pure Engineering OS test API must be available');
assert.equal(api.improvements.length, 30, 'the release manifest must enumerate exactly 30 distinct improvements');
assert.match(html, /osgard-game-version" content="0\.27\.0-counterfactual-twin"/, 'CASCADE LAB metadata must identify application release 0.27.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.27\.0<\/title>/, 'the browser title must identify application release 0.27.0');
assert.ok(html.includes('id="CASCADELAB018"') && html.includes('hypothesis-lab.js?v=0.18.0'), 'the v0.18 Hypothesis Lab must remain integrated');
assert.ok(html.includes('id="CASCADELAB019"') && html.includes('engineering-suite.js?v=0.19.0'), 'Engineering OS must load with a cache-busted URL');
assert.ok(html.includes('id="CASCADELAB020"') && html.includes('data-cascade-lab-studio="0.20.0"') && html.includes('experiment-studio.js?v=0.20.0'), 'Experiment Studio 0.20 must load without replacing Engineering OS 0.19');
assert.ok(html.includes("new CustomEvent('cascade-lab:run-finished'") && html.includes("notifyOsgardLifecycle('ready', { version: '0.27.0' })"), 'game must publish a summary for completed runs');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Engineering OS must not upload game history');
assert.ok(!source.includes('.innerHTML'), 'untrusted notes and imported data must use text-safe DOM updates');
for (const item of ['MAX_RUNS = 50','MAX_IMPORT_BYTES = 200 * 1024','function cleanRun(','function validateArchive(','function compareRuns(','function diagnoseRun(','function exportCsv(','function importArchive(','controlRun','oneVariable','outcomeRecorded','aria-live','prefers-reduced-motion']) {
  assert.ok(source.includes(item), 'Engineering OS feature missing: ' + item);
}

function run(overrides = {}) {
  return {
    id: 'run-' + Math.random().toString(36).slice(2,9), at: '2026-10-14T02:00:00.000Z',
    status: 'lost', levelId: 5, levelTitle: 'Хрупкий груз', par: 4, parTime: 5,
    fragile: false, gateCount: 0, gateOpen: false, reason: 'Контейнер покинул трассу',
    timeSeconds: 3, position: { x: 1040, y: 480 }, velocity: { x: 420, y: 120 },
    grade: '—', deviceCount: 1, devices: [{ type: 'spring', x: 200, y: 400, angle: -0.7 }],
    checkpoints: [], checkpointsReached: [],
    telemetry: { distance: 410, peakSpeed: 455, impacts: 1, contacts: 1, activations: 1, lastImpactSpeed: 540,
      events: [{ type: 'spring', label: 'Пружина сработала', t: 1 }, { type: 'fall', label: 'Груз покинул трассу', t: 3 }] },
    ...overrides
  };
}

const fall = api.diagnoseRun(run());
assert.equal(fall.kind, 'fall');
assert.match(fall.evidence.join(' '), /1040/);
assert.match(fall.hypothesis, /не доказывает/);
assert.match(fall.nextTest, /только один угол/);

const impact = api.diagnoseRun(run({
  fragile: true, reason: 'Слишком жёсткое приземление: хрупкий контейнер повреждён',
  telemetry: { lastImpactSpeed: 640, events: [{ type: 'landing', label: 'Приземление · 640 px/s', t: 2 }, { type: 'damage', label: 'Хрупкий груз повреждён', t: 2.1 }] }
}));
assert.equal(impact.kind, 'impact');
assert.match(impact.evidence.join(' '), /640 px\/s/);

const checkpoint = api.diagnoseRun(run({
  reason: 'Маршрут не завершён: пропущена контрольная точка верхний сканер',
  checkpoints: [{ id: 'scan', label: 'Верхний сканер', x: 590, y: 350 }],
  checkpointsReached: [], telemetry: { events: [{ type: 'goal-missed', label: 'Финиш недоступен: пропущена контрольная точка', t: 4 }] }
}));
assert.equal(checkpoint.kind, 'checkpoint');
assert.match(checkpoint.evidence.join(' '), /Верхний сканер/);

const gate = api.diagnoseRun(run({
  levelId: 4, levelTitle: 'Красный шлюз', gateCount: 1, gateOpen: false,
  devices: [{ type: 'switch', x: 705, y: 456, angle: 0 }], switchZone: { x: 705, y: 456 }
}));
assert.equal(gate.kind, 'gate');
assert.match(gate.nextTest, /Контакт/);

const timeout = api.diagnoseRun(run({
  reason: 'Время симуляции истекло', timeSeconds: 28,
  telemetry: { events: [{ type: 'timeout', label: 'Лимит времени превышен', t: 28 }] }
}));
assert.equal(timeout.kind, 'timeout');
assert.match(timeout.evidence.join(' '), /28/);

const success = api.diagnoseRun(run({
  status: 'won', reason: '', timeSeconds: 4.2, par: 2, parTime: 3,
  position: { x: 900, y: 460 }, deviceCount: 4,
  telemetry: { peakSpeed: 320, activations: 2, lastImpactSpeed: 120, events: [] }
}));
assert.equal(success.kind, 'success');
assert.match(success.nextTest, /ровно одну деталь/);

const review = api.diagnoseRun(run({ reason: 'Неизвестное состояние', telemetry: { events: [] } }));
assert.equal(review.kind, 'review');

const cleanA = api.cleanRun(run({ id: 'A', levelId: 1, status: 'won', reason: '', at: '2026-10-14T01:00:00.000Z', timeSeconds: 6, deviceCount: 4 }));
const cleanB = api.cleanRun(run({ id: 'B', levelId: 1, status: 'won', reason: '', at: '2026-10-14T01:01:00.000Z', timeSeconds: 4.8, deviceCount: 3,
  telemetry: { peakSpeed: 390, lastImpactSpeed: 200, activations: 2, distance: 500, impacts: 2, contacts: 2, events: [] }
}));
const comparison = api.compareRuns(cleanB, cleanA);
assert.equal(comparison.secondsDelta, -1.2);
assert.equal(comparison.devicesDelta, -1);
assert.equal(comparison.outcome, 'unchanged');
assert.equal(api.compareRuns(cleanB, api.cleanRun(run({ id: 'other', levelId: 2 }))), null, 'comparisons must be same-level only');

const valid = api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [cleanA, cleanB] });
assert.equal(valid.ok, true);
assert.equal(valid.archive.runs.length, 2);
assert.equal(api.validateArchive({ schema: 'unknown', schemaVersion: 1, runs: [] }).ok, false);
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [cleanA, cleanA] }).ok, false, 'duplicate IDs must be rejected');
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: Array.from({length:51}, (_,i) => api.cleanRun(run({id:'r'+i,levelId:1}))) }).ok, false, 'archive must be bounded to 50 records');
assert.equal(api.validateArchive({ schema: api.schema, schemaVersion: 1, runs: [{...cleanA,note:'x'.repeat(205000)}] }).ok, false, 'oversized data must be rejected');

assert.equal(api.csvEscape('a,"b"'), '"a,""b"""');
console.log('CASCADE LAB Engineering OS smoke: PASS — 30 enumerated improvements, six diagnostic branches, same-level deltas, bounded JSON import/export and local-only data.');
