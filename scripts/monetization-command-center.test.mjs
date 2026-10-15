import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_INPUTS } from '../public/games/monetization/model.js';
import { projectCohortCashFlow } from '../public/games/monetization/forecast.mjs';
import {
  EXPERIMENT_DRIVERS,
  createExperiment,
  completeExperiment,
  transitionExperiment,
  normalizeExperimentCollection,
  summarizeExperiments,
  createExperimentBackup,
  parseExperimentBackup,
} from '../public/games/monetization/experiments.mjs';

const NOW = '2026-10-15T00:00:00.000Z';
function fixture(overrides = {}) {
  return createExperiment({
    title: 'Тест конверсии в запуск',
    hypothesis: 'Изменение первого экрана увеличит долю запуска игры на когорте новых посетителей.',
    driver: 'gameStartRate',
    direction: 'increase',
    baseline: 30,
    target: 36,
    dueDate: '2026-11-01',
  }, { id: 'experiment_1', now: NOW, ...overrides });
}

test('cohort projection produces a bounded 12-month monthly cash-flow series', () => {
  const result = projectCohortCashFlow(DEFAULT_INPUTS, { months: 12, startingCashUsd: 10000 });
  assert.equal(result.schema, 'osgard.cohort-cashflow.v1');
  assert.equal(result.series.length, 12);
  assert.equal(result.series[0].month, 1);
  assert.equal(result.series[11].month, 12);
  assert.ok(result.series.every(row => Number.isFinite(row.grossRevenueUsd) && Number.isFinite(row.netCashFlowUsd)));
  assert.ok(result.endingMrrUsd >= 0);
  assert.equal(result.startingCashUsd, 10000);
});

test('subscription MRR compounds cohorts and responds monotonically to churn and price', () => {
  const lowChurn = projectCohortCashFlow({ ...DEFAULT_INPUTS, subscriptionMonthlyChurnPct: 2 }, { months: 24 });
  const highChurn = projectCohortCashFlow({ ...DEFAULT_INPUTS, subscriptionMonthlyChurnPct: 25 }, { months: 24 });
  const higherPrice = projectCohortCashFlow({ ...DEFAULT_INPUTS, subscriptionMonthlyPriceUsd: 5.99 }, { months: 24 });
  assert.ok(lowChurn.endingMrrUsd > highChurn.endingMrrUsd);
  assert.ok(higherPrice.endingMrrUsd > lowChurn.endingMrrUsd);
  assert.ok(lowChurn.series[11].subscribers > lowChurn.series[0].subscribers);
});

test('cash runway uses explicit starting reserve and flags depletion without fabricating a break-even month', () => {
  const result = projectCohortCashFlow({
    ...DEFAULT_INPUTS,
    monthlyVisitors: 0,
    sponsorDealsPerMonth: 0,
    averageSponsorDealUsd: 0,
    monthlyOperatingCostUsd: 10000,
  }, { months: 12, startingCashUsd: 2000 });
  assert.equal(result.cashDepletionMonth, 1);
  assert.equal(result.operatingBreakEvenMonth, null);
  assert.ok(result.endingCashUsd < 0);
});

test('projection horizon and starting cash are bounded', () => {
  assert.equal(projectCohortCashFlow(DEFAULT_INPUTS, { months: 999, startingCashUsd: 0 }).series.length, 36);
  assert.equal(projectCohortCashFlow(DEFAULT_INPUTS, { months: -3, startingCashUsd: -50 }).series.length, 1);
  assert.equal(projectCohortCashFlow(DEFAULT_INPUTS, { months: 1, startingCashUsd: -50 }).startingCashUsd, 0);
});

test('experiment creation sanitizes text and rejects invalid driver/date/range', () => {
  const entry = fixture();
  assert.equal(entry.title, 'Тест конверсии в запуск');
  assert.equal(entry.status, 'planned');
  assert.throws(() => createExperiment({ title: 'x', hypothesis: 'too short', driver: 'unknown', direction: 'increase', baseline: 1, target: 2 }, { id: 'x', now: NOW }), /Название|гипотеза|показатель/i);
  assert.throws(() => createExperiment({ ...entry, dueDate: '2026-02-30' }, { id: 'bad_date', now: NOW }), /календарн|Дата/i);
  assert.throws(() => createExperiment({ ...entry, baseline: 'NaN' }, { id: 'bad_number', now: NOW }), /числом/i);
});

