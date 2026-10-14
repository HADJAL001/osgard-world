import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_INPUTS,
  calculateScenario,
  calculateRequiredMonthlyVisitors,
} from '../public/games/monetization/model.js';
import {
  runUncertaintySimulation,
  calculateBreakEvenMonthlyVisitors,
  analyzeSensitivity,
  buildDecisionRecommendations,
} from '../public/games/monetization/intelligence.mjs';

test('uncertainty simulation is deterministic for the same seed and inputs', () => {
  const a = runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 500, seed: 42 });
  const b = runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 500, seed: 42 });
  assert.deepEqual(a, b);
  assert.equal(a.seed, 42);
  assert.equal(a.iterations, 500);
});

test('simulation returns ordered percentiles and bounded probability rates', () => {
  const result = runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 300, seed: 20261015 });
  for (const distribution of [result.netOperatingUsd, result.grossMonthlyRevenueUsd, result.annualGrossRevenueUsd]) {
    assert.ok(Number.isFinite(distribution.p10));
    assert.ok(distribution.p10 <= distribution.p50);
    assert.ok(distribution.p50 <= distribution.p90);
    assert.ok(Number.isFinite(distribution.mean));
  }
  assert.ok(result.probabilityBreakEvenPct >= 0 && result.probabilityBreakEvenPct <= 100);
  assert.ok(result.probabilityAnnualTargetPct >= 0 && result.probabilityAnnualTargetPct <= 100);
  assert.equal(result.schema, 'osgard.revenue-uncertainty.v1');
  assert.match(result.note, /не прогноз/i);
});

test('simulation clamps requested iterations and tolerates invalid options', () => {
  assert.equal(runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 10, seed: 2 }).iterations, 100);
  assert.equal(runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 9000, seed: 2 }).iterations, 5000);
  const result = runUncertaintySimulation(DEFAULT_INPUTS, { iterations: 'bad', seed: 'NaN' });
  assert.equal(result.iterations, 1500);
  assert.equal(result.seed, 20261015);
});

test('break-even visitor count is minimal when attainable', () => {
  const inputs = { ...DEFAULT_INPUTS, monthlyOperatingCostUsd: 250 };
  const count = calculateBreakEvenMonthlyVisitors(inputs);
  assert.ok(Number.isInteger(count) && count >= 0);
  assert.ok(calculateScenario({ ...inputs, monthlyVisitors: count }, 'base').netOperatingUsd >= 0);
  if (count > 0) {
    assert.ok(calculateScenario({ ...inputs, monthlyVisitors: count - 1 }, 'base').netOperatingUsd < 0);
  }
});

test('break-even returns null when no variable revenue can cover costs', () => {
  const inputs = {
    ...DEFAULT_INPUTS,
    monthlyVisitors: 0,
    gameStartRate: 0,
    sessionsPerPlayer: 0,
    adSlotsPerSession: 0,
    paidConversionRate: 0,
    subscriptionConversionRatePct: 0,
    leadRate: 0,
    sponsorDealsPerMonth: 0,
    averageSponsorDealUsd: 0,
    monthlyOperatingCostUsd: 1000000,
  };
  assert.equal(calculateBreakEvenMonthlyVisitors(inputs, 100000), null);
  assert.equal(calculateBreakEvenMonthlyVisitors({ ...inputs, monthlyOperatingCostUsd: 0 }, 0), 0);
});

test('sensitivity is ranked by impact and points toward lower costs / higher revenue levers', () => {
  const items = analyzeSensitivity(DEFAULT_INPUTS, 'base', 20);
  assert.ok(items.length >= 10);
  for (let index = 1; index < items.length; index += 1) {
    assert.ok(items[index - 1].impactUsd >= items[index].impactUsd);
  }
  assert.equal(items.find((item) => item.key === 'monthlyOperatingCostUsd').favorableDirection, 'decrease');
  assert.equal(items.find((item) => item.key === 'ecpmUsd').favorableDirection, 'increase');
  assert.ok(items.every((item) => Number.isFinite(item.impactUsd) && item.impactUsd >= 0));
});

test('decision recommendations surface operational bottlenecks before traffic scaling', () => {
  const inputs = { ...DEFAULT_INPUTS, monthlyVisitors: 1000000, maxLeadsPerMonth: 10, maxProjectsPerMonth: 1 };
  const base = calculateScenario(inputs, 'base');
  const recs = buildDecisionRecommendations(inputs, base, analyzeSensitivity(inputs));
  assert.ok(recs.length >= 1 && recs.length <= 3);
  assert.equal(recs[0].priority, 'high');
  assert.match(recs[0].title, /очеред|заявок/i);
  assert.ok(recs.every((item) => ['high', 'medium'].includes(item.priority)));
});

test('premium decision dashboard exposes uncertainty, sensitivity and private local snapshots', async () => {
  const page = await readFile(new URL('../public/games/monetization/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/games/monetization/app.js', import.meta.url), 'utf8');
  const module = await readFile(new URL('../public/games/monetization/intelligence.mjs', import.meta.url), 'utf8');
  for (const id of [
    'risk-p10', 'risk-p50', 'risk-p90', 'risk-breakeven-visitors',
    'risk-break-even-probability', 'risk-target-probability', 'risk-distribution',
    'sensitivity-list', 'decision-recommendations', 'save-snapshot', 'load-snapshot',
    'compare-snapshot', 'delete-snapshot', 'saved-snapshots', 'import-model-json', 'import-model-file',
  ]) assert.ok(page.includes('id="' + id + '"'), 'Missing decision-intelligence UI: ' + id);
  assert.ok(app.includes("osgard.monetization.scenarios.v1"));
  assert.ok(app.includes('SNAPSHOT_LIMIT = 8'));
  assert.ok(app.includes('file.size > 1000000'), 'Import must have a strict size limit');
  assert.ok(app.includes("payload.kind !== 'osgard-games-business-model'"), 'Import must validate the model export kind');
  assert.ok(app.includes('savedScenarios: readSnapshots().map'), 'JSON backup must include local named scenarios');
  assert.ok(app.includes('modelVersion: 7'));
  assert.ok(app.includes('decisionIntelligence:'));
  assert.ok(!/fetch\s*\(/.test(app), 'Financial scenario logic and local snapshots must not use network requests');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon/.test(module), 'Uncertainty engine must stay offline and pure');
  assert.ok(module.includes('correlated demand pulse') && module.includes('triangular'));
});
