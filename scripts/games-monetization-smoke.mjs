import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateScenario, calculateRequiredMonthlyVisitors, calculateBreakEvenMonthlyVisitors, calculateMonthlyProjection, calculateSensitivity, calculateDecisionDashboard, DEFAULT_INPUTS, normalizeInputs, SCENARIOS } from '../public/games/monetization/model.js';

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
assert.ok(page.includes('id="export-json"') && page.includes('id="export-csv"') && page.includes('id="reset-model"'), 'Financial planner reset/JSON/CSV export controls missing');
assert.ok(page.includes('prefers-reduced-motion:reduce'), 'Reduced-motion support missing');
assert.ok(['shareRatePct','invitesPerSharer','inviteConversionPct'].every((id) => page.includes('id="' + id + '"') && page.includes('name="' + id + '"')), 'Viral-loop assumption inputs missing');
assert.ok(['base-viral-visitors','base-k-factor','active-k-factor-status','base-annual-revenue','million-gap','annual-target-heading','monthly-target-value','required-base-visitors','growth-target-status'].every((id) => page.includes('id="' + id + '"')), 'Annual target, required traffic and referral outputs missing');
assert.ok(['target-mix-total','target-mix-ads','target-mix-paid','target-mix-subscriptions','target-mix-services','target-mix-sponsors','target-mix-leads-contracts','target-mix-lead-overflow','target-mix-capacity'].every((id) => page.includes('id="' + id + '"')), 'Target-scale source mix must include subscription revenue');
assert.ok(['target-mix-total','target-mix-ads','target-mix-paid','target-mix-subscriptions','target-mix-services','target-mix-sponsors','target-mix-leads-contracts','target-mix-lead-overflow','target-mix-capacity'].every((id) => app.includes("getElementById('" + id + "')")), 'Target-scale source mix must be wired to computed target scenario');
assert.ok(page.includes('name="annualRevenueTargetUsd"'), 'Editable annual gross revenue target input missing');
assert.ok(['newVisitorSharePct','maxLeadsPerMonth','maxProjectsPerMonth','subscriptionConversionRatePct','subscriptionMonthlyPriceUsd','subscriptionMonthlyChurnPct'].every((id) => page.includes('id="' + id + '"') && page.includes('name="' + id + '"')), 'New-visitor share, subscription assumptions, enquiry processing and project capacity inputs are required');
assert.ok(app.includes('targetScenario.capacityUtilizationPct') && app.includes('targetScenario.unprocessedLeads') && app.includes('modelVersion: 7') && app.includes('target-mix-subscriptions') && app.includes('subscriptionMrrMonth12Usd'), 'Capacity-aware outputs, cohort subscriptions and model export version must be wired');
assert.ok(app.includes('calculateRequiredMonthlyVisitors') && app.includes('growthTarget:'), 'Required-traffic calculation must be visible and included in the local export');
assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page), 'Financial planner unexpectedly depends on a remote asset CDN');
assert.ok(app.includes('URL.createObjectURL') && app.includes('osgard-games-model.json') && app.includes('osgard-games-model.csv') && app.includes("import { buildFinancialCsv } from './export.mjs'"), 'Local JSON/CSV export not implemented');
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
assert.equal(actual.newVisitors, 5022.5, 'Only the configured share is treated as new visitors');
assert.equal(actual.paidCustomers, 12.55625, 'First payments must apply only to modeled new visitors');
assert.ok(Math.abs(actual.paidRevenueUsd - 75.2119375) < 1e-8);
assert.equal(actual.leads, 15.0675);
assert.ok(Math.abs(actual.closedProjects - 1.2054) < 1e-8);
assert.ok(Math.abs(actual.servicesRevenueUsd - 1446.48) < 1e-8);
assert.ok(Math.abs(actual.paymentFeesUsd - (2.256358125 + actual.subscriptionRevenueUsd * DEFAULT_INPUTS.paymentFeeRate / 100)) < 1e-8, 'Payment fees must include recurring subscription revenue');
assert.equal(actual.operatingCostUsd, 400);
assert.ok(Math.abs(actual.netOperatingUsd - (1131.866266875 + actual.subscriptionRevenueUsd * (1 - DEFAULT_INPUTS.paymentFeeRate / 100))) < 1e-8, 'Base net result must include subscription revenue after payment fees');
assert.equal(actual.viralVisitors, 45, 'Base model must expose the five-generation referral estimate');
assert.equal(DEFAULT_INPUTS.newVisitorSharePct, 50, 'New-visitor share must be an explicit editable model assumption');
assert.equal(DEFAULT_INPUTS.maxLeadsPerMonth, 100, 'Lead processing capacity must be explicit');
assert.equal(DEFAULT_INPUTS.maxProjectsPerMonth, 4, 'Development revenue must be bounded by monthly delivery capacity');
assert.equal(actual.potentialClosedProjects, actual.closedProjects, 'Base traffic must remain below the default delivery cap');
const capacityLimited = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: 1000000, maxLeadsPerMonth: 100, maxProjectsPerMonth: 4 }, 'base');
assert.ok(capacityLimited.leads > 100, 'High-traffic scenario should generate more leads than the team can process');
assert.equal(capacityLimited.processedLeads, 100, 'Lead processing must never exceed the configured monthly limit');
assert.ok(Math.abs(capacityLimited.unprocessedLeads - (capacityLimited.leads - 100)) < 1e-8, 'Excess enquiries must be exposed as backlog');
assert.equal(capacityLimited.potentialClosedProjects, 8, 'Closed-project potential must use leads the team can process');
assert.equal(capacityLimited.closedProjects, 4, 'Service revenue must never exceed the configured number of monthly projects');
assert.equal(capacityLimited.servicesRevenueUsd, 4800, 'Service revenue must apply the monthly delivery capacity cap');
assert.equal(capacityLimited.capacityUtilizationPct, 100, 'Saturated delivery capacity must display 100% utilization');
const noDeliveryCapacity = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: 1000000, maxProjectsPerMonth: 0 }, 'base');
assert.equal(noDeliveryCapacity.closedProjects, 0, 'No delivery capacity means no closed service projects');
assert.equal(noDeliveryCapacity.servicesRevenueUsd, 0, 'No delivery capacity must not produce service revenue');
const boundedCapacityInputs = normalizeInputs({ maxLeadsPerMonth: 1000001, maxProjectsPerMonth: 100001, newVisitorSharePct: 150 });
assert.equal(boundedCapacityInputs.maxLeadsPerMonth, 1000000, 'Lead processing capacity must be bounded');
assert.equal(boundedCapacityInputs.maxProjectsPerMonth, 100000, 'Project capacity must be bounded');
assert.equal(boundedCapacityInputs.newVisitorSharePct, 100, 'New-visitor share must be bounded to 100%');

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
const boundedSubscription = normalizeInputs({ subscriptionConversionRatePct: 150, subscriptionMonthlyPriceUsd: -5, subscriptionMonthlyChurnPct: 120 });
assert.equal(boundedSubscription.subscriptionConversionRatePct, 100, 'Subscription conversion must be bounded to 100 percent');
assert.equal(boundedSubscription.subscriptionMonthlyPriceUsd, 0, 'Subscription price cannot be negative');
assert.equal(boundedSubscription.subscriptionMonthlyChurnPct, 100, 'Monthly subscription churn must be bounded to 100 percent');
assert.ok(actual.subscriptionRevenueUsd > 0 && actual.subscriptionAnnualRevenueUsd > 0, 'Subscription cohorts must add modeled recurring revenue when assumptions are enabled');
assert.ok(actual.subscriptionMrrMonth12Usd > actual.subscriptionRevenueUsd, 'Month-12 MRR should be shown separately from the first-year average');
assert.ok(Math.abs(actual.subscriptionAnnualRevenueUsd - actual.subscriptionRevenueUsd * 12) < 1e-8, 'First-year subscription revenue must reconcile with its average monthly contribution');
assert.ok(Math.abs(actual.subscriptionNewCustomersPerMonth - (actual.newVisitors - actual.paidCustomers) * DEFAULT_INPUTS.subscriptionConversionRatePct / 100) < 1e-8, 'Subscription acquisition must exclude one-time buyers');
const noSubscriptions = calculateScenario({ ...DEFAULT_INPUTS, subscriptionConversionRatePct: 0 }, 'base');
assert.equal(noSubscriptions.subscriptionRevenueUsd, 0, 'Zero subscription conversion must create no recurring revenue');
assert.equal(noSubscriptions.subscriptionMrrMonth12Usd, 0, 'Zero subscription conversion must create no MRR');
const noChurn = calculateScenario({ ...DEFAULT_INPUTS, subscriptionMonthlyChurnPct: 0 }, 'base');
assert.ok(Math.abs(noChurn.subscriptionSubscribersMonth12 - noChurn.subscriptionNewCustomersPerMonth * 12) < 1e-8, 'Zero monthly churn should retain all twelve cohorts by month twelve');
const fullChurn = calculateScenario({ ...DEFAULT_INPUTS, subscriptionMonthlyChurnPct: 100 }, 'base');
assert.ok(Math.abs(fullChurn.subscriptionSubscribersMonth12 - fullChurn.subscriptionNewCustomersPerMonth) < 1e-8, '100 percent monthly churn should leave only the latest cohort active');
assert.ok(noChurn.subscriptionAnnualRevenueUsd > actual.subscriptionAnnualRevenueUsd && actual.subscriptionAnnualRevenueUsd > fullChurn.subscriptionAnnualRevenueUsd, 'Higher churn must reduce first-year subscription revenue');


