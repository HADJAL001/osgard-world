import assert from 'node:assert/strict';
import { deferredLiveProbe, shouldDeferLiveProbes, summarizeReadinessChecks } from './release-readiness-policy.mjs';

assert.equal(shouldDeferLiveProbes('pull_request'), true);
assert.equal(shouldDeferLiveProbes('workflow_run'), false);
assert.equal(shouldDeferLiveProbes('workflow_dispatch'), false);
assert.equal(shouldDeferLiveProbes('push'), false);

assert.deepEqual(deferredLiveProbe('production-route-matrix'), {
  name:'production-route-matrix',
  status:'review',
  output:'Deferred for pull-request validation: this source revision is not deployed yet. The same probe remains required after deploy/workflow_run or manual release validation.',
});
assert.throws(() => deferredLiveProbe('typecheck'), /Only live production probes may be deferred/);

assert.deepEqual(summarizeReadinessChecks([
  { status:'passed' }, { status:'skipped' }, { status:'review' },
]), { status:'review_required', passed:1, review:1, skipped:1, failed:0, unknown:0 });
assert.equal(summarizeReadinessChecks([{status:'failed'},{status:'review'}]).status, 'blocked');
assert.equal(summarizeReadinessChecks([{status:'passed'},{status:'passed'}]).status, 'ready');
assert.equal(summarizeReadinessChecks([{status:'mystery'}]).status, 'blocked');

console.log('PASS release-readiness policy: PR live probes are review-only; deployed/manual release probes remain required and failed local checks still block.');
