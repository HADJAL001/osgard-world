export function shouldDeferLiveProbes(eventName = process.env.GITHUB_EVENT_NAME) {
  return eventName === 'pull_request';
}

export function summarizeReadinessChecks(checks) {
  if (!Array.isArray(checks)) throw new TypeError('checks must be an array');
  const failed = checks.filter((item) => item?.status === 'failed');
  const review = checks.filter((item) => item?.status === 'review');
  const skipped = checks.filter((item) => item?.status === 'skipped');
  const passed = checks.filter((item) => item?.status === 'passed');
  const unknown = checks.filter((item) => !item || !['passed','review','skipped','failed'].includes(item.status));
  const status = failed.length || unknown.length ? 'blocked' : review.length ? 'review_required' : 'ready';
  return { status, passed:passed.length, review:review.length, skipped:skipped.length, failed:failed.length, unknown:unknown.length };
}

export function deferredLiveProbe(name) {
  if (!['production-route-matrix','live-bundle-audit'].includes(name)) {
    throw new Error('Only live production probes may be deferred.');
  }
  return {
    name,
    status:'review',
    output:'Deferred for pull-request validation: this source revision is not deployed yet. The same probe remains required after deploy/workflow_run or manual release validation.',
  };
}
