import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/reproducibility-lab.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/games/cascade-lab/service-worker.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const routeMatrix = readFileSync(new URL('./production-route-matrix.mjs', import.meta.url), 'utf8');

await import(new URL('../public/games/cascade-lab/reproducibility-lab.js', import.meta.url));
const api = globalThis.__CASCADELAB027_TEST__;

assert.ok(api && api.version === '0.27.0', 'Reproducibility Lab pure API must load');
assert.equal(api.improvements.length, 7, 'release must enumerate exactly seven substantial improvements');
assert.equal(api.schema, 'osgard.cascade-lab.reproducibility-lab.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.reproducibility-archive.v1');
assert.equal(api.maxRuns, 30);
assert.equal(api.maxFrames, 420);
assert.equal(api.maxImportBytes, 320 * 1024);
assert.match(html, /osgard-game-version" content="0\.27\.0-reproducibility-lab"/);
assert.match(html, /osgard-game-pwa" content="0\.27\.0-offline-reproducibility"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.27\.0<\/title>/);
assert.ok(html.includes('id="CASCADELAB027"') && html.includes('reproducibility-lab.js?v=0.27.0') && html.includes('data-cascade-lab-reproducibility="0.27.0"'));
assert.ok(html.includes("notifyOsgardLifecycle('ready', { version: '0.27.0' })"), 'parent-portal lifecycle must reflect the release');
assert.ok(html.includes("engineVersion: '0.27.0'") && html.includes('simulationProfile: {') && html.includes('WORLD.fixedStep'), 'finished runs must provide engine and physics-profile metadata');
assert.ok(html.includes("new CustomEvent('cascade-lab:run-finished'") && html.includes("cascade-lab:repeat-identical-run-request"), 'completed runs and controlled repeats must be wired');
assert.ok(html.includes("request.engineVersion !== '0.27.0'") && source.includes("if(run.engineVersion!=='0.27.0')"), 'controlled repeats must not silently compare across physics-engine versions');
assert.ok(source.includes('simulationProfile:run.simulationProfile') && html.includes('JSON.stringify(request.simulationProfile) !== JSON.stringify(currentProfile)'), 'controlled repeat must match the captured level geometry and full physics profile');
assert.ok(!source.includes('fetch(') && !source.includes('XMLHttpRequest') && !source.includes('sendBeacon('), 'the reliability lab must not transmit run history');
assert.ok(!source.includes('.innerHTML'), 'imported data and notes must not be rendered through HTML interpolation');
assert.ok(worker.includes("CACHE=PREFIX+'v0.27.1'") && worker.includes("'./reproducibility-lab.js?v=0.27.0'"), 'offline cache must include the new versioned module');
assert.ok(html.includes("navigator.serviceWorker.register('./service-worker.js?v=0.27.1'"), 'service-worker registration must match the v0.27 cache');
assert.ok(packageJson.scripts['qa:cascade-lab-reproducibility'].includes('cascade-lab-reproducibility-lab-smoke.mjs'));
assert.ok(packageJson.scripts['qa:games-detail'].includes('qa:cascade-lab-reproducibility'));
assert.ok(routeMatrix.includes("'/games/cascade-lab/reproducibility-lab.js'") && routeMatrix.includes("const VERSION = '0.27.0'"), 'production route matrix must verify the new public asset');

const profile = {
  world: { width: 1000, height: 560, gravity: 1060, radius: 12, fixedStep: 1 / 120 },
  level: {
    id: 2, start: { x: 88, y: 474 }, goal: { x: 892, y: 463, w: 62, h: 26 },
    platforms: [{ x: 34, y: 486, w: 232, h: 28 }, { x: 356, y: 414, w: 210, h: 28 }],
    scenery: [{ x: 292, y: 386, w: 16, h: 100 }], gates: [],
    switchZone: null, checkpoints: [{ id: 'high-scan', x: 590, y: 350, radius: 30 }]
  }
};
const trace = (offset = 0) => [
  { t: 0, x: 88, y: 474, vx: 0, vy: 0, gateOpen: false, checkpoints: [] },
  { t: 0.5, x: 220 + offset, y: 420, vx: 260, vy: -90, gateOpen: false, checkpoints: [] },
  { t: 1, x: 390 + offset, y: 380, vx: 210, vy: 15, gateOpen: false, checkpoints: [] },
  { t: 1.5, x: 590 + offset, y: 350, vx: 150, vy: 20, gateOpen: false, checkpoints: ['high-scan'] },
  { t: 2, x: 892 + offset, y: 463, vx: 0, vy: 0, gateOpen: false, checkpoints: ['high-scan'] }
];
function makeRun(id, overrides = {}) {
  return api.normalizeRun({
    id, runId: id, at: '2026-10-14T10:00:00.000Z', engineVersion: '0.27.0',
    levelId: 2, levelTitle: 'Второй этаж', status: 'won', mode: 'campaign', dailyDate: null,
    simulationProfile: profile, devices: [{ type: 'spring', x: 190, y: 420, angle: -Math.PI / 4 }],
    timeSeconds: 2, grade: 'A', telemetry: {
      distance: 510, peakSpeed: 440, lastImpactSpeed: 90, impacts: 1, contacts: 2, activations: 1,
      events: [{ type: 'spring', label: 'Пружина активирована', t: 0.4 }, { type: 'goal', label: 'Доставка подтверждена', t: 2 }]
    },
    trajectory: trace(), ...overrides
  });
}

const baseline = makeRun('base');
const repeat = makeRun('repeat', { at: '2026-10-14T10:01:00.000Z', timeSeconds: 2 });
assert.ok(baseline && repeat, 'complete run summaries with engine profiles must normalize');
assert.equal(baseline.scenarioSignature, repeat.scenarioSignature, 'the same setup must have a stable fingerprint');
assert.equal(api.compareRuns(repeat, baseline).grade, 'REPRODUCIBLE', 'identical outcomes, event order, timing and trajectory must pass strict repeatability');
assert.equal(api.compareRuns(repeat, baseline).score, 100);
const cohort = api.analyzeCohort([baseline, repeat], 'repeat');
assert.equal(cohort.verdict, 'REPRODUCIBLE');
assert.equal(cohort.count, 2);
assert.equal(cohort.maxTrajectoryDeviation, 0);
assert.equal(cohort.timeSpread, 0);

const drift = makeRun('drift', {
  at: '2026-10-14T10:02:00.000Z', status: 'lost', timeSeconds: 2.4,
  trajectory: trace(20),
  telemetry: { distance: 530, peakSpeed: 450, lastImpactSpeed: 120, impacts: 2, contacts: 2, activations: 1,
    events: [{ type: 'spring', label: 'Пружина активирована', t: 0.4 }, { type: 'fall', label: 'Груз покинул трассу', t: 2.4 }] }
});
assert.equal(drift.scenarioSignature, baseline.scenarioSignature, 'outcome is not part of the physical setup fingerprint');
const driftReport = api.compareRuns(drift, baseline);
assert.equal(driftReport.grade, 'DRIFT');
assert.equal(driftReport.outcomeSame, false);
assert.ok(driftReport.trace.meanDeviation > 0);
assert.equal(api.analyzeCohort([baseline, repeat, drift], 'drift').verdict, 'OUTCOME_DRIFT');

const changedBlueprint = makeRun('changed', {
  devices: [{ type: 'spring', x: 220, y: 420, angle: -Math.PI / 4 }]
});
assert.notEqual(changedBlueprint.scenarioSignature, baseline.scenarioSignature, 'moving a device must change the setup fingerprint');
const wrappedAngle = makeRun('wrapped', {
  devices: [{ type: 'spring', x: 190, y: 420, angle: -Math.PI / 4 + Math.PI * 2 }]
});
assert.equal(wrappedAngle.scenarioSignature, baseline.scenarioSignature, 'equivalent wrapped angles must normalize to the same fingerprint');

assert.equal(api.compareRuns(baseline, changedBlueprint), null, 'the same-setup gate must refuse changed setups');
assert.equal(api.normalizeRun({ ...baseline, mode: 'unrecognised' }), null, 'unknown run modes must be rejected');
assert.equal(api.normalizeRun({ ...baseline, simulationProfile: undefined }), null, 'the physics profile is mandatory');
assert.equal(api.normalizeRun({ ...baseline, simulationProfile: { world: {}, level: { id: 2 } } }), null, 'the complete physics profile is mandatory');
assert.equal(api.normalizeRun({ ...baseline, trajectory: [{ t: 0, x: 1, y: 2 }] }), null, 'a single-frame trace is not a replay');

const longTrace = Array.from({ length: 900 }, (_, i) => ({ t: i / 30, x: i, y: i / 2, vx: 30, vy: 15, gateOpen: false, checkpoints: [] }));
const boundedRun = makeRun('bounded', { trajectory: longTrace });
assert.equal(boundedRun.trajectory.length, 420, 'long traces must be sampled within the declared bound');
assert.equal(boundedRun.trajectory[0].x, 0);
assert.equal(boundedRun.trajectory.at(-1).x, 899);

const archive = { schema: api.archiveSchema, schemaVersion: 1, exportedAt: '2026-10-14T10:05:00.000Z', runs: [baseline, repeat] };
const validated = api.validateArchive(archive);
assert.equal(validated.ok, true);
assert.equal(validated.archive.runs.length, 2);
assert.equal(api.validateArchive({ schema: 'wrong', schemaVersion: 1, runs: [] }).ok, false);
assert.equal(api.validateArchive({ ...archive, runs: [baseline, baseline] }).ok, false, 'duplicate run IDs must be rejected');
assert.equal(api.validateArchive({ ...archive, runs: [{ ...baseline, scenarioSignature: 'RPL27-BAD' }] }).ok, false, 'mismatched setup fingerprints must be rejected');
assert.equal(api.validateArchive({ ...archive, runs: Array.from({ length: 31 }, (_, i) => makeRun('run-' + i)) }).ok, false, 'archives above 30 runs must be rejected');
assert.equal(api.validateArchive({ ...archive, note: 'x'.repeat(330 * 1024) }).ok, false, 'oversized archives must be rejected');
assert.equal(api.validateArchive({ ...archive, runs: [{ ...baseline, trajectory: [{ t: 0, x: 0, y: 0 }] }] }).ok, false, 'malformed trajectory capsules must be rejected');

console.log('CASCADE LAB Reproducibility Lab smoke: PASS — 7 release improvements, stable setup fingerprints, same-setup repeats, drift detection, bounded traces, validated portable archives and local-only boundaries.');