console.log('PASS OSGARD games economics model: invite-visit multiplier, active-player K-factor, five-generation cap, $1M target-scale mix, formulas, bounds and scenario sensitivity.');

assert.ok(page.includes('name="sponsorDealsPerMonth"') && page.includes('name="averageSponsorDealUsd"'), 'Sponsor placement revenue inputs are missing')
assert.ok(app.includes('result.sponsorRevenueUsd') && app.includes("getElementById('base-annual-revenue')") && app.includes("getElementById('million-gap')"), 'Sponsor income or annual target is not wired to the UI')
const sponsorExample = calculateScenario({ ...DEFAULT_INPUTS, sponsorDealsPerMonth: 2, averageSponsorDealUsd: 500 }, 'base')
assert.equal(sponsorExample.sponsorRevenueUsd, 1000, 'Sponsor revenue should only appear when the user enters real signed-and-paid placements')
assert.equal(sponsorExample.totalRevenueUsd, actual.totalRevenueUsd + 1000)
assert.ok(Math.abs(actual.totalRevenueUsd * 12 - (18409.4715 + actual.subscriptionAnnualRevenueUsd)) < 1e-7, 'Annual gross turnover must include first-year subscription cohorts')
assert.ok(Math.abs(1000000 - actual.totalRevenueUsd * 12 - (981590.5285 - actual.subscriptionAnnualRevenueUsd)) < 1e-7, 'Remaining gap to the $1M annual turnover target must include the subscription model')
assert.equal(DEFAULT_INPUTS.annualRevenueTargetUsd, 1000000, 'Default annual gross target must be $1M')
const requiredVisitors = calculateRequiredMonthlyVisitors(DEFAULT_INPUTS)
const requiredScaleMix = calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors }, 'base')
assert.ok(requiredScaleMix.totalRevenueUsd >= DEFAULT_INPUTS.annualRevenueTargetUsd / 12, 'Target scale mix must reach the monthly gross target')
assert.equal(requiredScaleMix.sponsorRevenueUsd, 0, 'Sponsor mix must remain zero unless the user enters contracted placements')
assert.ok(Number.isInteger(requiredVisitors) && requiredVisitors > DEFAULT_INPUTS.monthlyVisitors, 'Current assumptions should require a finite, larger seed-traffic estimate')
assert.ok(calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors }, 'base').totalRevenueUsd * 12 >= DEFAULT_INPUTS.annualRevenueTargetUsd, 'Required seed traffic must reach the annual gross target')
assert.ok(calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: requiredVisitors - 1 }, 'base').totalRevenueUsd * 12 < DEFAULT_INPUTS.annualRevenueTargetUsd, 'Required seed traffic must be the smallest integer estimate that reaches the goal')
assert.equal(calculateRequiredMonthlyVisitors(DEFAULT_INPUTS, 0), 0, 'A zero annual target requires no starting traffic')
const impossibleInputs = { ...DEFAULT_INPUTS, adSlotsPerSession: 0, paidConversionRate: 0, subscriptionConversionRatePct: 0, leadRate: 0, sponsorDealsPerMonth: 0, averageSponsorDealUsd: 0 }
assert.equal(calculateRequiredMonthlyVisitors(impossibleInputs, 1000000), null, 'A target without any variable revenue stream must be explicitly unreachable')
const boundedTarget = normalizeInputs({ annualRevenueTargetUsd: 2000000000000 })
assert.equal(boundedTarget.annualRevenueTargetUsd, 1000000000000, 'Annual target must be bounded');
const boundedCommercial = normalizeInputs({ sponsorDealsPerMonth: 30000, averageSponsorDealUsd: -1 })
assert.equal(boundedCommercial.sponsorDealsPerMonth, 10000, 'Sponsor deal count must be bounded')
assert.equal(boundedCommercial.averageSponsorDealUsd, 0, 'Sponsor amount cannot be negative')


