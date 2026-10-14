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

console.log('PASS LiveOps analytics core: bounded metrics, period comparison, zero baseline, presets and date validation.');
