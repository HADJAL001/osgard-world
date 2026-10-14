import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/games/admin/analytics-core.js', 'utf8');
const context = { console, Intl, Date, Number, Set, Map, Object, Math, TypeError, RangeError };
vm.runInNewContext(source, context, { filename: 'analytics-core.js', timeout: 1000 });
const api = context.OSGARDLiveOpsMetrics;
assert.ok(api, 'analytics helper must expose the testable contract');

const summary = { totals: { events: 1250, distinctPlayers: 120, sessions: 340 }, ignored: [{ events: 9999 }], tooDeep: { a: { b: { c: { events: 8 } } } } };
assert.deepEqual(JSON.parse(JSON.stringify(api.collectMetrics(summary))), [
  { key: 'events', label: 'Игровые события', value: 1250 },
  { key: 'distinctPlayers', label: 'Уникальные игроки', value: 120 },
  { key: 'sessions', label: 'Сессии', value: 340 },
], 'metric collector should be bounded and should skip arrays/deep payloads');

const comparison = api.compareMetrics(
  { events: 150, players: 15, reports: 0 },
  { events: 100, players: 20, reports: 0 },
);
const byLabel = Object.fromEntries(comparison.map(row => [row.label, row]));
assert.equal(byLabel['Игровые события'].comparison.delta, 50);
assert.equal(byLabel['Игровые события'].comparison.percent, 50);
assert.equal(byLabel['Игроки'].comparison.delta, -5);
assert.equal(byLabel['Игроки'].comparison.percent, -25);
assert.equal(byLabel['Жалобы'].comparison.direction, 'flat');
assert.match(api.formatComparison(byLabel['Игровые события'].comparison), /\+50/);
assert.match(api.formatComparison(api.compareMetrics({ events: 4 }, { events: 0 })[0].comparison), /новая активность после нуля/);
assert.equal(api.compareMetrics({ events: 4 }, {})[0].comparison, null);

const now = 1_800_000_000_000;
for (const [preset, duration] of [['24h', 86400000], ['7d', 604800000], ['30d', 2592000000], ['90d', 7776000000]]) {
  const range = api.presetRange(preset, now);
  assert.equal(range.to - range.from, duration, preset + ' preset duration');
  assert.equal(range.to, now);
}
const current = { from: now - 7 * 86400000, to: now };
const previous = api.previousRange(current);
assert.equal(previous.to, current.from);
assert.equal(previous.to - previous.from, current.to - current.from);
assert.equal(api.validateRange(current, now).ok, true);
assert.equal(api.validateRange({ from: now, to: now - 1 }, now).ok, false);
assert.equal(api.validateRange({ from: 0, to: now }, now).ok, false, 'period beyond 366 days should be rejected');
assert.equal(api.validateRange({ from: now - 60000, to: now + 3600000 }, now).ok, false, 'future period should be rejected');


const oneDay = 86400000;
const briefNow = 1_800_000_000_000;
const briefRange = { from: briefNow - 7 * oneDay, to: briefNow };
const alignedPrevious = { from: briefNow - 14 * oneDay, to: briefNow - 7 * oneDay };
const brief = api.buildDecisionBrief({
  generatedAt: new Date(briefNow).toISOString(),
  range: briefRange,
  previousRange: alignedPrevious,
  comparisonStatus: 'available',
  summary: { totals: { events: 120, sessions: 30, openReports: 3, distinctPlayers: 45 } },
  previousSummary: { totals: { events: 80, sessions: 20, openReports: 1, distinctPlayers: 40 } },
  cohorts: { items: [{ count: 5 }] },
  snapshots: { items: [] },
}, { now: briefNow });
assert.equal(brief.schema, 'osgard.liveops-decision-brief.v1');
assert.equal(brief.dataQuality.status, 'ok');
assert.equal(brief.baseline.aligned, true);
assert.equal(brief.period.durationMs, 7 * oneDay);
assert.equal(brief.signals.length, 3, 'material changes should create explainable signals but small player changes should not');
const complaintSignal = brief.signals.find(item => item.metric === 'openReports');
assert.equal(complaintSignal.severity, 'attention');
assert.match(complaintSignal.recommendedCheck, /жалоб|модерац/i);
assert.ok(brief.signals.every(item => item.explanation && item.recommendedCheck), 'each signal must provide context and a follow-up check');
assert.ok(brief.interpretationLimits.some(item => /причинно-следственн/i.test(item)));

const zeroBaselineBrief = api.buildDecisionBrief({
  range: briefRange, previousRange: alignedPrevious, comparisonStatus: 'available',
  summary: { totals: { events: 12 } }, previousSummary: { totals: { events: 0 } },
  cohorts: {}, snapshots: {},
}, { now: briefNow });
assert.equal(zeroBaselineBrief.signals.length, 1);
assert.equal(zeroBaselineBrief.signals[0].percent, null);
assert.equal(zeroBaselineBrief.signals[0].zeroBaseline, true);

const unalignedBrief = api.buildDecisionBrief({
  range: briefRange,
  previousRange: { from: briefNow - 4 * oneDay, to: briefNow - 3 * oneDay },
  comparisonStatus: 'available',
  summary: { totals: { events: 1000 } }, previousSummary: { totals: { events: 10 } },
  cohorts: { unavailable: true }, snapshots: { unavailable: true },
}, { now: briefNow });
assert.equal(unalignedBrief.baseline.aligned, false);
assert.equal(unalignedBrief.signals.length, 0, 'misaligned baseline must never produce trend signals');
assert.equal(unalignedBrief.dataQuality.status, 'degraded');
assert.ok(unalignedBrief.dataQuality.warnings.length >= 3);

const noBaselineBrief = api.buildDecisionBrief({
  range: briefRange, comparisonStatus: 'disabled',
  summary: { totals: { events: 120 } }, cohorts: {}, snapshots: {},
}, { now: briefNow });
assert.equal(noBaselineBrief.baseline.available, false);
assert.equal(noBaselineBrief.signals.length, 0);

const sensitiveInput = {
  range: briefRange, comparisonStatus: 'disabled',
  summary: { totals: { events: 3, email: 'private@example.com', playerId: 'player-secret', token: 'do-not-export' } },
  cohorts: { email: 'another@example.com' }, snapshots: { sessionId: 'secret-session' },
};
const safeBrief = api.buildDecisionBrief(sensitiveInput, { now: briefNow });
const safeJson = JSON.stringify(safeBrief);
for (const secret of ['private@example.com', 'another@example.com', 'player-secret', 'do-not-export', 'secret-session']) {
  assert.equal(safeJson.includes(secret), false, 'decision brief must not export raw or personal API fields');
}
assert.deepEqual(safeBrief.metrics.map(item => item.key), ['events'], 'only whitelisted aggregate metric keys may be exported');

console.log('PASS LiveOps analytics core: bounded metrics, period comparison, zero baseline, presets and date validation.');