assert.ok(page.includes('id="decision-dashboard-title"') && page.includes('class="decision-dashboard"'), 'Premium decision dashboard section missing');
assert.ok(['break-even-visitors','projection-cumulative-net','projection-month12-net','projection-break-even-month','projection-chart','projection-rows','sensitivity-results','sensitivity-status'].every((id) => page.includes('id="' + id + '"') && app.includes("getElementById('" + id + "')")), 'Decision dashboard metrics/chart must be wired to computed model output');
assert.ok(['snapshot-name','snapshot-select','save-snapshot','load-snapshot','delete-snapshot','snapshot-status','export-projection-csv'].every((id) => page.includes('id="' + id + '"') && app.includes("getElementById('" + id + "')")), 'Local scenario library and 12-month export controls must exist and be wired');
assert.ok(page.includes('name="monthlyTrafficGrowthPct"') && page.includes('min="-50"') && page.includes('max="100"'), 'Monthly traffic ramp assumption must be visible and bounded');
assert.ok(app.includes("osgard.monetization.snapshots.v1") && app.includes('MAX_SNAPSHOTS = 8') && app.includes('localStorage.setItem(SNAPSHOT_KEY'), 'Named assumptions must be stored locally with a strict cap');
assert.ok(app.includes('calculateBreakEvenMonthlyVisitors') && app.includes('calculateMonthlyProjection') && app.includes('calculateSensitivity'), 'Decision dashboard model functions must be wired into the render loop');
assert.ok(app.includes('osgard-12-month-projection.csv') && app.includes('month12') === false, '12-month output must have its own explicit CSV export');
assert.equal(DEFAULT_INPUTS.monthlyTrafficGrowthPct, 5, 'Traffic ramp must have a defined starting assumption');
assert.equal(normalizeInputs({ monthlyTrafficGrowthPct: 1000 }).monthlyTrafficGrowthPct, 100, 'Traffic growth upper bound must be enforced');
assert.equal(normalizeInputs({ monthlyTrafficGrowthPct: -100 }).monthlyTrafficGrowthPct, -50, 'Traffic decline lower bound must be enforced');

