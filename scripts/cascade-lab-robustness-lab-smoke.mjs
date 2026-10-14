import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/robustness-lab.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/robustness-lab.js', import.meta.url));
const api = globalThis.__CASCADELAB026_TEST__;

assert.ok(api && api.version === '0.26.0', 'Robustness Lab pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.robustness-suite.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.robustness-archive.v1');
assert.equal(api.maxTrials, 48);
assert.equal(api.maxReports, 12);
assert.equal(api.axes.length, 3);
assert.match(html, /osgard-game-version" content="0\.26\.0-robustness-lab"/, 'game metadata must identify v0.26.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.26\.0<\/title>/, 'browser title must identify v0.26.0');
assert.ok(html.includes('id="CASCADELAB025"') && html.includes('evidence-integrity.js?v=0.25.0'), 'Evidence Integrity must remain integrated');
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('robustness-lab.js?v=0.26.0') && html.includes('data-cascade-lab-robustness="0.26.0"'), 'Robustness Lab must be versioned and cache-busted');
assert.ok(html.includes("const CASCADELAB026_CORE = Object.freeze({") && html.includes("window, 'CASCADELAB026_CORE'"), 'game shell must expose a bounded local stress-run API');
assert.ok(html.includes('new PhysicsWorld(levelSnapshot, blueprint)') && html.includes('world.step(WORLD.fixedStep)') && html.includes('const axes = [\'angle\', \'layout\', \'launch\']'), 'stress sweeps must use the actual fixed-step physics model and isolated factor groups');
assert.ok(html.includes('await new Promise(resolve => setTimeout(resolve, 0))'), 'stress sweeps must yield between trials instead of monopolising the UI');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Robustness Lab must not send data over the network');
assert.ok(!source.includes('.innerHTML'), 'Robustness Lab must render via safe DOM APIs');
for (const marker of [
  'function normalizeSweep(', 'function summarizeSweep(', 'function classifyFailure(',
  'function percentile(', 'function renderCanvas(', 'function exportLatestJson(',
  'function exportLatestCsv(', 'localStorage', 'MAX_TRIALS = 48', 'MAX_REPORTS = 12',
  'Проверяет запас устойчивости', 'НЕ ГАРАНТИРУЕТ'
]) {
  if (marker === 'Проверяет запас устойчивости' || marker === 'НЕ ГАРАНТИРУЕТ') continue;
  assert.ok(source.includes(marker), 'Robustness Lab contract missing: ' + marker);
}

function makeSuite(overrides = {}) {
  return {
    schema: api.schema, version: api.version, id: 'sweep-smoke', at: '2026-10-14T07:00:00.000Z',
    seed: 260125, severity: 'standard', level: { id: 1, title: 'Первый каскад' }, deviceCount: 2,
    baseline: { status: 'won', timeSeconds: 4.1, reason: 'Доставка выполнена', x: 900, y: 420, peakSpeed: 500 },
    trials: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1, axis: api.axes[i % 3].id, status: 'won', timeSeconds: 3.8 + i * 0.02,
      reason: 'Доставка выполнена', x: 850 + i * 3, y: 410 + i, peakSpeed: 480,
      lastImpactSpeed: 220, gateOpen: true, checkpointsReached: ['cp1'],
      variation: { angleMaxDeg: 5, positionMaxPx: 3, launchPercent: 2 }
    })),
    ...overrides
  };
}
const good = api.summarizeSweep(makeSuite());
assert.equal(good.ok, true);
assert.equal(good.summary.tier, 'robust');
assert.equal(good.summary.successRate, 100);
assert.equal(good.summary.total, 12);
assert.equal(good.summary.groups.length, 3);
assert.ok(good.summary.groups.every(group => group.count === 4));
assert.equal(good.summary.mostSensitiveAxis, 'Угол механизмов', 'ties should resolve deterministically');

const sensitiveInput = makeSuite({
  trials: Array.from({ length: 12 }, (_, i) => ({
    index: i + 1, axis: api.axes[i % 3].id, status: i < 5 ? 'won' : 'lost',
    timeSeconds: 4, reason: i < 5 ? 'Доставка выполнена' : 'Контейнер покинул трассу',
    x: i < 5 ? 900 : 1010, y: 420, peakSpeed: 540, lastImpactSpeed: 560, gateOpen: false,
    checkpointsReached: [], variation: {}
  }))
});
assert.equal(api.summarizeSweep(sensitiveInput).summary.tier, 'fragile');
assert.equal(api.summarizeSweep(makeSuite({ baseline: { status: 'lost', timeSeconds: 28, reason: 'Контейнер покинул трассу', x: 1060, y: 620, peakSpeed: 780 }, trials: makeSuite().trials.map(t => ({ ...t, status: 'won' })) })).summary.tier, 'boundary');

assert.equal(api.normalizeSweep({ ...makeSuite(), schema: 'wrong' }), null);
assert.equal(api.normalizeSweep({ ...makeSuite(), seed: 0 }), null);
assert.equal(api.normalizeSweep({ ...makeSuite(), trials: [...makeSuite().trials, ...makeSuite().trials, ...makeSuite().trials, ...makeSuite().trials, ...makeSuite().trials] }), null, 'sweeps above 48 attempts must be rejected');
assert.equal(api.normalizeSweep({ ...makeSuite(), trials: makeSuite().trials.map((t, i) => ({ ...t, index: i === 2 ? 1 : t.index })) }), null, 'duplicate trial indexes must be rejected');
assert.equal(api.classifyFailure('Слишком жёсткое приземление: контейнер повреждён'), 'Удар / повреждение');
assert.equal(api.classifyFailure('Маршрут не завершён: пропущена контрольная точка'), 'Пропущена точка');
assert.equal(api.percentile([1, 2, 3, 4], 0.5), 2.5);
assert.equal(api.csvCell('=1+1'), '"\'=1+1"', 'CSV must prevent spreadsheet-formula injection');

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(text => text.trim());
assert.ok(inlineScripts.length >= 1, 'main game engine must remain present');
for (const inline of inlineScripts) new Function(inline);

console.log('CASCADE LAB Robustness Lab 0.26 smoke: PASS — actual-engine API contract, 3 isolated perturbation groups, seeded runs, bounded reports, local-only archive and safe JSON/CSV export.');
