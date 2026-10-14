import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/counterfactual-foundry.js', import.meta.url), 'utf8');

assert.match(html, /osgard-game-version" content="0\.26\.0-counterfactual-foundry"/, 'game metadata must identify v0.26.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.26\.0<\/title>/, 'browser title must identify v0.26.0');
assert.ok(html.includes('id="CASCADELAB025"') && html.includes('evidence-integrity.js?v=0.25.0'), 'Evidence Integrity must remain integrated');
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('counterfactual-foundry.js?v=0.26.0') && html.includes('data-cascade-lab-counterfactual="0.26.0"'), 'Counterfactual Foundry must be versioned and cache-busted');
assert.ok(source.includes('const VERSION = \\'0.26.0\\'') && source.includes('osgard.cascade-lab.counterfactual-foundry.v1'), 'Foundry schema must be versioned');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Foundry must not send game data over the network');
assert.ok(!source.includes('.innerHTML'), 'Foundry must render saved and imported data with text-safe DOM APIs');
assert.ok(source.includes('localOnly:true') && source.includes('uploaded:false'), 'exported model runs must retain local-only provenance');
assert.ok(source.includes('new CustomEvent') === false, 'virtual runs must not masquerade as real game-completion events');
for (const marker of [
  'function normalizeSource(', 'function mutateBlueprint(', 'function trajectoryDeviation(',
  'function rankVariants(', 'function buildStudy(', 'function archiveSummary(',
  'sameFingerprint', 'changedVariableCount: 1', 'MAX_HISTORY = 12',
  'ДВЕ КОНТРОЛЬНЫЕ СИМУЛЯЦИИ', 'ВИРТУАЛЬНЫЕ ЗАПУСКИ'
]) assert.ok(source.includes(marker), 'Foundry capability missing: ' + marker);
new Function(source);

// Run the exact PhysicsWorld definition from the game page without the DOM renderer.
// This catches drift between the visible game and the headless counterfactual engine.
const engineStart = html.indexOf('const TOOL_DEFS = {');
const engineEnd = html.indexOf('function findPlacementAnchor', engineStart);
assert.ok(engineStart >= 0 && engineEnd > engineStart, 'PhysicsWorld source range must be extractable');
const engineSource = html.slice(engineStart, engineEnd) + '\nreturn window.CASCADELAB026_ENGINE;';
const engineFactory = new Function('window', engineSource);
const engine = engineFactory({ document: {} });
assert.ok(engine && engine.version === '0.26.0', 'same-game PhysicsWorld API must be exposed');
assert.equal(engine.schema, 'osgard.cascade-lab.virtual-simulation.v1');

await import(new URL('../public/games/cascade-lab/counterfactual-foundry.js', import.meta.url));
const api = globalThis.__CASCADELAB026_TEST__;
assert.ok(api && api.version === '0.26.0', 'Foundry pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.counterfactual-foundry.v1');

const blueprint = { levelId: 1, devices: [{ type: 'spring', x: 200, y: 473, angle: -0.7 }] };
const sourceBefore = JSON.stringify(blueprint);
const first = engine.simulate(blueprint);
const pair = engine.repeatability(blueprint);
assert.equal(first.ok, true, 'valid blueprint should simulate');
assert.ok(['won','lost'].includes(first.result.status), 'physics run must end in a supported result');
assert.ok(first.result.trajectory.length >= 2 && first.result.trajectory.length <= 420, 'headless trace must be bounded');
assert.equal(first.result.schema, 'osgard.cascade-lab.virtual-simulation.v1');
assert.equal(pair.ok, true);
assert.equal(pair.sameFingerprint, true, 'identical blueprint runs must produce the same fingerprint');
assert.equal(pair.first.fingerprint, pair.second.fingerprint);
assert.equal(pair.first.timeSeconds, pair.second.timeSeconds);
assert.equal(pair.first.status, pair.second.status);
assert.equal(JSON.stringify(blueprint), sourceBefore, 'simulation must not mutate the player blueprint');

assert.equal(engine.simulate({ levelId: 99, devices: [] }).ok, false, 'unknown level must be rejected');
assert.equal(engine.simulate({ levelId: 1, devices: Array.from({length:13}, () => ({type:'spring',x:200,y:473,angle:0})) }).ok, false, 'oversized blueprint must be rejected');
assert.equal(engine.simulate({ levelId: 1, devices: [{type:'intruder',x:200,y:473,angle:0}] }).ok, false, 'unknown device types must be rejected');
assert.equal(engine.simulate({ levelId: 1, devices: [{type:'fan',x:200,y:473,angle:0}] }).ok, false, 'a device absent from the level toolset must be rejected');