const breakEvenVisitors = calculateBreakEvenMonthlyVisitors(DEFAULT_INPUTS, 'base');
assert.ok(Number.isInteger(breakEvenVisitors) && breakEvenVisitors > 0, 'Base assumptions should find a bounded break-even traffic threshold');
assert.ok(calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: breakEvenVisitors }, 'base').netOperatingUsd >= -1e-8, 'Break-even result must be non-negative at the returned integer traffic threshold');
assert.ok(breakEvenVisitors === 0 || calculateScenario({ ...DEFAULT_INPUTS, monthlyVisitors: breakEvenVisitors - 1 }, 'base').netOperatingUsd < 0, 'Break-even search must return the smallest integer that reaches non-negative monthly operating result');
const impossibleBreakEven = calculateBreakEvenMonthlyVisitors({
  ...DEFAULT_INPUTS, adSlotsPerSession: 0, paidConversionRate: 0, subscriptionConversionRatePct: 0,
  leadRate: 0, sponsorDealsPerMonth: 0, averageSponsorDealUsd: 0,
}, 'base');
assert.equal(impossibleBreakEven, null, 'Break-even must be unreachable when no variable revenue streams exist and fixed costs remain');

const flatRamp = calculateMonthlyProjection({ ...DEFAULT_INPUTS, monthlyTrafficGrowthPct: 0 }, 'base', 12);
assert.equal(flatRamp.rows.length, 12, 'Monthly projection must contain twelve months');
assert.ok(flatRamp.rows.every((row, index) => row.month === index + 1 && row.startingVisitors === DEFAULT_INPUTS.monthlyVisitors), 'A zero-growth projection must keep starting traffic flat');
assert.ok(Math.abs(flatRamp.cumulativeRevenueUsd - flatRamp.rows.reduce((sum, row) => sum + row.totalRevenueUsd, 0)) < 1e-7, 'Cumulative revenue must reconcile with its monthly rows');
assert.ok(Math.abs(flatRamp.cumulativeNetOperatingUsd - flatRamp.rows.reduce((sum, row) => sum + row.netOperatingUsd, 0)) < 1e-7, 'Cumulative operating result must reconcile with monthly net rows');
const growthRamp = calculateMonthlyProjection({ ...DEFAULT_INPUTS, monthlyTrafficGrowthPct: 5 }, 'base', 12);
assert.ok(growthRamp.rows[11].startingVisitors > growthRamp.rows[0].startingVisitors, 'Positive traffic growth should compound by month');
assert.ok(growthRamp.rows[11].activeSubscribers > growthRamp.rows[0].activeSubscribers, 'Subscriber model must aggregate retained monthly cohorts');
assert.equal(calculateMonthlyProjection(DEFAULT_INPUTS, 'base', 99).rows.length, 36, 'Requested projection horizon must be capped at 36 months');
const noSubscriberRamp = calculateMonthlyProjection({ ...DEFAULT_INPUTS, monthlyTrafficGrowthPct: 0, subscriptionConversionRatePct: 0 }, 'base', 12);
assert.ok(noSubscriberRamp.rows.every((row) => row.activeSubscribers === 0 && row.subscriptionRevenueUsd === 0), 'Zero subscription conversion should produce no active subscriber revenue');
const noChurnRamp = calculateMonthlyProjection({ ...DEFAULT_INPUTS, monthlyTrafficGrowthPct: 0, subscriptionMonthlyChurnPct: 0 }, 'base', 12);
assert.ok(Math.abs(noChurnRamp.rows[11].activeSubscribers - noChurnRamp.rows.reduce((sum, row) => sum + row.newSubscribers, 0)) < 1e-7, 'Zero churn retains all acquired subscriber cohorts');
const fullChurnRamp = calculateMonthlyProjection({ ...DEFAULT_INPUTS, monthlyTrafficGrowthPct: 0, subscriptionMonthlyChurnPct: 100 }, 'base', 12);
assert.ok(Math.abs(fullChurnRamp.rows[11].activeSubscribers - fullChurnRamp.rows[11].newSubscribers) < 1e-7, '100% monthly churn should retain only the newest cohort');

