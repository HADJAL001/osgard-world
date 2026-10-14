import assert from 'node:assert/strict';
import { summarizeRouteFailures } from './route-matrix-report.mjs';

const failed = summarizeRouteFailures([
  {
    device: 'mobile',
    route: '/games/',
    status: 200,
    durationMs: 52.4,
    ok: false,
    checks: { statusOk: true, shellOk: false, assetsOk: true },
    build: { expected: 'release123abc', actual: 'release000xyz', matches: false },
    assets: [],
  },
  {
    device: 'desktop',
    route: '/games/cascade-lab/',
    status: 200,
    durationMs: 73,
    ok: false,
    checks: { statusOk: true, shellOk: true, assetsOk: false },
    assets: [
      { path: '/games/cascade-lab/mission-director.js', status: 404, expectedType: 'javascript', contentType: 'text/html', typeOk: false, nonEmpty: false, ok: false },
      { path: '/games/cascade-lab/case-passport.js', status: 200, expectedType: 'javascript', contentType: 'application/javascript', typeOk: true, nonEmpty: true, ok: true },
    ],
  },
  {
    device: 'desktop',
    route: '/games/aether-grid/',
    status: 0,
    durationMs: 10000,
    ok: false,
    error: 'request failed\nproxy timeout',
    assets: [],
  },
  { device: 'desktop', route: '/games/', status: 200, ok: true, checks: { shellOk: true, assetsOk: true }, assets: [] },
]);

assert.equal(failed.length, 3, 'Only failed route rows should be summarized');
assert.deepEqual(failed[0].reasons, ['page_contract_failed', 'build_revision_mismatch']);
assert.equal(failed[0].build.actual, 'release000xyz');
assert.deepEqual(failed[1].reasons, ['asset_contract_failed']);
assert.equal(failed[1].failedAssets.length, 1);
assert.equal(failed[1].failedAssets[0].path, '/games/cascade-lab/mission-director.js');
assert.equal(failed[1].failedAssets[0].status, 404);
assert.deepEqual(failed[2].reasons, ['unexpected_http_status', 'request_failed']);
assert.equal(failed[2].error, 'request failed proxy timeout');
const bounded = summarizeRouteFailures([{ ok: false, route: '/x', status: 0, error: 'x'.repeat(900), assets: [] }]);
assert.equal(bounded[0].error.length, 600, 'Transport errors must be bounded before they are printed');
assert.equal(summarizeRouteFailures(null).length, 0, 'Non-array input must fail safely');

console.log('PASS production route matrix diagnostics: contract failures, build drift, asset failures, transport errors and bounded output.');
