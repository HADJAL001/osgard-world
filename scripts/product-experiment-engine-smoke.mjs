import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = path => readFileSync(path, 'utf8');
const queue = read('public/games/consented-analytics.js');
const api = read('services/osgard-commerce-api/src/core.mjs');
const server = read('services/osgard-commerce-api/src/server.mjs');
const apiTests = read('services/osgard-commerce-api/test/core.test.mjs');
const hub = read('public/games/index.html');
const admin = read('public/games/commerce-admin/index.html');
const runtime = read('public/games/experiment-runtime.js');
const coreSource = read('public/games/experiment-core.js');
const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/games-growth-pr.yml');

const context = { window: {} };
vm.runInNewContext(coreSource, context, { filename: 'experiment-core.js' });
const core = context.window.OSGARDExperimentCore;
assert.ok(core);
assert.equal(core.pickVariant(0, 0.5), 'b');
assert.equal(core.pickVariant(0.5, 0.5), 'a');
assert.equal(core.pickVariant(1, 0.5), 'a');
assert.equal(core.pickVariant(0.1, 2), 'b');
assert.equal(core.normalizeAssignment({ schemaVersion: 1, experimentId: 'catalog-hero-cta-v1', version: 1, variant: 'b' }, 'catalog-hero-cta-v1').variant, 'b');
assert.equal(core.normalizeAssignment({ schemaVersion: 1, experimentId: 'invented', version: 1, variant: 'b' }, 'catalog-hero-cta-v1'), null);
assert.equal(core.eventSource('catalog-hero-cta-v1', 'b', 'exposed'), 'osgard-experiment:catalog-hero-cta-v1:b:exposed');
assert.equal(core.eventSource('invented', 'b', 'exposed'), '');
assert.equal(core.eventSource('catalog-hero-cta-v1', 'c', 'exposed'), '');

const small = core.summarizeRows([
  { experimentId: 'catalog-hero-cta-v1', variant: 'a', exposures: 50, conversions: 10 },
  { experimentId: 'catalog-hero-cta-v1', variant: 'b', exposures: 49, conversions: 20 }
]);
assert.equal(small[0].status, 'insufficient_sample');
const strong = core.summarizeRows([
  { experimentId: 'catalog-hero-cta-v1', variant: 'a', exposures: 250, conversions: 50 },
  { experimentId: 'catalog-hero-cta-v1', variant: 'b', exposures: 250, conversions: 100 }
]);
assert.equal(strong[0].status, 'signal_b');
assert.equal(strong[0].liftPp, 20);
assert.ok(strong[0].ciLowPp > 0);
const uncertain = core.summarizeRows([
  { experimentId: 'catalog-hero-cta-v1', variant: 'a', exposures: 250, conversions: 75 },
  { experimentId: 'catalog-hero-cta-v1', variant: 'b', exposures: 250, conversions: 78 }
]);
assert.equal(uncertain[0].status, 'inconclusive');
assert.equal(core.summarizeRows([{ experimentId: 'invented', variant: 'a', exposures: 200, conversions: 20 }]).length, 0);

new vm.Script(runtime, { filename: 'experiment-runtime.js' });
for (const marker of ['osgard.games.analytics-consent.v1','OSGARD_CONSENTED_ANALYTICS','product_experiment_exposed','product_experiment_converted','IntersectionObserver','clearExperimentState']) {
  assert.ok(runtime.includes(marker), 'Missing runtime contract: ' + marker);
}
assert.ok(!/document\.cookie|navigator\.sendBeacon|https?:\/\//.test(runtime), 'Runtime must not bypass consent or load third-party assets');
assert.ok(hub.includes('id="catalog-hero-cta"'));
const lazyStart = hub.indexOf('<script id="games-lazy-runtime">');
const lazyEnd = hub.indexOf('</script>', lazyStart);
const lazyLoader = lazyStart >= 0 && lazyEnd > lazyStart ? hub.slice(lazyStart, lazyEnd) : '';
assert.ok(lazyLoader.includes("function hasAnalyticsConsent()") && lazyLoader.includes("if(!hasAnalyticsConsent())return Promise.resolve(false)"), 'Analytics and experiments must stay dormant until explicit consent.');
assert.ok(lazyLoader.includes("loadScript('consented-analytics.js')") && lazyLoader.includes("loadScript('experiment-core.js')") && lazyLoader.includes("loadScript('experiment-runtime.js')"), 'The consent queue must load before the registry and experiment runtime.');
assert.ok(lazyLoader.indexOf("loadScript('consented-analytics.js')") < lazyLoader.indexOf("loadScript('experiment-core.js')") && lazyLoader.indexOf("loadScript('experiment-core.js')") < lazyLoader.indexOf("loadScript('experiment-runtime.js')"), 'Experiment dependencies must load in order.');
assert.ok(!hub.includes('<script src="/games/consented-analytics.js') && !hub.includes('<script src="/games/experiment-core.js') && !hub.includes('<script src="/games/experiment-runtime.js'), 'Consent-gated analytics and A/B code must not be eagerly downloaded.');
assert.ok(lazyLoader.includes("script.src=versioned('/games/'+path)") && lazyLoader.includes("script.async=true"), 'Lazy measurement scripts must be asynchronous and stamped with the current release version.');
assert.ok(queue.includes("'product_experiment_exposed'") && queue.includes("'product_experiment_converted'"));
assert.ok(api.includes('"product_experiment_exposed"') && api.includes('"product_experiment_converted"'));
assert.ok(api.includes('PRODUCT_EXPERIMENT_SOURCE_INVALID') && api.includes('PRODUCT_EXPERIMENT_EVENT_PHASE_INVALID'));
assert.ok(server.includes('productExperimentStats') && server.includes('osgard-experiment:catalog-hero-cta-v1'));
assert.ok(admin.includes('product-experiment-body') && admin.includes('renderProductExperiments') && admin.includes('/games/experiment-core.js'));
assert.equal(pkg.scripts['qa:product-experiments'], 'node scripts/product-experiment-engine-smoke.mjs');
assert.ok(workflow.includes('npm run qa:product-experiments'));
assert.ok(apiTests.includes('product experiment events require consent'));
assert.ok(runtime.includes("if (!consent() || !hasFlag(exposureKey)) return;"), 'Conversion must require a confirmed exposure');
assert.ok(!runtime.includes("  track('exposed');\n  track('converted');"), 'Click must not fabricate a visibility exposure');
console.log('PASS product experiment engine: assignment, sample guard, confidence interval, consent, source validation and admin reporting.');