test('completed experiment records actual value, target success and observed lift', () => {
  const success = completeExperiment(fixture(), 38, { now: '2026-11-02T00:00:00.000Z' });
  assert.equal(success.status, 'completed');
  assert.equal(success.targetAchieved, true);
  assert.equal(summarizeExperiments([success], '2026-11-03T00:00:00.000Z').targetHitRatePct, 100);
  const miss = completeExperiment(fixture({ id: 'experiment_2' }), 32, { now: '2026-11-02T00:00:00.000Z' });
  assert.equal(miss.targetAchieved, false);
  assert.equal(summarizeExperiments([success, miss]).completed, 2);
  assert.equal(summarizeExperiments([success, miss]).targetHitRatePct, 50);
});

test('decrease-direction experiments treat lower actual value as success', () => {
  const entry = createExperiment({
    title: 'Снизить отток',
    hypothesis: 'Изменение онбординга снизит месячный отток платящих подписчиков.',
    driver: 'subscriptionMonthlyChurnPct',
    direction: 'decrease',
    baseline: 8,
    target: 6,
  }, { id: 'churn_test', now: NOW });
  assert.equal(completeExperiment(entry, 5.5, { now: NOW }).targetAchieved, true);
  assert.equal(completeExperiment(entry, 7, { now: NOW }).targetAchieved, false);
});

test('terminal experiment states cannot be reopened or overwritten', () => {
  const done = completeExperiment(fixture(), 37, { now: NOW });
  assert.throws(() => transitionExperiment(done, 'running', { now: NOW }), /завершён|невозможно/i);
  const cancelled = transitionExperiment(fixture({ id: 'cancel_me' }), 'cancelled', { now: NOW });
  assert.equal(cancelled.status, 'cancelled');
  assert.throws(() => completeExperiment(cancelled, 40, { now: NOW }), /завершить|невозможно/i);
});

test('experiment collection removes duplicate IDs and is bounded to forty records', () => {
  const records = Array.from({ length: 50 }, (_, i) => fixture({
    id: 'exp_' + i,
    now: new Date(Date.parse(NOW) + i * 1000).toISOString(),
  }));
  records.push(records[0]);
  const clean = normalizeExperimentCollection(records);
  assert.equal(clean.length, 40);
  assert.equal(new Set(clean.map(item => item.id)).size, 40);
});

test('experiment JSON backup roundtrips and rejects wrong schema, duplicates and oversized content', () => {
  const entries = [fixture(), fixture({ id: 'experiment_2' })];
  const backup = createExperimentBackup(entries, { now: NOW });
  const restored = parseExperimentBackup(JSON.stringify(backup));
  assert.equal(restored.length, 2);
  assert.equal(restored[0].schema, 'osgard.experiment.v1');
  assert.throws(() => parseExperimentBackup(JSON.stringify({ kind: 'wrong', version: 1, entries: [] })), /схеме/i);
  assert.throws(() => parseExperimentBackup(JSON.stringify({ ...backup, entries: [entries[0], entries[0]] })), /дублирующихся/i);
  assert.throws(() => parseExperimentBackup(' '.repeat(500001)), /500 КБ/i);
});

test('premium command center is local-first and has wired UI for cash-flow and experiment lifecycle', async () => {
  const page = await readFile(new URL('../public/games/monetization/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/games/monetization/app.js', import.meta.url), 'utf8');
  const forecast = await readFile(new URL('../public/games/monetization/forecast.mjs', import.meta.url), 'utf8');
  const ledger = await readFile(new URL('../public/games/monetization/experiments.mjs', import.meta.url), 'utf8');
  for (const id of [
    'cashflow-starting-cash', 'cashflow-horizon', 'cashflow-ending-mrr', 'cashflow-ending-cash',
    'cashflow-break-even-month', 'cashflow-runway-month', 'cashflow-rows', 'experiment-create',
    'experiment-driver', 'experiment-baseline', 'experiment-target', 'experiment-hypothesis',
    'experiment-selected', 'experiment-actual', 'experiment-complete', 'experiment-status-update',
    'experiment-delete', 'experiment-export', 'experiment-import-file', 'experiment-target-hit-rate',
  ]) assert.ok(page.includes('id="' + id + '"'), 'Missing command-center UI: ' + id);
  assert.ok(app.includes('projectCohortCashFlow') && app.includes('renderCashFlow(inputs)'));
  assert.ok(app.includes('completeExperiment') && app.includes('parseExperimentBackup'));
  assert.ok(!/\bfetch\s*\(/.test(app), 'Cash flow and experiment ledger must not make network requests');
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(forecast + ledger), 'Pure local engines must stay offline');
  assert.ok(ledger.includes('MAX_EXPERIMENTS = 40') && ledger.includes('MAX_EXPERIMENT_BACKUP_BYTES = 500_000'));
  assert.ok(EXPERIMENT_DRIVERS.length >= 10);
});
