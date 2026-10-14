import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/counterfactual-lab.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/games/cascade-lab/service-worker.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/counterfactual-lab.js', import.meta.url));
const api = globalThis.__CASCADELAB026_TEST__;

assert.ok(api && api.version === '0.26.0', 'Counterfactual Lab pure API must be available');
assert.equal(api.improvements.length, 7, 'release must enumerate exactly seven major improvements');
assert.equal(api.schema, 'osgard.cascade-lab.counterfactual-lab.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.counterfactual-archive.v1');
assert.equal(api.engineSchema, 'osgard.cascade-lab.counterfactual-engine.v1');
assert.equal(api.maxBatches, 6);
assert.equal(api.maxTrialsPerBatch, 8);
assert.equal(api.maxTotalTrials, 48);
assert.equal(api.maxFrames, 142);
assert.equal(api.maxImportBytes, 1024 * 1024);
assert.match(html, /osgard-game-version" content="0\\.26\\.0-counterfactual-lab"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\\.26\\.0<\\/title>/);
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('counterfactual-lab.js?v=0.26.0'));
assert.ok(html.includes("const CASCADELAB026_ENGINE_SCHEMA = 'osgard.cascade-lab.counterfactual-engine.v1'"));
assert.ok(html.includes("const CASCADELAB026_ENGINE_VERSION = '0.26.0-fixed-120hz'"));
assert.ok(html.includes('sim.step(WORLD.fixedStep)') && html.includes('function cascadeLab026RunTrial('));
assert.ok(html.includes("isDeviceAnchorValid(target, candidate)") && html.includes("isPlacementValid(target, normalized, candidate, target.capacity)"));
assert.ok(html.includes("navigator.serviceWorker.register('./service-worker.js?v=0.27.0'"));
assert.ok(worker.includes("CACHE=PREFIX+'v0.27.0'") && worker.includes("'./counterfactual-lab.js?v=0.26.0'"));
assert.doesNotMatch(source, /\\b(?:fetch|XMLHttpRequest|sendBeacon)\\s*\\(/, 'Counterfactual Lab must not upload simulation records');
assert.ok(!source.includes('.innerHTML'), 'imported run data must use safe DOM text APIs');
assert.ok(source.includes('Math.random()') === false, 'the physics calculation must not use random trial variation');
for (const marker of ['function buildAngleSweep(', 'function buildAblationSweep(', 'function buildRepeatability(', 'function compareTrials(', 'function validateArchive(', 'deterministicIdentical', 'observedSuccessSharePct', 'resultFingerprintEqual', 'setTimeout(resolve, 0)', 'Запрошена отмена', 'FNV-1a-32']) {
  assert.ok(source.includes(marker), 'Counterfactual Lab contract missing: ' + marker);
}

function fixture(id, scenarioId, overrides = {}) {
  const devices = overrides.devices || [{ type: 'spring', x: 100, y: 473, angle: 0 }];
  const status = overrides.status || 'won';
  const reason = overrides.reason || (status === 'won' ? 'Доставка выполнена' : 'Контейнер покинул трассу');
  const telemetry = overrides.telemetry || {
    distance: 140, peakSpeed: 120, maxHeight: 360, contacts: 1, impacts: 1, activations: 1,
    lastImpactSpeed: 70, events: []
  };
  const trajectory = overrides.trajectory || [
    { t: 0, x: 100, y: 100, vx: 20, vy: 0, gateOpen: false, checkpoints: [] },
    { t: 1, x: 150, y: 130, vx: 30, vy: 25, gateOpen: true, checkpoints: ['cp1'] },
    { t: 2, x: 220, y: 180, vx: 0, vy: 0, gateOpen: true, checkpoints: ['cp1'] }
  ];
  const levelId = overrides.levelId || 1;
  const timeSeconds = overrides.timeSeconds ?? 2;
  const gateOpen = overrides.gateOpen ?? true;
  const checkpointsReached = overrides.checkpointsReached || ['cp1'];
  const cleanDevices = devices.map(d => ({ type: d.type, x: Number(d.x.toFixed(3)), y: Number(d.y.toFixed(3)), angle: Number(d.angle.toFixed(5)) }));
  const configurationFingerprint = api.checksum(api.canonicalize({ levelId, devices: cleanDevices }));
  const stableResult = {
    schema: api.engineSchema, engineVersion: '0.26.0-fixed-120hz', levelId, status, reason,
    timeSeconds: Number(timeSeconds.toFixed(5)), gateOpen, checkpointsReached: [...checkpointsReached].sort(),
    telemetry, trajectory
  };
  const resultFingerprint = api.checksum(api.canonicalize({ configurationFingerprint, ...stableResult }));
  return {
    ...stableResult, engineSchema: api.engineSchema, id, scenarioId, label: scenarioId,
    kind: overrides.kind || 'repeatability', createdAt: '2026-10-14T15:00:00.000Z',
    levelTitle: 'Первый каскад', par: 2, parTime: 4.2, deviceCount: devices.length,
    devices: cleanDevices, stepCount: 240, frameCount: trajectory.length,
    configurationFingerprint, resultFingerprint
  };
}

const repeat1 = api.normalizeTrial(fixture('t1', 'repeat-1'));
const repeat2 = api.normalizeTrial(fixture('t2', 'repeat-2'));
assert.ok(repeat1 && repeat2, 'valid deterministic trial records must normalize');
assert.equal(repeat1.configurationFingerprint, repeat2.configurationFingerprint);
assert.equal(repeat1.resultFingerprint, repeat2.resultFingerprint);
assert.equal(api.normalizeTrial({ ...fixture('tampered', 'bad'), resultFingerprint: '00000000' }), null, 'tampered result checksum must be rejected');
assert.equal(api.normalizeTrial({ ...fixture('bad-config', 'bad-config'), configurationFingerprint: 'FFFFFFFF' }), null, 'tampered configuration checksum must be rejected');

const changed = api.normalizeTrial(fixture('t3', 'angle+15', {
  kind: 'angle-sweep', status: 'lost', reason: 'Контейнер покинул трассу', timeSeconds: 2.4,
  devices: [{ type: 'spring', x: 100, y: 473, angle: Math.PI / 12 }],
  trajectory: [
    { t: 0, x: 112, y: 100, vx: 20, vy: 0, gateOpen: false, checkpoints: [] },
    { t: 1, x: 162, y: 130, vx: 30, vy: 25, gateOpen: true, checkpoints: ['cp1'] },
    { t: 2, x: 232, y: 180, vx: 0, vy: 0, gateOpen: true, checkpoints: ['cp1'] }
  ],
  telemetry: { distance: 155, peakSpeed: 124, maxHeight: 360, contacts: 1, impacts: 1, activations: 1, lastImpactSpeed: 73, events: [] }
}));
assert.ok(changed);
const delta = api.compareTrials(repeat1, changed);
assert.equal(delta.statusTransition, 'regressed');
assert.equal(delta.timeDeltaSeconds, 0.4);
assert.equal(delta.meanPathDeviationPx, 12);
assert.equal(delta.resultFingerprintEqual, false);

const blueprint = {
  levelId: 1, levelTitle: 'Первый каскад', capacity: 3,
  devices: [
    { uid: 'spring-a', type: 'spring', x: 100, y: 473, angle: 0 },
    { uid: 'belt-b', type: 'belt', x: 430, y: 473, angle: 0 }
  ]
};
const angles = api.buildAngleSweep(blueprint, 'spring-a');
assert.equal(angles.ok, true);
assert.equal(angles.scenarios.length, 7, 'baseline plus six angle perturbations');
assert.deepEqual(angles.scenarios.slice(1).map(s => s.id), ['angle--45','angle--30','angle--15','angle-+15','angle-+30','angle-+45']);
assert.equal(api.buildAngleSweep(blueprint, 'missing').ok, false);
const ablation = api.buildAblationSweep(blueprint);
assert.equal(ablation.scenarios.length, 3, 'baseline plus remove-one-device ablations');
assert.equal(ablation.scenarios[1].devices.length, 1);
assert.equal(api.buildRepeatability(blueprint).scenarios.length, 3);

const summary = api.summarizeBatch([repeat1, changed], 'angle-sweep', 2);
assert.equal(summary.completedTrials, 2);
assert.equal(summary.successCount, 1);
assert.equal(summary.failureCount, 1);
assert.equal(summary.observedSuccessSharePct, 50);
assert.equal(summary.statusTransitions, 1);
const det = api.summarizeBatch([
  api.normalizeTrial(fixture('r1','repeat-1',{kind:'repeatability'})),
  api.normalizeTrial(fixture('r2','repeat-2',{kind:'repeatability'})),
  api.normalizeTrial(fixture('r3','repeat-3',{kind:'repeatability'}))
], 'repeatability', 3);
assert.equal(det.deterministicIdentical, true);

const batch = {
  id: 'batch-one', kind: 'repeatability', createdAt: '2026-10-14T15:01:00.000Z',
  levelId: 1, levelTitle: 'Первый каскад', plannedTrials: 2,
  trials: [
    { ...fixture('arch-1', 'repeat-1'), kind: 'repeatability' },
    { ...fixture('arch-2', 'repeat-2'), kind: 'repeatability' }
  ]
};
const archive = { schema: api.archiveSchema, schemaVersion: 1, batches: [batch] };
assert.equal(api.validateArchive(archive).ok, true);
assert.equal(api.validateArchive({ ...archive, batches: [batch, batch] }).ok, false, 'duplicate series IDs must be rejected');
assert.equal(api.validateArchive({ schema: 'wrong', schemaVersion: 1, batches: [] }).ok, false);
assert.equal(api.validateArchive({ ...archive, padding: 'x'.repeat(1024 * 1024 + 1) }).ok, false, 'oversized archives must be rejected');
const tooMany = Array.from({length: 7}, (_, i) => ({ ...batch, id: 'batch-' + i }));
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, batches: tooMany }).ok, false, 'archives must be bounded to six series');

console.log('CASCADE LAB Counterfactual Lab smoke: PASS — 7 improvements, checksum verification, repeatability, angle sweep, device ablation, path deviation and bounded local archive.');