const actualSource = {
  id: 'fixture-from-xray', at: '2026-10-14T08:00:00.000Z', levelId: 1, levelTitle: 'Первый каскад',
  status: first.result.status, timeSeconds: first.result.timeSeconds,
  devices: blueprint.devices, trajectory: first.result.trajectory, telemetry: first.result.telemetry
};
const normalized = api.normalizeSource(actualSource);
assert.ok(normalized && normalized.devices.length === 1);
const base = api.mutateBlueprint(actualSource, 0, 'angle', 0, 15);
const plus = api.mutateBlueprint(actualSource, 0, 'angle', 1, 15);
assert.equal(base.ok, true);
assert.equal(plus.ok, true);
assert.notEqual(plus.blueprint.devices[0].angle, base.blueprint.devices[0].angle);
assert.equal(plus.changedDeviceIndex, 0);
assert.equal(plus.blueprint.devices.length, 1);
assert.equal(api.mutateBlueprint(actualSource, 0, 'angle', 3, 15).ok, false, 'offset must be within the five-point sweep');
assert.equal(api.mutateBlueprint(actualSource, 0, 'angle', 1, 3).ok, false, 'step must be from the safe preset list');
assert.equal(api.mutateBlueprint(actualSource, 9, 'x', 1, 12).ok, false, 'device index must exist');
assert.equal(api.mutateBlueprint(actualSource, 0, 'z', 1, 12).ok, false, 'only defined parameters may change');

const studyResult = api.buildStudy(engine, actualSource, { deviceIndex: 0, parameter: 'angle', step: 15 });
assert.equal(studyResult.ok, true, studyResult.error);
const study = studyResult.study;
assert.equal(study.model.deterministic, true);
assert.equal(study.experiment.changedVariableCount, 1);
assert.deepEqual(study.variants.map(v => v.offset), [-2,-1,0,1,2]);
assert.equal(study.variants.find(v => v.offset === 0).result.fingerprint, study.baseline.fingerprint);
assert.equal(study.observedVersusVirtual.statusMatch, true, 'identical actual and virtual fixture should match outcome');
assert.equal(study.observedVersusVirtual.observedTimeDeltaSeconds, 0);
assert.equal(study.observedVersusVirtual.meanTrajectoryDeviationPx, 0);
assert.ok(study.variants.every(variant => variant.result.schema === 'osgard.cascade-lab.virtual-simulation.v1'));
assert.ok(study.variants.filter(variant => variant.offset !== 0).every(variant => variant.trajectoryDeviationFromBase !== 0), 'changed angle fixtures should produce a changed virtual path');
assert.match(study.reportFingerprint, /^[a-f0-9]{8}$/);
assert.match(study.interpretation, /не является новым игровым прохождением/);

const xChange = api.mutateBlueprint(actualSource, 0, 'x', 1, 12);
assert.equal(xChange.ok, true);
assert.equal(xChange.blueprint.devices[0].x, blueprint.devices[0].x + 12);
assert.equal(xChange.blueprint.devices[0].y, blueprint.devices[0].y);
assert.equal(xChange.blueprint.devices[0].angle, api.normalizeSource(actualSource).devices[0].angle);

const yChange = api.mutateBlueprint(actualSource, 0, 'y', -1, 12);
assert.equal(yChange.ok, true);
assert.equal(yChange.blueprint.devices[0].y, blueprint.devices[0].y - 12);
assert.equal(yChange.blueprint.devices[0].x, blueprint.devices[0].x);

assert.equal(api.buildStudy({}, actualSource, {deviceIndex:0,parameter:'angle',step:15}).ok, false, 'engine is mandatory');
assert.equal(api.buildStudy(engine, actualSource, {deviceIndex:0,parameter:'mass',step:15}).ok, false, 'unsupported variable must be rejected');
assert.equal(api.buildStudy(engine, {...actualSource,devices:[]}, {deviceIndex:0,parameter:'angle',step:15}).ok, false, 'empty blueprint must be rejected');

const better = api.rankVariants([
  {offset:-1,result:{status:'lost',timeSeconds:1,position:{x:300,y:300},goal:{x:900,y:463,w:60},telemetry:{lastImpactSpeed:20}}},
  {offset:1,result:{status:'won',timeSeconds:8,position:{x:900,y:464},goal:{x:900,y:463,w:60},telemetry:{lastImpactSpeed:500}}},
  {offset:2,result:{status:'won',timeSeconds:5,position:{x:900,y:464},goal:{x:900,y:463,w:60},telemetry:{lastImpactSpeed:500}}}
]);
assert.equal(better[0].offset, 2, 'ranking must prefer delivered outcome before speed among successes');
assert.equal(api.trajectoryDeviation([], []), null);
const history = api.archiveSummary(study);
assert.equal(history.id, study.reportFingerprint);
assert.equal(history.deterministic, true);

console.log('CASCADE LAB Counterfactual Foundry smoke: PASS — exact PhysicsWorld reuse, repeatability fingerprints, validated blueprint inputs, 5-point one-variable sweep, observed-vs-virtual trajectory fit and local-only boundaries.');
