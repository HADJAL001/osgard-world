import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile('public/games/operations/metrics.js', 'utf8');
const windowStub = {};
runInNewContext(source, { window: windowStub });
const engine = windowStub.OSGARDOperationsMetrics;
assert.ok(engine, 'pure operations metrics engine must be exported');

const summary = engine.summarize([
  { id:'fast', state:'pass', elapsedMs:100 },
  { id:'slow', state:'warn', elapsedMs:3000 },
  { id:'failed', state:'fail', elapsedMs:50 },
  { id:'cancelled', state:'cancelled', elapsedMs:0 },
]);
assert.deepEqual({ ...summary.counts }, { passed:1, warnings:1, failed:1, cancelled:1 });
assert.equal(summary.sampleCount, 3, 'cancelled routes must not pollute latency percentiles');
assert.equal(summary.medianMs, 100);
assert.equal(summary.p95Ms, 3000);
assert.equal(summary.maxMs, 3000);
assert.equal(summary.averageMs, 1050);
assert.equal(summary.slowOver2500Ms, 1);
assert.equal(engine.median([]), null);
assert.equal(engine.percentile([], 0.95), null);

const previous = {
  finishedAt:'2026-10-15T10:00:00.000Z',
  results:[
    { id:'a', state:'pass', elapsedMs:100 },
    { id:'b', state:'fail', elapsedMs:800 },
    { id:'c', state:'warn', elapsedMs:2000 },
  ],
};
const current = [
  { id:'a', state:'fail', elapsedMs:700 },
  { id:'b', state:'pass', elapsedMs:400 },
  { id:'c', state:'warn', elapsedMs:1000 },
  { id:'d', state:'cancelled', elapsedMs:0 },
];
const comparison = engine.compare(previous, current);
assert.equal(comparison.comparedRoutes, 3);
assert.equal(comparison.regressions, 1, 'pass -> fail must count as a regression');
assert.equal(comparison.recoveries, 1, 'fail -> pass must count as a recovery');
assert.equal(comparison.averageLatencyDeltaMs, -267);
assert.equal(comparison.changes.length, 3);
assert.equal(engine.compare(previous, [{ id:'d', state:'pass', elapsedMs:20 }]), null);

const targets = [
  { id:'a', label:'ALPHA', path:'/games/alpha/', group:'Игра' },
  { id:'b', label:'BETA', path:'/games/beta/', group:'Игра' },
];
const historicalReport = {
  schemaVersion:2,
  reportType:'osgard-games-readonly-route-health',
  finishedAt:'2026-10-15T10:00:00.000Z',
  results:[
    { id:'a', path:'/games/alpha/', label:'<img src=x onerror=alert(1)>', state:'pass', status:200, elapsedMs:110 },
    { id:'b', path:'/games/beta/', label:'BETA', state:'warn', status:200, elapsedMs:2800 },
  ],
};
const baseline = engine.normalizeBaseline(historicalReport, targets);
assert.equal(baseline.results.length, 2);
assert.equal(baseline.results[0].label, 'ALPHA', 'untrusted labels are replaced with registry-owned labels');
assert.equal(baseline.results[0].path, '/games/alpha/');
assert.equal(baseline.results[0].detail, '', 'untrusted diagnostic details are not re-rendered from a baseline');
assert.throws(() => engine.normalizeBaseline({ ...historicalReport, results:[{ ...historicalReport.results[0], id:'unknown' }] }, targets), /неизвестный, повторный или несовпадающий маршрут/i);
assert.throws(() => engine.normalizeBaseline({ ...historicalReport, results:[historicalReport.results[0], historicalReport.results[0]] }, targets), /неизвестный, повторный или несовпадающий маршрут/i);
assert.throws(() => engine.normalizeBaseline({ ...historicalReport, results:[{ ...historicalReport.results[0], elapsedMs:500000 }] }, targets), /некорректное состояние, HTTP-код или задержку/i);
assert.throws(() => engine.normalizeBaseline({ ...historicalReport, results:[{ ...historicalReport.results[0], path:'/evil/' }] }, targets), /неизвестный, повторный или несовпадающий маршрут/i);

const page = await readFile('public/games/operations/index.html', 'utf8');
assert.ok(page.includes('<script src="/games/operations/metrics.js"></script>'), 'dashboard must load the tested same-origin metrics engine');
for (const marker of [
  'id="cancel-checks"',
  'id="retry-problems"',
  'id="result-search"',
  'id="group-filter"',
  'id="sort-results"',
  'id="run-progress"',
  'id="metric-median"',
  'id="metric-p95"',
  'id="baseline-file"',
  'id="load-baseline"',
  'id="clear-baseline"',
  'metrics.normalizeBaseline(report, TARGETS)',
  'file.size > 2 * 1024 * 1024',
  'lastFullReport',
  "credentials: 'omit'",
  "method: 'GET'",
]) assert.ok(page.includes(marker), 'missing dashboard capability: ' + marker);

assert.ok(!/localStorage|sessionStorage|document\.cookie/i.test(page), 'dashboard remains session-only and does not access browser persistence or cookies');
assert.ok(!/<script\b[^>]*\bsrc=["']https?:\/\//i.test(page), 'dashboard must not load third-party scripts');
console.log('PASS Operations Pulse metrics: percentiles, regression/recovery comparison, safe local JSON baseline import, size/schema/path validation, session-only reports and accessible control wiring.');
