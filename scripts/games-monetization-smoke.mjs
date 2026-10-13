import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateScenario, calculateRequiredMonthlyVisitors, DEFAULT_INPUTS, normalizeInputs, SCENARIOS } from '../public/games/monetization/model.js';

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
assert.ok(page.includes('prefers-reduced-motion:reduce'), 'Reduced-motion support missing');
assert.ok(['shareRatePct','invitesPerSharer','inviteConversionPct'].every((id) => page.includes('id="' + id + '"') && page.includes('name="' + id + '"')), 'Viral-loop assumption inputs missing');
assert.ok(['base-viral-visitors','base-k-factor','active-k-factor-status','base-annual-revenue','million-gap','annual-target-heading','monthly-target-value','required-base-visitors','growth-target-status'].every((id) => page.includes('id="' + id + '"')), 'Annual target, required traffic and referral outputs missing');
assert.ok(['target-mix-total','target-mix-ads','target-mix-paid','target-mix-services','target-mix-sponsors','target-mix-leads-contracts'].every((id) => page.includes('id="' + id + '"')), 'Target-scale source mix must be visible in the Growth Lab');
assert.ok(['target-mix-total','target-mix-ads','target-mix-paid','target-mix-services','target-mix-sponsors','target-mix-leads-contracts'].every((id) => app.includes("getElementById('" + id + "')")), 'Target-scale source mix must be wired to computed target scenario');
assert.ok(page.includes('name="annualRevenueTargetUsd"'), 'Editable annual gross revenue target input missing');
assert.ok(app.includes('calculateRequiredMonthlyVisitors') && app.includes('growthTarget:'), 'Required-traffic calculation must be visible and included in the local export');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'Financial planner unexpectedly depends on a remote asset CDN');
assert.ok(app.includes('URL.createObjectURL') && app.includes('osgard-games-model.json'), 'Local JSON export not implemented');
assert.ok(app.includes('Пересчёт выполнен локально') && app.includes('не отправляются на сервер'), 'Local-only privacy status missing');
assert.ok(hub.includes('href="/games/null-shift-godot/"') && hub.includes('href="/games/null-shift/"'), 'The catalogue must show the Godot build and the distinct browser WebGL alternative');

assert.deepEqual(SCENARIOS.map((scenario) => scenario.id), ['conservative', 'base', 'optimistic']);
const actual = calculateScenario(DEFAULT_INPUTS, 'base');
assert.equal(actual.directVisitors, 10000);
assert.equal(actual.viralVisitors, 45);
assert.equal(actual.visitors, 10045);
assert.ok(Math.abs(actual.kFactor - 0.015) < 1e-12, 'Invite-visit multiplier must stay separately measurable');
assert.ok(Math.abs(actual.activePlayerKFactor - 0.0045) < 1e-12, 'Active-player K must include the game-start rate');
assert.ok(app.includes('base.activePlayerKFactor') && app.includes('result.activePlayerKFactor') && app.includes("getElementById('active-k-factor-status')"), 'UI must display effective active-player K and explain whether the referral loop decays');
assert.equal(actual.gameStarts, 3013.5);
assert.equal(actual.sessions, 9040.5);
assert.equal(actual.potentialAdImpressions, 18081);
assert.ok(Math.abs(actual.filledAdImpressions - 9944.55) < 1e-8);
assert.ok(Math.abs(actual.adRevenueUsd - 12.4306875) < 1e-8);
assert.equal(actual.paidCustomers, 25.1125);
assert.equal(actual.paidRevenueUsd, 150.423875);
assert.equal(actual.leads, 15.0675);
assert.ok(Math.abs(actual.closedProjects - 1.2054) < 1e-8);
assert.ok(Math.abs(actual.servicesRevenueUsd - 1446.48) < 1e-8);
assert.ok(Math.abs(actual.paymentFeesUsd - 4.51271625) < 1e-8);
assert.equal(actual.operatingCostUsd, 400);
assert.ok(Math.abs(actual.netOperatingUsd - 1204.82184625) < 1e-8, 'Base net result formula drifted');
assert.equal(actual.viralVisitors, 45, 'Base model must expose the five-generation referral estimate');
assert.ok(actual.totalRevenueUsd > 0 && Number.isFinite(actual.kFactor), 'Referral and revenue results must remain finite');

