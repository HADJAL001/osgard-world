import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../public/games/cascade-lab/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const source = readFileSync(new URL('replay-verification.js', root), 'utf8');
const worker = readFileSync(new URL('service-worker.js', root), 'utf8');
const routeMatrix = readFileSync(new URL('./production-route-matrix.mjs', import.meta.url), 'utf8');
await import(new URL('replay-verification.js', root));
const api = globalThis.__CASCADELAB026_TEST__;

assert.ok(api && api.version === '0.26.0', 'Replay Verification pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.replay-verification.v1');
assert.equal(api.certificateSchema, 'osgard.cascade-lab.replay-certificate.v1');
assert.equal(api.engineContract, 'cascade-lab-fixed-step-v1');
assert.equal(api.maxPasses, 5);
assert.equal(api.maxFrames, 420);
assert.equal(api.maxImportBytes, 600 * 1024);
assert.match(html, /osgard-game-version" content="0\.26\.0-replay-verification"/);
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.26\.0<\/title>/);
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('replay-verification.js?v=0.26.0') && html.includes('data-cascade-lab-replay="0.26.0"'));
assert.ok(html.includes("Object.defineProperty(window, 'CASCADELAB026_ENGINE'") && html.includes('function runIsolatedReplay(input)') && html.includes('while (sim.status === \'running\' && steps < maxSteps)'));
assert.ok(worker.includes("'./replay-verification.js?v=0.26.0'") && worker.includes("CACHE=PREFIX+'v0.26.2'"));
assert.ok(html.includes("service-worker.js?v=0.26.2"), 'PWA registration must invalidate the prior offline shell');
assert.ok(routeMatrix.includes("'/games/cascade-lab/replay-verification.js'") && routeMatrix.includes("osgard.cascade-lab.replay-verification.v1") && routeMatrix.includes('id="CASCADELAB026"'));
assert.doesNotMatch(source, /\\b(?:fetch|XMLHttpRequest|sendBeacon)\\s*\\(/, 'verification must remain network-free');
assert.ok(!source.includes('.innerHTML'), 'the verification interface must render imported data using safe DOM APIs');
for (const marker of ['function normalizeSetup(', 'function scenarioFingerprint(', 'function compareReplays(', 'function trajectoryDeviation(', 'function makeCertificate(', 'function validateCertificate(', 'FNV-1A-32', 'fixed-step physics contract', 'MAX_CERTIFICATE_BYTES', 'MAX_HISTORY']) {
  assert.ok(source.includes(marker), 'Replay Verification feature missing: ' + marker);
}

// Exercise the actual LEVELS and PhysicsWorld definitions extracted from the shipped HTML,
// then call the same runIsolatedReplay function used by the browser UI.
const levelStart = html.indexOf('const LEVELS = [');
const physicsEnd = html.indexOf('function findPlacementAnchor(', levelStart);
const replayStart = html.indexOf('function runIsolatedReplay(input)');
const replayEnd = html.indexOf("\nObject.defineProperty(window, 'CASCADELAB026_ENGINE'", replayStart);
assert.ok(levelStart >= 0 && physicsEnd > levelStart && replayStart > physicsEnd && replayEnd > replayStart, 'the shipped deterministic engine boundary must be extractable for a real physics smoke test');
const modelSource = html.slice(levelStart, physicsEnd);
const replaySource = html.slice(replayStart, replayEnd) + "\nglobalThis.__runIsolatedReplay = runIsolatedReplay;";
const model = {};
runInNewContext(modelSource + "\n" + replaySource, model, { timeout: 1500 });
const run = model.__runIsolatedReplay;
assert.equal(typeof run, 'function');
const setup = [{ type: 'spring', x: 120, y: 473, angle: 0 }];
const a = run({ levelId: 1, devices: setup });
const b = run({ levelId: 1, devices: setup });
const c = run({ levelId: 1, devices: setup });
assert.equal(a.ok, true, a.reason);
assert.equal(b.ok, true, b.reason);
assert.equal(c.ok, true, c.reason);
assert.equal(a.engineContract, api.engineContract);
assert.equal(a.fixedStepSeconds, 1 / 120);
assert.equal(a.scenarioFingerprint, b.scenarioFingerprint);
assert.equal(a.status, b.status);
assert.equal(a.reason, b.reason);
assert.equal(a.timeSeconds, b.timeSeconds);
assert.deepEqual(a.position, b.position);
assert.deepEqual(a.velocity, b.velocity);
assert.deepEqual(a.telemetry, b.telemetry);
assert.deepEqual(a.trajectory, b.trajectory, 'identical setups must generate identical fixed-step trajectories');
assert.ok(a.steps > 0 && a.steps <= 3600);
assert.ok(a.trajectory.length >= 2 && a.trajectory.length <= 420);
assert.ok(run({ levelId: 99, devices: [] }).ok === false, 'unknown levels must be rejected');
assert.ok(run({ levelId: 1, devices: [{ type: 'unknown', x: 10, y: 10, angle: 0 }] }).ok === false, 'unsupported devices must be rejected');
assert.ok(run({ levelId: 1, devices: Array.from({ length: 13 }, () => ({ type: 'spring', x: 100, y: 473, angle: 0 })) }).ok === false, 'unbounded device arrays must be rejected');

const toObserved = replay => ({ ...replay, devices: replay.setup, at: '2026-10-14T12:00:00.000Z' });
const observed = toObserved(a), passA = toObserved(a), passB = toObserved(b), passC = toObserved(c);
const ab = api.compareReplays(passA, passB), ac = api.compareReplays(passA, passC);
assert.equal(ab.ok, true);
assert.equal(ab.equivalent, true);
assert.equal(ab.trajectory.maxPx, 0);
assert.equal(ab.timeDelta, 0);
assert.equal(ab.sameEvents, true);
const baseline = api.compareReplays(observed, passA);
assert.equal(baseline.equivalent, true);
const made = api.makeCertificate(observed, [passA, passB, passC], [ab, ac], baseline);
assert.equal(made.ok, true, made.reason);
assert.equal(made.verdict, 'reproducible');
const serialized = JSON.parse(JSON.stringify(made.certificate));
assert.equal(api.validateCertificate(serialized).ok, true);
assert.equal(api.validateCertificate(serialized).verdict, 'reproducible');

const drifted = JSON.parse(JSON.stringify(passB));
drifted.position.x += 20;
drifted.trajectory = drifted.trajectory.map(point => ({ ...point, x: point.x + 20 }));
const drift = api.compareReplays(passA, drifted);
assert.equal(drift.ok, true);
assert.equal(drift.equivalent, false);
assert.ok(drift.trajectory.maxPx > 19);
const tampered = JSON.parse(JSON.stringify(serialized));
tampered.payload.passes[0].position.x += 1;
assert.equal(api.validateCertificate(tampered).ok, false, 'tampered certificates must fail checksum validation');
const otherSetup = JSON.parse(JSON.stringify(passA));
otherSetup.devices = [{ type: 'spring', x: 140, y: 473, angle: 0 }];
otherSetup.setup = otherSetup.devices;
assert.equal(api.compareReplays(passA, otherSetup).ok, false, 'cross-setup comparisons must be rejected');
const tooLarge = JSON.parse(JSON.stringify(serialized));
tooLarge.payload.unexpected = 'x'.repeat(610 * 1024);
assert.equal(api.validateCertificate(tooLarge).ok, false, 'oversized certificate imports must be rejected');

console.log('CASCADE LAB Replay Verification smoke: PASS — real PhysicsWorld repeated 3x, fixed-step frame identity, outcome/event/telemetry comparison, certificate validation, tamper detection, bounds and network-free UI.');
