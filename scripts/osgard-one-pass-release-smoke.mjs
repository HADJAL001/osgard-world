import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlan, evaluateExternalReport, summarizeReport } from './osgard-one-pass-release.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const plan = buildPlan();
const pullRequestPlan = buildPlan({ eventName: 'pull_request' });
const deployedReleasePlan = buildPlan({ eventName: 'workflow_dispatch' });
assert.equal(pullRequestPlan.find(step => step.id === 'live-bundle-audit')?.critical, false,
  'Live production bundle drift must be review-only before the PR is deployed.');
assert.equal(pullRequestPlan.find(step => step.id === 'full-release-readiness')?.critical, true,
  'Full release readiness remains a critical stage in PR context; only its live probes are deferred.');
assert.equal(deployedReleasePlan.find(step => step.id === 'live-bundle-audit')?.critical, true,
  'Live bundle integrity remains blocking for an actual release/manual dispatch.');
assert.ok(plan.length >= 20, 'The one-pass runner must cover the full repository release surface.');
const aiPreview = plan.find(step => step.id === 'ai-review-preview');
assert.ok(aiPreview, 'The plan must produce the offline AI review packet after deterministic release evidence exists.');
assert.ok(!aiPreview.args.includes('--send-to-openai'), 'CI must never opt into a paid OpenAI request automatically.');
assert.ok(aiPreview.args.includes('--output') && aiPreview.args.includes('osgard-ai-release-review.json'), 'The AI review packet must have an explicit, known output path.');

for (const step of plan) {
  if (step.command.endsWith('npm') || step.command.endsWith('npm.cmd')) {
    assert.equal(step.args[0], 'run');
    assert.ok(pkg.scripts[step.args[1]], 'Undefined npm script in plan: ' + step.args[1]);
  }
}
for (const id of [
  'source-preflight','core-state','core-analytics-consent','product-experiments','ai-release-review',
  'games-portal','game-details','accessibility-funnel','privacy-consent','owned-promo',
  'partner-studio','campaign-manager','ecosystem-directory','project-intake','games-assets',
  'live-bundle-audit','economics-model','player-console','pwa','external-homepage-http','full-release-readiness','ai-review-preview'
]) assert.ok(plan.some(step => step.id === id), 'Missing end-to-end audit stage: ' + id);

const allReachable = evaluateExternalReport({
  projectCount: 10, reachableCount: 10, unavailableCount: 0, paidPromotionReviewCount: 10,
});
assert.equal(allReachable.status, 'PASS');
assert.match(allReachable.detail, /10\/10 reachable/);
assert.match(allReachable.detail, /human review/);
assert.equal(evaluateExternalReport({ projectCount: 10, reachableCount: 7 }).status, 'REVIEW');
assert.equal(evaluateExternalReport(null).status, 'REVIEW');

const summary = summarizeReport([{status:'PASS'}, {status:'REVIEW'}, {status:'BLOCK'}]);
assert.deepEqual(summary, {total:3, pass:1, review:1, block:1, status:'BLOCKED'});

const envExample = readFileSync('services/osgard-commerce-api/.env.example', 'utf8');
assert.match(envExample, /^ENABLE_LIVE_PAYMENTS=false$/m);
assert.match(envExample, /^ENABLE_OSGARD_PREMIUM_SALES=false$/m);
const inventory = JSON.parse(readFileSync('public/games/partners/inventory.json', 'utf8'));
assert.ok(inventory.placements.length > 0);
assert.ok(inventory.placements.every(item => item.active === false && item.sponsorLabelRequired === true),
  'Paid sponsor inventory must stay inactive and disclosure-required until operator approval.');
const consentedAnalytics = readFileSync('public/games/consented-analytics.js', 'utf8');
assert.match(consentedAnalytics, /if \(!consentGranted\(\)\) return/);
const publicConfig = JSON.parse(readFileSync('public/games/commerce-config.json', 'utf8'));
assert.ok(publicConfig.apiBaseUrl === '' || /^https:\/\//i.test(publicConfig.apiBaseUrl));
assert.doesNotMatch(JSON.stringify(publicConfig), /sk_live_|whsec_|private[_-]?key/i);

console.log('PASS OSGARD one-pass release smoke: command plan, all known npm targets, safe payment/ad defaults, consent gate, sponsor labeling and external-audit review rules.');
