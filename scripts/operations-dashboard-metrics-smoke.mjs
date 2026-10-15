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
  'lastFullReport',
  "credentials: 'omit'",
  "method: 'GET'",
]) assert.ok(page.includes(marker), 'missing dashboard capability: ' + marker);

assert.ok(!/localStorage|sessionStorage|document\.cookie/i.test(page), 'dashboard remains session-only and does not access browser persistence or cookies');
assert.ok(!/<script\b[^>]*\bsrc=["']https?:\/\//i.test(page), 'dashboard must not load third-party scripts');
console.log('PASS Operations Pulse metrics: percentiles, state counts, true regressions/recoveries, delta sorting inputs, session-only reports and accessible control wiring.');
