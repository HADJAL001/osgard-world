import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/reliability-atlas.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/games/cascade-lab/service-worker.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/reliability-atlas.js', import.meta.url));
const api = globalThis.__CASCADELAB027_TEST__;

assert.ok(api && api.version === '0.27.0', 'pure Reliability Atlas API must be available');
assert.match(html, /osgard-game-version" content="0\\.27\\.0-reliability-atlas"/, 'game version must identify v0.27.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\\.27\\.0<\\/title>/, 'document title must identify v0.27.0');
assert.ok(html.includes('id="CASCADELAB027"') && html.includes('reliability-atlas.js?v=0.27.0'), 'Reliability Atlas loader must be versioned');
assert.ok(html.includes('name="osgard-game-pwa" content="0.27.0-offline-reliability-atlas"'), 'PWA and game shell release markers must be aligned');
assert.ok(worker.includes("CACHE=PREFIX+'v0.27.0'") && worker.includes("'./reliability-atlas.js?v=0.27.0'"), 'offline cache must include the new analytics module');
assert.doesNotMatch(source, /\\b(?:fetch|XMLHttpRequest|sendBeacon)\\s*\\(/, 'Reliability Atlas must not transmit the archive');
assert.ok(!source.includes('.innerHTML'), 'all untrusted strings must use text-safe DOM APIs');
for (const feature of ['function blueprintSignature(','function wilsonInterval(','function trajectorySpread(','function summarizeGroup(','function validateArchive(','MAX_RUNS = 50','MAX_FRAMES = 41','MAX_IMPORT_BYTES = 400 * 1024','Wilson 95%','function csvCell(']) {
  assert.ok(source.includes(feature), 'Reliability Atlas feature missing: ' + feature);
}

function makeRun(index, overrides = {}) {
  return {
    id: 'run-' + String(index).padStart(2, '0'),
    at: new Date(Date.UTC(2026, 9, 14, 8, 0, index)).toISOString(),
    status: 'won',
    levelId: 2,
    levelTitle: 'Второй этаж',
    mode: 'campaign',
    dailyDate: null,
    timeSeconds: 4 + index * 0.01,
    deviceCount: 2,
    devices: [
      { type: 'spring', x: 210, y: 390, angle: -0.7 },
      { type: 'bumper', x: 590, y: 440, angle: 0.2 }
    ],
    par: 2,
    grade: 'A',
    reason: '',
    trajectory: Array.from({ length: 41 }, (_, i) => ({
      t: i * 0.1, x: 100 + i * 5, y: 400 + i * 0.25, vx: 50, vy: 2
    })),
    telemetry: { events: [] },
    ...overrides
  };
}
const first = api.normalizeRun(makeRun(1));
const second = api.normalizeRun(makeRun(2));
assert.ok(first && second, 'well-formed completed runs must normalize');
assert.equal(api.blueprintSignature(first), api.blueprintSignature(second), 'identical layouts must map to the same cohort');
const shuffled = api.normalizeRun(makeRun(3, { devices: makeRun(3).devices.slice().reverse() }));
assert.equal(api.blueprintSignature(first), api.blueprintSignature(shuffled), 'device order must not alter the blueprint signature');
const changedAngle = api.normalizeRun(makeRun(4, { devices: [
  { type: 'spring', x: 210, y: 390, angle: -0.6 },
  { type: 'bumper', x: 590, y: 440, angle: 0.2 }
]}));
assert.notEqual(api.blueprintSignature(first), api.blueprintSignature(changedAngle), 'a changed design variable must create a separate cohort');
const differentMode = api.normalizeRun(makeRun(5, { mode: 'daily', dailyDate: '2026-10-14' }));
assert.notEqual(api.blueprintSignature(first), api.blueprintSignature(differentMode), 'campaign and daily trials must not be pooled');

const cohortRuns = [
  first,
  api.normalizeRun(makeRun(2, { timeSeconds: 4.2 })),
  api.normalizeRun(makeRun(3, { status: 'lost', grade: '—', reason: 'Груз покинул трассу', timeSeconds: 4.3,
    trajectory: Array.from({ length: 41 }, (_, i) => ({ t: i * 0.1, x: 100 + i * 5 + 1, y: 400 + i * 0.25, vx: 50, vy: 2 })) }))
];
const groups = api.groupRuns(cohortRuns);
assert.equal(groups.length, 1, 'same blueprint should form one reliability cohort');
const stats = groups[0];
assert.equal(stats.n, 3);
assert.equal(stats.successes, 2);
assert.equal(stats.failures, 1);
assert.equal(stats.rate, 0.6667);
assert.ok(stats.ci.low < stats.rate && stats.ci.high > stats.rate, 'Wilson interval must contain the observed rate for this sample');
assert.equal(stats.ci.method, 'Wilson 95%');
assert.ok(stats.trajectory.meanPx > 0, 'divergent repeat trajectory must produce a non-zero spread estimate');
assert.match(stats.recommendation, /разные исходы/, 'mixed outcomes on identical design must trigger repeatability guidance');
assert.equal(stats.sampleStrength, 'early');

const deterministic = api.summarizeGroup([first, second]);
assert.equal(deterministic.trajectory.meanPx, 0, 'identical normalized paths must have zero spatial spread');
assert.equal(deterministic.trajectory.p95Px, 0);
assert.equal(deterministic.n, 2);
assert.match(deterministic.recommendation, /минимум 3/, 'two runs should not be presented as a strong sample');

const single = api.wilsonInterval(1, 1);
assert.ok(single && single.low > 0 && single.high < 1, 'a single success must not be represented as certainty');
assert.equal(api.trajectorySpread([first]).meanPx, null, 'one trajectory cannot establish between-run spread');

const goodArchive = api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, runs: cohortRuns });
assert.equal(goodArchive.ok, true);
assert.equal(goodArchive.archive.runs.length, 3);
assert.equal(api.validateArchive({ schema: 'unknown', schemaVersion: 1, runs: [] }).ok, false);
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, runs: [first, first] }).ok, false, 'duplicate IDs must be rejected');
const tooMany = Array.from({ length: 51 }, (_, i) => api.normalizeRun(makeRun(i + 1)));
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, runs: tooMany }).ok, false, 'archive must be bounded to 50 attempts');
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, runs: [first], note: 'x'.repeat(410000) }).ok, false, 'oversized JSON must be rejected before normalization');
assert.equal(api.normalizeRun(makeRun(8, { trajectory: [{ t: 0, x: 1, y: 1 }] })), null, 'incomplete traces must be rejected');

assert.equal(api.csvCell('a,"b"'), '"a,""b"""');
assert.equal(api.csvCell('=SUM(A1:A3)'), '"\'=SUM(A1:A3)"', 'CSV formula-leading text must be neutralized');
const isolated = {};
runInNewContext(source, isolated);
assert.ok(isolated.__CASCADELAB027_TEST__ && isolated.__CASCADELAB027_TEST__.version === '0.27.0', 'pure API must not require a browser or network');
console.log('CASCADE LAB Reliability Atlas smoke: PASS — exact-blueprint cohorts, Wilson confidence interval, path dispersion, reproducibility guidance, bounded archives and local-only export.');