const sensitivity = calculateSensitivity(DEFAULT_INPUTS, 'base', 20);
assert.equal(sensitivity.length, 10, 'Sensitivity sweep must cover ten material drivers');
assert.ok(sensitivity.every((row) => row.impactRangeUsd >= 0 && Number.isFinite(row.lowNetOperatingUsd) && Number.isFinite(row.highNetOperatingUsd)), 'Sensitivity values must stay finite and non-negative in range');
assert.ok(sensitivity.every((row, index) => index === 0 || sensitivity[index - 1].impactRangeUsd >= row.impactRangeUsd), 'Sensitivity drivers must be sorted by modeled impact');
const noRevenueSensitivity = calculateSensitivity({
  ...DEFAULT_INPUTS, adSlotsPerSession: 0, paidConversionRate: 0, subscriptionConversionRatePct: 0,
  leadRate: 0, sponsorDealsPerMonth: 0, averageSponsorDealUsd: 0,
}, 'base', 20);
assert.ok(noRevenueSensitivity.every((row) => Number.isFinite(row.impactRangeUsd)), 'Sensitivity must remain finite for a zero-revenue scenario');
const decisionDashboard = calculateDecisionDashboard(DEFAULT_INPUTS);
assert.equal(decisionDashboard.projection.rows.length, 12, 'Combined dashboard result must include a twelve-month path');
assert.equal(decisionDashboard.baseline.scenarioId, 'base', 'Dashboard should label which scenario was analyzed');
assert.ok(Number.isFinite(decisionDashboard.grossMarginPct), 'Gross margin indicator should be finite when modeled revenue exists');

console.log('PASS Premium decision cockpit: break-even search, 12-month traffic ramp, retained subscription cohorts, sensitivity ranking, local scenario library and model-only disclosure.');
