import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('public/games/cascade-lab/index.html');
const source = read('public/games/cascade-lab/counterfactual-lab.js');
const worker = read('public/games/cascade-lab/service-worker.js');
const manifest = JSON.parse(read('public/games/cascade-lab/manifest.webmanifest'));

await import(new URL('../public/games/cascade-lab/counterfactual-lab.js', import.meta.url));
const api = globalThis.__CASCADELAB027_TEST__;
assert.ok(api && api.version === '0.27.0', 'pure Counterfactual Lab API must load in Node');
assert.equal(api.schema, 'osgard.cascade-lab.counterfactual-lab.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.counterfactual-archive.v1');
assert.equal(api.maxVariants, 7);
assert.equal(api.maxStudies, 30);
assert.equal(api.maxExportBytes, 800 * 1024);
assert.deepEqual(api.angleOffsets(5), [-15, -10, -5, 0, 5, 10, 15]);
assert.throws(() => api.angleOffsets(0), /угла/i);
assert.throws(() => api.angleOffsets(11), /угла/i);

assert.match(html, /osgard-game-version" content="0\.27\.0-counterfactual-twin"/);
assert.match(html, /osgard-game-pwa" content="0\.27\.0-counterfactual-twin"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.27\.0<\/title>/);
assert.ok(html.includes('id="CASCADELAB027"') && html.includes('counterfactual-lab.js?v=0.27.0') && html.includes('data-cascade-lab-counterfactual="0.27.0"'), 'the new UI module must be versioned and cache-busted');
assert.ok(html.includes('notifyOsgardLifecycle(\'ready\', { version: \'0.27.0\' })'), 'the portal handshake must advertise the app version');
assert.ok(html.includes('CASCADELAB027_SIMULATOR') && html.includes("const COUNTERFACTUAL_ENGINE_VERSION = '0.27.0'"), 'the bounded headless engine contract must be embedded in the game');
assert.ok(html.includes("service-worker.js?v=0.27.0"), 'the app must register its matching service worker build');
assert.ok(manifest.scope === './' && manifest.display === 'standalone', 'Counterfactual Lab must remain in the scoped installable app');
assert.ok(worker.includes("CACHE=PREFIX+'v0.27.0'") && worker.includes("'./counterfactual-lab.js?v=0.27.0'"), 'the new module must be pre-cached offline');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Counterfactual Lab must not send game history or telemetry over the network');
assert.ok(!source.includes('.innerHTML'), 'rendered notes and imported archives must use safe text APIs');
assert.ok(source.includes('one-variable') || source.includes('angleOffsets') || source.includes('offsetDegrees'), 'the analysis must explicitly alter one bounded variable');
new Function(source);

// Extract the real LEVELS and PhysicsWorld declarations from the shipped game.
// The counterfactual scenarios execute this exact in-game model, not a second approximation.
const levelsStart = html.indexOf('const LEVELS = [');
const worldStart = html.indexOf('const WORLD = {');
const engineEnd = html.indexOf('\nconst COLUMNS =', worldStart);
assert.ok(levelsStart >= 0 && worldStart > levelsStart && engineEnd > worldStart, 'the actual game physics engine must be extractable for deterministic tests');
const simulationFactory = new Function('window',
  html.slice(levelsStart, worldStart) + '\n' + html.slice(worldStart, engineEnd) + '\nreturn window.CASCADELAB027_SIMULATOR;'
);
const simulator = simulationFactory({});
assert.ok(simulator && simulator.version === '0.27.0', 'headless simulator must expose the matching engine version');
assert.equal(simulator.fixedStep, 1 / 120);
assert.ok(simulator.maxSteps <= 3500, 'simulation work must remain bounded');

const devices = [
  { type: 'spring', x: 180, y: 473, angle: -Math.PI / 4 },
  { type: 'spring', x: 515, y: 473, angle: -Math.PI / 4 },
  { type: 'spring', x: 770, y: 473, angle: -Math.PI / 12 }
];
const before = JSON.stringify(devices);
const baseline = simulator.simulate({ levelId: 1, devices });
const repeat = simulator.simulate({ levelId: 1, devices });
assert.equal(baseline.status, 'won', 'the known valid baseline must complete the level');
assert.equal(baseline.fingerprint, repeat.fingerprint, 'identical initial state and build must yield the same fingerprint');
assert.ok(baseline.trajectory.length >= 2 && baseline.trajectory.length <= 420);
assert.ok(baseline.events.length > 0 && Number.isFinite(baseline.telemetry.peakSpeed));
assert.equal(JSON.stringify(devices), before, 'headless simulation must not mutate the caller-owned device setup');

const offsets = api.angleOffsets(5);
const variants = offsets.map(offsetDegrees => ({
  offsetDegrees,
  result: simulator.simulate({
    levelId: 1,
    devices: devices.map((device, index) => index === 2
      ? { ...device, angle: device.angle + offsetDegrees * Math.PI / 180 }
      : { ...device })
  })
}));
const control = simulator.simulate({ levelId: 1, devices });
const analysis = api.analyzeSweep(variants, control);
assert.equal(analysis.ok, true);
assert.equal(analysis.variantCount, 7);
assert.equal(analysis.baselineRepeatable, true, 'the baseline is replayed a second time as a control');
assert.equal(analysis.robustness.tested, 6, 'robustness covers the six non-baseline offsets');
assert.ok(analysis.variants.every((item, index) => item.offsetDegrees === offsets[index]));
assert.ok(analysis.recommendation && analysis.recommendation.status === 'won', 'the model should rank a successful candidate for this baseline');
assert.equal(api.analyzeSweep(variants.slice(1), control).ok, false, 'incomplete sweeps must be rejected');
assert.equal(api.analyzeSweep([...variants, variants[0]], control).ok, false, 'over-sized sweeps must be rejected');
assert.equal(api.analyzeSweep(variants.map((item,index)=>({...item,offsetDegrees:index===6?0:item.offsetDegrees})),control).ok, false, 'duplicate angle offsets must be rejected');

assert.throws(() => simulator.simulate({ levelId: 999, devices }), /протокол|уровень/i);
assert.throws(() => simulator.simulate({ levelId: 1, devices: [{type:'unknown',x:180,y:473,angle:0}] }), /устройства|тип/i);
assert.throws(() => simulator.simulate({ levelId: 1, devices: [{type:'spring',x:12000,y:473,angle:0}] }), /координаты|точк|размещ/i);
assert.throws(() => simulator.simulate({ levelId: 1, devices: devices.concat(devices) }), /лимит|устройств/i);

const storedStudy = api.cleanStoredStudy({
  schema: api.schema, id: 'smoke-study', createdAt: '2026-10-14T00:00:00.000Z',
  levelId: 1, levelTitle: 'Первый каскад', toolIndex: 2, toolType: 'spring',
  stepDegrees: 5, originalStatus: 'won', originalTimeSeconds: baseline.timeSeconds,
  summary: analysis
});
assert.ok(storedStudy, 'a valid analysis must compact into local history');
const validArchive = api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, studies: [storedStudy] });
assert.equal(validArchive.ok, true, 'compact history must round-trip through the validated archive');
assert.equal(validArchive.archive.studies[0].summary.baselineRepeatable, true, 'the baseline control result must survive archive restore');
assert.equal(api.validateArchive({ schema: 'wrong', schemaVersion: 1, studies: [] }).ok, false);
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, studies: [storedStudy, storedStudy] }).ok, false, 'duplicate study IDs must be rejected');
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, studies: Array.from({ length: 31 }, (_, index) => ({ ...storedStudy, id: 's' + index })) }).ok, false, 'history must remain capped at 30 studies');
assert.equal(api.validateArchive({ schema: api.archiveSchema, schemaVersion: 1, studies: [{ ...storedStudy, note: 'x'.repeat(820 * 1024) }] }).ok, false, 'oversized archive must be rejected before import');

console.log('CASCADE LAB Counterfactual Twin smoke: PASS — real PhysicsWorld, seven angle variants, repeat control, stable fingerprint, one-variable sweep, no setup mutation, offline-only module and bounded archive round-trip.');
