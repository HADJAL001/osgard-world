import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('public/games/cascade-lab/index.html');
const source = read('public/games/cascade-lab/physics-twin.js');
const worker = read('public/games/cascade-lab/service-worker.js');
const routeMatrix = read('scripts/production-route-matrix.mjs');

assert.match(html, /osgard-game-version" content="0\.26\.0-simulation-twin"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.26\.0<\/title>/);
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('physics-twin.js?v=0.26.0') && html.includes('data-cascade-lab-twin="0.26.0"'));
assert.ok(html.includes('osgard-game-pwa" content="0.26.0-offline-field-device'));
assert.ok(html.includes('new CustomEvent(\\'cascade-lab:run-finished\\''));
assert.ok(html.includes("notifyOsgardLifecycle('ready', { version: '0.26.0' })"));
assert.ok(worker.includes("'./physics-twin.js?v=0.26.0'"), 'the Simulation Twin module must be precached for offline installations');
assert.ok(!source.includes('fetch(') && !source.includes('XMLHttpRequest') && !source.includes('sendBeacon('), 'the UI must not upload simulations');
assert.ok(!source.includes('.innerHTML'), 'untrusted simulation output must use text-safe DOM APIs');
assert.ok(source.includes('runtime.runControl') && source.includes('runtime.angleSweep') && source.includes('drawVariants'));
assert.ok(routeMatrix.includes("'/games/cascade-lab/physics-twin.js?v=0.26.0'") || routeMatrix.includes("'/games/cascade-lab/physics-twin.js'"), 'production route matrix must include the new asset');

const levelStart = html.indexOf('const LEVELS = [');
const levelEnd = html.indexOf('\\nfunction getLevel', levelStart);
const worldStart = html.indexOf('const WORLD = {');
const twinStart = html.indexOf('// CASCADE LAB 0.26 — isolated deterministic runs powered by the shipping physics engine.');
const twinEnd = html.indexOf('\\n\\nfunction findPlacementAnchor', twinStart);
assert.ok(levelStart >= 0 && levelEnd > levelStart, 'the production level registry must be extractable for headless test');
assert.ok(worldStart > levelEnd && twinStart > worldStart && twinEnd > twinStart, 'the actual production physics engine and Simulation Twin runtime must be present');

const levels = html.slice(levelStart, levelEnd);
const engine = html.slice(worldStart, twinStart);
const twinRuntime = html.slice(twinStart, twinEnd);
const testDevices = [
  { type: 'spring', x: 190, y: 473, angle: -Math.PI / 4 },
  { type: 'belt', x: 472, y: 473, angle: 0 }
];
const buildHarness = new Function('window', [
  levels,
  engine,
  'let level = LEVELS[0];',
  'let devices = ' + JSON.stringify(testDevices) + ';',
  twinRuntime,
  'return window.CASCADELAB026_RUNTIME;'
].join('\\n'));
const api = buildHarness({});
assert.ok(api && api.version === '0.26.0', 'runtime adapter must be exposed by the real game code');
assert.equal(api.schema, 'osgard.cascade-lab.simulation-twin.v1');
assert.equal(api.fixedStepSeconds, 1 / 120);
assert.equal(api.maxDevices, 12);

const before = JSON.stringify(testDevices);
const a = api.run(1, testDevices);
const b = api.run(1, testDevices);
assert.equal(a.ok, true, a.error);
assert.equal(b.ok, true, b.error);
assert.equal(a.run.status === 'won' || a.run.status === 'lost', true);
assert.equal(a.run.fingerprint, b.run.fingerprint, 'identical setup must produce an identical run fingerprint');
assert.equal(a.run.steps, b.run.steps);
assert.ok(a.run.trajectory.length >= 2 && a.run.trajectory.length <= 420);
assert.equal(a.run.telemetry.events.length >= 1, true);
assert.equal(a.run.fixedStepSeconds, 1 / 120);

const control = api.runControl(1, testDevices);
assert.equal(control.ok, true);
assert.equal(control.identical, true);
assert.equal(control.signatureA, control.signatureB);
assert.equal(control.difference.meanPixels, 0);
assert.equal(control.difference.maxPixels, 0);

const sweep = api.angleSweep(1, testDevices, 0, 6);
assert.equal(sweep.ok, true, sweep.error);
assert.equal(sweep.suite.offsetsDegrees.join(','), '-12,-6,0,6,12');
assert.equal(sweep.suite.variants.length, 5);
assert.equal(sweep.suite.changedVariable, 'angle-degrees');
assert.equal(sweep.suite.deterministicControl.identical, true);
assert.equal(sweep.suite.variants[2].run.fingerprint, control.signatureA, 'zero-offset run must exactly match the repeated baseline');
assert.equal(sweep.suite.summary.caseCount, 5);
assert.ok(sweep.suite.summary.successfulCases >= 0 && sweep.suite.summary.successfulCases <= 5);
assert.ok(sweep.suite.variants.every(variant => variant.run.trajectory.length <= 420));
assert.equal(JSON.stringify(testDevices), before, 'simulation trials must not mutate the live construction passed by the game');

assert.equal(api.run(99, testDevices).ok, false, 'unknown levels must be rejected');
assert.equal(api.run(1, [{ type: 'teleporter', x: 100, y: 100, angle: 0 }]).ok, false, 'unknown device types must be rejected');
assert.equal(api.run(1, [{ type: 'spring', x: Infinity, y: 100, angle: 0 }]).ok, false, 'non-finite coordinates must be rejected');
assert.equal(api.angleSweep(1, testDevices, 99, 6).ok, false, 'an invalid device selection must be rejected');

const changed = api.run(1, [{ ...testDevices[0], angle: testDevices[0].angle + 0.1 }, testDevices[1]]);
assert.equal(changed.ok, true);
assert.notEqual(changed.run.fingerprint, a.run.fingerprint, 'changed inputs must change the setup-and-trace fingerprint');

new Function(source);
console.log('CASCADE LAB Simulation Twin smoke: PASS — actual PhysicsWorld fixed-step runner, exact repeatability, single-variable angle sweep, trace bounds, bad-input rejection, offline precache and local-only boundary.');
