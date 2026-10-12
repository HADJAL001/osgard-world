import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateScenario, DEFAULT_INPUTS, normalizeInputs, SCENARIOS } from '../public/games/monetization/model.js';

const root = process.cwd();
const pagePath = resolve(root, 'public/games/monetization/index.html');
const appPath = resolve(root, 'public/games/monetization/app.js');
const modelPath = resolve(root, 'public/games/monetization/model.js');
const fallbackPath = resolve(root, 'public/games/null-shift-godot/index.html');

for (const path of [pagePath, appPath, modelPath, fallbackPath]) {
  assert.ok(existsSync(path), 'Expected gaming-platform artifact missing: ' + path);
}

const page = readFileSync(pagePath, 'utf8');
const app = readFileSync(appPath, 'utf8');
const fallback = readFileSync(fallbackPath, 'utf8');
assert.ok(page.includes('data-estimate="not-live-data"'), 'Financial planner must label the numbers as modelled assumptions');
assert.ok(page.includes('id="assumptions-form"') && page.includes('id="scenario-results"'), 'Financial planner is missing its input/output interface');
assert.ok(page.includes('id="export-json"') && page.includes('id="reset-model"'), 'Financial planner reset/JSON export controls missing');
assert.ok(page.includes('prefers-reduced-motion:reduce'), 'Reduced-motion support missing');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'Financial planner unexpectedly depends on a remote asset CDN');
assert.ok(app.includes('URL.createObjectURL') && app.includes('osgard-games-model.json'), 'Local JSON export not implemented');
assert.ok(app.includes('Пересчёт выполнен локально') && app.includes('не отправляются на сервер'), 'Local-only privacy status missing');
assert.ok(fallback.includes('data-godot-fallback="webgl"') && fallback.includes('href="/games/null-shift/"'), 'Unavailable Godot export must have a truthful browser-game fallback');

assert.deepEqual(SCENARIOS.map((scenario) => scenario.id), ['conservative', 'base', 'optimistic']);
const actual = calculateScenario(DEFAULT_INPUTS, 'base');
assert.equal(actual.visitors, 10000);
assert.equal(actual.gameStarts, 3000);
assert.equal(actual.sessions, 9000);
assert.equal(actual.potentialAdImpressions, 18000);
assert.equal(actual.filledAdImpressions, 9900);
assert.equal(actual.adRevenueUsd, 12.375);
assert.equal(actual.paidCustomers, 25);
assert.equal(actual.paidRevenueUsd, 149.75);
assert.equal(actual.leads, 15);
assert.equal(actual.closedProjects, 1.2);
assert.equal(actual.servicesRevenueUsd, 1440);
assert.equal(actual.paymentFeesUsd, 4.4925);
assert.equal(actual.operatingCostUsd, 400);
assert.ok(Math.abs(actual.netOperatingUsd - 1197.6325) < 1e-8, 'Base net result formula drifted');

const conservative = calculateScenario(DEFAULT_INPUTS, 'conservative');
const optimistic = calculateScenario(DEFAULT_INPUTS, 'optimistic');
assert.ok(conservative.visitors < actual.visitors, 'Conservative traffic should be lower than base');
assert.ok(conservative.netOperatingUsd < actual.netOperatingUsd, 'Conservative scenario should reduce the base result');
assert.ok(optimistic.visitors > actual.visitors, 'Optimistic traffic should be higher than base');
assert.ok(optimistic.netOperatingUsd > actual.netOperatingUsd, 'Optimistic assumptions should increase the illustrative result');
const zero = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: 0 }, 'base');
assert.equal(zero.totalRevenueUsd, 0, 'Zero traffic must produce zero modeled revenue');
assert.equal(zero.netOperatingUsd, -DEFAULT_INPUTS.monthlyOperatingCostUsd, 'Zero traffic should retain operating costs');
const bounded = normalizeInputs({ monthlyVisitors: -10, adFillRate: 400, ecpmUsd: 'NaN', gameStartRate: Infinity });
assert.equal(bounded.monthlyVisitors, 0, 'Negative visitor assumptions must clamp to zero');
assert.equal(bounded.adFillRate, 100, 'Percent input must be bounded at 100');
assert.equal(bounded.ecpmUsd, DEFAULT_INPUTS.ecpmUsd, 'Non-finite inputs must fall back to documented defaults');
assert.equal(bounded.gameStartRate, DEFAULT_INPUTS.gameStartRate, 'Infinite values must fall back to documented defaults');

console.log('PASS OSGARD games economics model: UI contract, transparent fallback, scenario formulas, bounds and conservative/base/optimistic sensitivity.');