const conservative = calculateScenario(DEFAULT_INPUTS, 'conservative');
const optimistic = calculateScenario(DEFAULT_INPUTS, 'optimistic');
assert.ok(conservative.visitors < actual.visitors, 'Conservative traffic should be lower than base');
assert.ok(conservative.netOperatingUsd < actual.netOperatingUsd, 'Conservative scenario should reduce the base result');
assert.ok(optimistic.visitors > actual.visitors, 'Optimistic traffic should be higher than base');
assert.ok(optimistic.netOperatingUsd > actual.netOperatingUsd, 'Optimistic assumptions should increase the illustrative result');
const zeroReferral = calculateScenario({ ...DEFAULT_INPUTS, shareRatePct: 0 }, 'base');
assert.equal(zeroReferral.visitors, zeroReferral.directVisitors, 'With sharing disabled, referrals must add no visitors');
assert.equal(zeroReferral.viralVisitors, 0, 'With sharing disabled, referral visitors must be zero');
const wideReferral = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: 1000, gameStartRate: 100, shareRatePct: 100, invitesPerSharer: 20, inviteConversionPct: 100 }, 'base');
assert.ok(Number.isFinite(wideReferral.visitors) && wideReferral.visitors > wideReferral.directVisitors, 'The referral-generation cap must keep high-K scenarios finite');
const zero = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: 0 }, 'base');
assert.equal(zero.totalRevenueUsd, 0, 'Zero traffic must produce zero modeled revenue');
assert.equal(zero.netOperatingUsd, -DEFAULT_INPUTS.monthlyOperatingCostUsd, 'Zero traffic should retain operating costs');
const bounded = normalizeInputs({ monthlyVisitors: -10, adFillRate: 400, ecpmUsd: 'NaN', gameStartRate: Infinity });
assert.equal(bounded.monthlyVisitors, 0, 'Negative visitor assumptions must clamp to zero');
assert.equal(bounded.adFillRate, 100, 'Percent input must be bounded at 100');
assert.equal(bounded.ecpmUsd, DEFAULT_INPUTS.ecpmUsd, 'Non-finite inputs must fall back to documented defaults');
assert.equal(bounded.gameStartRate, DEFAULT_INPUTS.gameStartRate, 'Infinite values must fall back to documented defaults');
const boundedReferral = normalizeInputs({ shareRatePct: 500, invitesPerSharer: 200, inviteConversionPct: -1 });
assert.equal(boundedReferral.shareRatePct, 100, 'Share-rate input must be bounded at 100 percent');
assert.equal(boundedReferral.invitesPerSharer, 20, 'Invite count must be bounded to protect model stability');
assert.equal(boundedReferral.inviteConversionPct, 0, 'Referral conversion input must be bounded at zero');

console.log('PASS OSGARD games economics model: invite-visit multiplier, active-player K-factor, five-generation cap, $1M target-scale mix, formulas, bounds and scenario sensitivity.');

assert.ok(page.includes('name="sponsorDealsPerMonth"') && page.includes('name="averageSponsorDealUsd"'), 'Sponsor placement revenue inputs are missing')
assert.ok(app.includes('result.sponsorRevenueUsd') && app.includes("getElementById('base-annual-revenue')") && app.includes("getElementById('million-gap')"), 'Sponsor income or annual target is not wired to the UI')
const sponsorExample = calculateScenario({ ...DEFAULT_INPUTS, sponsorDealsPerMonth: 2, averageSponsorDealUsd: 500 }, 'base')
assert.equal(sponsorExample.sponsorRevenueUsd, 1000, 'Sponsor revenue should only appear when the user enters real signed-and-paid placements')
assert.equal(sponsorExample.totalRevenueUsd, actual.totalRevenueUsd + 1000)
assert.ok(Math.abs(actual.totalRevenueUsd * 12 - 19312.01475) < 1e-7, 'Annual gross turnover target calculation drifted')
assert.ok(Math.abs(1000000 - actual.totalRevenueUsd * 12 - 980687.98525) < 1e-7, 'Remaining gap to the $1M annual turnover target drifted')
assert.equal(DEFAULT_INPUTS.annualRevenueTargetUsd, 1000000, 'Default annual gross target must be $1M')
const requiredVisitors = calculateRequiredMonthlyVisitors(DEFAULT_INPUTS)
const requiredScaleMix = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors }, 'base')
assert.ok(requiredScaleMix.totalRevenueUsd >= DEFAULT_INPUTS.annualRevenueTargetUsd / 12, 'Target scale mix must reach the monthly gross target')
assert.equal(requiredScaleMix.sponsorRevenueUsd, 0, 'Sponsor mix must remain zero unless the user enters contracted placements')
assert.ok(Number.isInteger(requiredVisitors) && requiredVisitors > DEFAULT_INPUTS.monthlyVisitors, 'Current assumptions should require a finite, larger seed-traffic estimate')
assert.ok(calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors }, 'base').totalRevenueUsd * 12 >= DEFAULT_INPUTS.annualRevenueTargetUsd, 'Required seed traffic must reach the annual gross target')
assert.ok(calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors - 1 }, 'base').totalRevenueUsd * 12 < DEFAULT_INPUTS.annualRevenueTargetUsd, 'Required seed traffic must be the smallest integer estimate that reaches the goal')
assert.equal(calculateRequiredMonthlyVisitors(DEFAULT_INPUTS, 0), 0, 'A zero annual target requires no starting traffic')
const impossibleInputs = { ...DEFAULT_INPUTS, adSlotsPerSession: 0, paidConversionRate: 0, leadRate: 0, sponsorDealsPerMonth: 0, averageSponsorDealUsd: 0 }
assert.equal(calculateRequiredMonthlyVisitors(impossibleInputs, 1000000), null, 'A target without any variable revenue stream must be explicitly unreachable')
const boundedTarget = normalizeInputs({ annualRevenueTargetUsd: 2000000000000 })
assert.equal(boundedTarget.annualRevenueTargetUsd, 1000000000000, 'Annual target must be bounded');
const boundedCommercial = normalizeInputs({ sponsorDealsPerMonth: 30000, averageSponsorDealUsd: -1 })
assert.equal(boundedCommercial.sponsorDealsPerMonth, 10000, 'Sponsor deal count must be bounded')
assert.equal(boundedCommercial.averageSponsorDealUsd, 0, 'Sponsor amount cannot be negative')
