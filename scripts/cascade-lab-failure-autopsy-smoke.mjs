import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/failure-autopsy.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/failure-autopsy.js', import.meta.url));
const api = globalThis.__CASCADELAB018_TEST__;

assert.ok(api && typeof api.diagnoseRun === 'function', 'diagnostic engine must expose its pure test contract in Node');
assert.match(html, /osgard-game-version" content="0\.18\.0-failure-autopsy"/, 'release metadata must identify v0.18.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.18\.0<\/title>/, 'browser title must identify v0.18.0');
assert.ok(html.includes('id="CASCADELAB018"') && html.includes('src="./failure-autopsy.js"') && html.includes('data-cascade-lab-autopsy="0.18.0"'), 'Failure Autopsy layer must load');
assert.ok(html.includes("new CustomEvent('cascade-lab:run-finished'") && html.includes("notifyOsgardLifecycle('ready', { version: '0.18.0' })"), 'base game must emit a versioned local run summary');
assert.ok(html.includes("application: { name: 'CASCADE LAB', version: '0.18.0'"), 'local reports must carry the current release');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'diagnostic layer must not send session data to a server');

const damaged = api.diagnoseRun({
  status: 'lost', levelId: 5, levelTitle: 'Хрупкий груз', fragile: true,
  reason: 'Слишком жёсткое приземление: хрупкий контейнер повреждён',
  timeSeconds: 2.3, deviceCount: 1, devices: [{ type: 'spring' }],
  telemetry: { lastImpactSpeed: 640, activations: 1, events: [
    { type: 'start', label: 'Симуляция запущена', t: 0 },
    { type: 'spring', label: 'Пружина сработала', t: 1.2 },
    { type: 'landing', label: 'Приземление · 640 px/s', t: 2.2, speed: 640 },
    { type: 'damage', label: 'Хрупкий груз повреждён', t: 2.3 }
  ] }
});
assert.equal(damaged.kind, 'impact');
assert.match(damaged.evidence.join(' '), /640 px\/s/);
assert.match(damaged.nextTest, /только угол/);
assert.match(damaged.disclaimer, /не доказывает причинность/);

const missed = api.diagnoseRun({
  status: 'lost', levelId: 2, levelTitle: 'Второй этаж',
  reason: 'Маршрут не завершён: пропущена контрольная точка верхний сканер',
  checkpoints: [{ id: 'scan', label: 'Верхний сканер', x: 590, y: 350 }],
  checkpointsReached: [], position: { x: 892, y: 460 },
  telemetry: { events: [{ type: 'goal-missed', label: 'Финиш недоступен: пропущена контрольная точка', t: 4.2 }] }
});
assert.equal(missed.kind, 'checkpoint');
assert.match(missed.evidence.join(' '), /Верхний сканер/);

const closedGate = api.diagnoseRun({
  status: 'lost', levelId: 4, levelTitle: 'Красный шлюз', gateCount: 1,
  gateOpen: false, devices: [{ type: 'switch', x: 705, y: 456 }],
  switchZone: { x: 705, y: 456 }, reason: 'Контейнер покинул трассу',
  position: { x: 820, y: 478 }, telemetry: { events: [{ type: 'fall', label: 'Груз покинул трассу', t: 6 }] }
});
assert.equal(closedGate.kind, 'gate');
assert.match(closedGate.nextTest, /Контакт/);

const fell = api.diagnoseRun({
  status: 'lost', reason: 'Контейнер покинул трассу', position: { x: 1038, y: 480 },
  velocity: { x: 415, y: 124 }, devices: [{ type: 'spring' }],
  telemetry: { events: [{ type: 'spring', label: 'Пружина сработала', t: 1 }, { type: 'fall', label: 'Груз покинул трассу', t: 3 }] }
});
assert.equal(fell.kind, 'fall');
assert.match(fell.evidence.join(' '), /1038 px/);

const timedOut = api.diagnoseRun({
  status: 'lost', reason: 'Время симуляции истекло', timeSeconds: 28.01,
  position: { x: 510, y: 440 }, telemetry: { events: [{ type: 'timeout', label: 'Лимит времени превышен', t: 28.01 }] }
});
assert.equal(timedOut.kind, 'timeout');
assert.match(timedOut.nextTest, /12 px/);

const successful = api.diagnoseRun({
  status: 'won', levelId: 1, levelTitle: 'Первый каскад', par: 1,
  parTime: 4.2, timeSeconds: 3.8, deviceCount: 2,
  devices: [{ type: 'spring' }, { type: 'belt' }],
  telemetry: { activations: 1, events: [{ type: 'spring', label: 'Пружина сработала', t: 1 }] }
});
assert.equal(successful.kind, 'success');
assert.match(successful.nextTest, /Конвейер/);
assert.match(successful.exportText, /Следующий тест:/);

const unknown = api.diagnoseRun({});
assert.equal(unknown.kind, 'review');
assert.ok(unknown.nextTest.length > 20);

console.log('CASCADE LAB Failure Autopsy smoke: PASS — v0.18.0, local event contract, 6 diagnostic paths, one-variable experiments, no network telemetry.');
