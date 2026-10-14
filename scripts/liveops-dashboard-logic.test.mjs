import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/games/admin/dashboard-logic.js', import.meta.url), 'utf8');
const context = { window: {} };
runInNewContext(source, context);
const logic = context.window.OSGARDLiveOpsDashboard;
assert.ok(logic, 'dashboard logic API must be exposed');
const plain = value => JSON.parse(JSON.stringify(value));

test('valid dates produce an exact millisecond range', () => {
  const range = logic.parseDateRange('2026-10-14T10:00', '2026-10-15T10:00', Date.parse('2026-10-15T10:01:00Z'));
  assert.equal(range.to - range.from, 24 * 60 * 60 * 1000);
  assert.equal(range.durationMs, 24 * 60 * 60 * 1000);
});

test('invalid and reversed date ranges are rejected', () => {
  assert.throws(() => logic.parseDateRange('', '2026-10-15T10:00', Date.now()), /корректный диапазон/i);
  assert.throws(() => logic.parseDateRange('2026-10-15T12:00', '2026-10-15T10:00', Date.now()), /раньше конца/i);
});

test('future end times and periods greater than 366 days are rejected', () => {
  assert.throws(() => logic.parseDateRange('2026-10-14T10:00', '2026-10-16T10:00', Date.parse('2026-10-15T10:00:00Z')), /будущем/i);
  assert.throws(() => logic.parseDateRange('2025-01-01T00:00', '2026-10-01T00:00', Date.parse('2026-10-15T10:00:00Z')), /366 днями/i);
});

test('previous comparison window is immediately adjacent and has equal duration', () => {
  const current = { from: 100_000, to: 200_000 };
  const previous = logic.previousPeriod(current);
  assert.deepEqual(plain(previous), { from: 0, to: 100_000, durationMs: 100_000 });
});

test('quick period presets have predictable durations', () => {
  const now = Date.parse('2026-10-15T10:00:00Z');
  for (const [preset, hours] of [['day',24], ['week',168], ['month',720], ['quarter',2160]]) {
    const range = logic.rangeForPreset(preset, now);
    assert.equal(range.to.getTime() - range.from.getTime(), hours * 60 * 60 * 1000);
  }
  assert.throws(() => logic.rangeForPreset('year', now), /Неизвестный период/i);
});

test('metric collection only emits known, finite numeric aggregates', () => {
  const rows = logic.collectMetrics({ events: 10, private: { email: 'hidden@example.invalid', players: 4, nested: { sessions: 3 } }, eventCount: 11, items: [ { players: 999 } ], invalid: Infinity });
  assert.deepEqual(plain(rows), [
    { label: 'Игровые события', value: 10 },
    { label: 'Игроки', value: 4 },
    { label: 'Сессии', value: 3 },
  ]);
});

test('period comparison reports direction and percent without claiming growth is good', () => {
  const rows = logic.compareMetricRows(
    [{ label: 'Игроки', value: 150 }, { label: 'Сессии', value: 12 }, { label: 'Игровые события', value: 4 }],
    [{ label: 'Игроки', value: 100 }, { label: 'Сессии', value: 12 }, { label: 'Игровые события', value: 0 }, { label: 'Жалобы', value: 2 }]
  );
  assert.deepEqual(plain(rows), [
    { label: 'Игроки', current: 150, previous: 100, delta: 50, percentChange: 50, direction: 'up', zeroBaseline: false },
    { label: 'Сессии', current: 12, previous: 12, delta: 0, percentChange: 0, direction: 'flat', zeroBaseline: false },
    { label: 'Игровые события', current: 4, previous: 0, delta: 4, percentChange: null, direction: 'up', zeroBaseline: true },
  ]);
});

test('metrics that are absent from either period are not fabricated as zeroes', () => {
  assert.deepEqual(plain(logic.compareMetricRows([{ label: 'Игроки', value: 3 }], [])), []);
});
