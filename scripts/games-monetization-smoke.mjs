import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateScenario, calculateViralReach, DEFAULT_INPUTS, normalizeInputs, SCENARIOS } from '../public/games/monetization/model.js';

const root = process.cwd();
const pagePath = resolve(root, 'public/games/monetization/index.html');
const appPath = resolve(root, 'public/games/monetization/app.js');
const modelPath = resolve(root, 'public/games/monetization/model.js');
const hubPath = resolve(root, 'public/games/index.html');

for (const path of [pagePath, appPath, modelPath, hubPath]) {
  assert.ok(existsSync(path), 'Expected gaming-platform artifact missing: ' + path);
}

const page = readFileSync(pagePath, 'utf8');
const app = readFileSync(appPath, 'utf8');
const hub = readFileSync(hubPath, 'utf8');
assert.ok(page.includes('data-estimate="not-live-data"'), 'Financial planner must label the numbers as modelled assumptions');
assert.ok(page.includes('id="assumptions-form"') && page.includes('id="scenario-results"'), 'Financial planner is missing its input/output interface');
assert.ok(page.includes('id="export-json"') && page.includes('id="reset-model"'), 'Financial planner reset/JSON export controls missing');
for (const id of ['inviteShareRatePct','invitesPerSharer','inviteClickRatePct','inviteStartRatePct','inviteGenerations','annualRevenueTargetUsd','viral-k-factor','viral-invites','annual-gross','annual-target-gap','seed-visitors-target','growth-target-status']) assert.ok(page.includes('id="'+id+'"') || page.includes('name="'+id+'"'), 'Growth loop control/output missing: '+id);
assert.ok(app.includes('calculateViralReach') && app.includes('requiredSeedVisits') && app.includes('annualGross'), 'Growth model must calculate invite reach and seed traffic for annual target');
assert.ok(page.includes('Цель валовой выручки за год') && page.includes('не прогноз с гарантированным доходом'), 'Million-dollar objective must remain labelled as a scenario, never a guarantee');
assert.ok(page.includes('prefers-reduced-motion:reduce'), 'Reduced-motion support missing');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'Financial planner unexpectedly depends on a remote asset CDN');
assert.ok(app.includes('URL.createObjectURL') && app.includes('osgard-games-model.json'), 'Local JSON export not implemented');
assert.ok(app.includes('Пересчёт выполнен локально') && app.includes('не отправляются на сервер'), 'Local-only privacy status missing');
assert.ok(hub.includes('href="/games/null-shift-godot/"') && hub.includes('href="/games/null-shift/"'), 'The catalogue must show the Godot build and the distinct browser WebGL alternative');

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
assert.equal(bounded.inviteShareRatePct, DEFAULT_INPUTS.inviteShareRatePct, 'Unknown/invalid share assumptions must fall back to defaults');
assert.equal(normalizeInputs({ invitesPerSharer: 999 }).invitesPerSharer, 20, 'Invites per player must have a conservative UI/QA bound');
assert.equal(normalizeInputs({ inviteGenerations: 999 }).inviteGenerations, 8, 'Invite propagation must be finite and bounded');

const viral = calculateViralReach(DEFAULT_INPUTS);
assert.ok(Math.abs(viral.kFactor - 0.03) < 1e-12, 'K-factor formula must multiply share, invites, click-through and activation');
assert.equal(viral.seedVisitors, 10000);
assert.equal(viral.totalVisitors, 10186, 'Default invite loop should estimate a finite four-generation reach');
assert.equal(viral.referralVisits, 186, 'Referral reach should be separately visible from seed visits');
assert.ok(viral.viralMultiplier > 1 && viral.viralMultiplier < 1.02, 'Default viral multiplier should be plausible and finite');
assert.equal(calculateViralReach({ ...DEFAULT_INPUTS, inviteShareRatePct: 0 }).totalVisitors, 10000, 'No shares must yield zero referral visits');
assert.equal(calculateViralReach({ ...DEFAULT_INPUTS, monthlyVisitors: 0 }).totalVisitors, 0, 'Zero seed visitors must not invent organic reach');
assert.equal(calculateViralReach({ ...DEFAULT_INPUTS, inviteShareRatePct: 100, invitesPerSharer: 20, inviteClickRatePct: 100, inviteStartRatePct: 100, inviteGenerations: 8 }).totalVisitors, 1000000000, 'The viral estimator must cap runaway theoretical reach');

console.log('PASS OSGARD games economics model: revenue scenarios, bounded invite K-factor, finite viral generations, zero-seed safety and annual target UI.');
