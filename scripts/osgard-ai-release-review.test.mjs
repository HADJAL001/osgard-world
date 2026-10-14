import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  projectReport,
  buildReviewPacket,
  validateAssessment,
  applyDeterministicOverrides,
  requestOpenAIReview,
  writePrivateJson,
} from './osgard-ai-release-review.mjs';

function assessment(overrides = {}) {
  return {
    overallRisk: 'low',
    recommendation: 'ready_with_caution',
    summary: 'The provided evidence is mostly consistent, but the release owner should verify the remaining operational checks.',
    blockers: [],
    findings: [{
      severity: 'low',
      category: 'testing',
      title: 'Review the remaining production verification evidence.',
      evidence: ['release-readiness.json'],
      recommendation: 'Run the post-deploy route matrix and attach its result.',
      confidence: 'medium',
    }],
    missingEvidence: ['Verified post-deployment route matrix'],
    nextActions: ['Run release readiness', 'Review the release diff'],
    humanReviewRequired: true,
    ...overrides,
  };
}

test('release-readiness summaries omit raw command output and redact secret-shaped strings', () => {
  const projected = projectReport('release-readiness.json', {
    status: 'blocked',
    checks: [
      { name: 'typecheck', status: 'passed', output: 'no issues' },
      { name: 'deploy-secret', status: 'failed', output: 'OPENAI_API_KEY=sk-this-must-never-be-sent' },
    ],
  });
  assert.equal(projected.checks.total, 2);
  assert.equal(projected.checks.failed, 1);
  assert.equal(projected.failedChecks.length, 1);
  const encoded = JSON.stringify(projected);
  assert.equal(encoded.includes('sk-this-must-never-be-sent'), false);
  assert.equal(encoded.includes('OPENAI_API_KEY='), false);
  assert.equal(JSON.stringify(projectReport('release-readiness.json', {
    status: 'blocked',
    checks: [{ name: 'provider-token', status: 'failed', output: 'github_pat_abcdefghijklmnopqrstuvwxyz1234567890' }],
  })).includes('github_pat_abcdefghijklmnopqrstuvwxyz1234567890'), false);
  assert.equal(JSON.stringify(projectReport('release-readiness.json', {
    status: 'blocked',
    checks: [{ name: 'password', status: 'failed', output: 'PASSWORD=do-not-send-this' }],
  })).includes('do-not-send-this'), false);
  assert.equal(encoded.includes('output'), false);
});

test('route summaries expose route paths and statuses, never full origin or response bodies', () => {
  const projected = projectReport('production-route-matrix.json', {
    status: 'blocked',
    results: [
      { route: 'https://osgard.world/games/', status: 'passed', statusCode: 200, responseBody: 'secret payload' },
      { route: '/games/secret-check', status: 'failed', statusCode: 503, reason: 'origin returned unavailable' },
    ],
  });
  assert.equal(projected.routeChecks.failed, 1);
  assert.equal(projected.failedRoutes[0].route, '/games/secret-check');
  const encoded = JSON.stringify(projected);
  assert.equal(encoded.includes('https://osgard.world'), false);
  assert.equal(encoded.includes('secret payload'), false);
});

test('review packets are deterministic and contain only minimized summaries', () => {
  const raw = {
    name: 'release-readiness.json',
    data: {
      status: 'ready',
      checks: [{ name: 'build', status: 'passed', output: 'very large build log is intentionally omitted' }],
      sourceCode: 'do not send source code',
    },
  };
  const first = buildReviewPacket([raw]);
  const second = buildReviewPacket([raw]);
  assert.equal(first.inputSha256, second.inputSha256);
  assert.match(first.inputSha256, /^[a-f0-9]{64}$/);
  const encoded = JSON.stringify(first.payload);
  assert.equal(encoded.includes('very large build log'), false);
  assert.equal(encoded.includes('do not send source code'), false);
  assert.equal(first.payload.policy.sourceCodeIncluded, false);
  assert.equal(first.payload.policy.playerDataIncluded, false);
});

test('projected evidence is preserved in the review packet', () => {
  const projected = projectReport('release-readiness.json', {
    status: 'blocked',
    checks: [{ name: 'typecheck', status: 'failed', output: 'private raw output' }],
  });
  const packet = buildReviewPacket([projected]);
  assert.equal(packet.payload.reports[0].checks.failed, 1);
  assert.equal(packet.payload.reports[0].failedChecks[0].id, 'typecheck');
  assert.equal(JSON.stringify(packet.payload).includes('private raw output'), false);
});

test('performance-budget evidence is minimized for OpenAI review without source contents', () => {
  const performance = projectReport('osgard-performance-budget.json', {
    schema: 'osgard.performance-budget.v1',
    status: 'ready',
    summary: { checks: 11, passed: 9, failed: 0, warnings: 2 },
    budget: { sha256: 'd'.repeat(64) },
    metrics: {
      criticalGzipBytes: 345678,
      inventorySha256: 'e'.repeat(64),
      html: { rawBytes: 4300, gzipBytes: 1500, brotliBytes: 1200 },
      js: { count: 3, rawBytes: 1100000, gzipBytes: 297000, brotliBytes: 270000,
        largestFile: { path: 'assets/main.js', rawBytes: 530000, gzipBytes: 132000, brotliBytes: 120000 },
        largestGzipFile: { path: 'assets/main.js', rawBytes: 530000, gzipBytes: 132000, brotliBytes: 120000 } },
      css: { count: 1, rawBytes: 312000, gzipBytes: 61000, brotliBytes: 52000,
        largestFile: { path: 'assets/main.css', rawBytes: 312000, gzipBytes: 61000, brotliBytes: 52000 },
        largestGzipFile: { path: 'assets/main.css', rawBytes: 312000, gzipBytes: 61000, brotliBytes: 52000 } },
      sourceMapFiles: [],
    },
    checks: [
      { id: 'perf:js-total-gzip', status: 'passed', title: 'Combined JS is within budget', detail: '297000 bytes' },
      { id: 'perf:large-chunk-advisory', status: 'warning', title: 'Consider code splitting', detail: 'assets/main.js' },
    ],
  });
  assert.equal(performance.performance.criticalGzipBytes, 345678);
  assert.equal(performance.performance.js.gzipBytes, 297000);
  assert.equal(performance.performance.css.largestFile.path, 'assets/main.css');
  const packet = buildReviewPacket([performance]);
  const encoded = JSON.stringify(packet.payload);
  assert.equal(encoded.includes('sourceMapFiles'), false);
  assert.equal(encoded.includes('assets/main.js'), true);
  assert.equal(packet.payload.policy.sourceCodeIncluded, false);
  assert.equal(packet.payload.policy.playerDataIncluded, false);
});
test('manual OpenAI review remains opt-in and includes all four minimized evidence reports', async () => {
  const workflow = await readFile(resolve('.github/workflows/osgard-ai-release-review.yml'), 'utf8');
  const reviewer = await readFile(resolve('scripts/osgard-ai-release-review.mjs'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /type:\s*boolean\s*\n\s*default:\s*false/);
  assert.match(workflow, /if:\s*\$\{\{ inputs\.use_openai \}\}/);
  assert.ok(workflow.includes('npm run qa:performance-budget'));
  assert.ok(workflow.includes('--report release-readiness.json --report osgard-contract-audit.json --report osgard-performance-budget.json --report release-attestation.json --send-to-openai'));
  assert.ok(reviewer.includes("'osgard-performance-budget.json'"), 'performance report must be explicitly allow-listed');
});
test('assessment validator rejects malformed model outputs and sanitizes secrets', () => {
  assert.throws(() => validateAssessment({ recommendation: 'ship' }), /schema/i);
  const valid = validateAssessment(assessment({ summary: 'Key sk-Abcdefghijklmnopqrst must be redacted.' }));
  assert.equal(valid.humanReviewRequired, true);
  assert.equal(valid.summary.includes('sk-Abcdefghijklmnopqrst'), false);
});

test('deterministic blocked checks override optimistic AI recommendations', () => {
  const blocked = projectReport('release-readiness.json', {
    status: 'ready',
    checks: [{ name: 'security-scan', status: 'failed', output: 'ignored' }],
  });
  const result = applyDeterministicOverrides(assessment({ recommendation: 'ready', overallRisk: 'low' }), [blocked]);
  assert.equal(result.recommendation, 'hold');
  assert.equal(result.overallRisk, 'critical');
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.blockers[0].id, 'OSGARD-DETERMINISTIC-QA-BLOCK');
});

test('OpenAI request uses Responses API, store=false and strict structured output', async () => {
  let captured;
  const expected = assessment();
  const output = {
    status: 'completed',
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify(expected) }],
    }],
  };
  const parsed = await requestOpenAIReview({ reports: [{ name: 'release-readiness.json', status: 'ready' }] }, {
    apiKey: 'test-only-not-a-real-key',
    model: 'gpt-6-sol',
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify(output), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.model, 'gpt-6-sol');
  assert.equal(captured.body.text.format.type, 'json_schema');
  assert.equal(captured.body.text.format.strict, true);
  assert.equal('tools' in captured.body, false);
  assert.equal(parsed.humanReviewRequired, true);
});

test('review output cannot escape repository root or target protected manifests', async () => {
  await assert.rejects(writePrivateJson('../package.json', { overwritten: true }), /root-level JSON filename/i);
  await assert.rejects(writePrivateJson('.github/workflows/pwn.json', { overwritten: true }), /root-level JSON filename/i);
  await assert.rejects(writePrivateJson('package.json', { overwritten: true }), /safe root-level report path/i);
});
test('OpenAI request refuses to run without a key before calling fetch', async () => {
  let called = false;
  await assert.rejects(
    requestOpenAIReview({ reports: [] }, {
      apiKey: '',
      fetchImpl: async () => { called = true; throw new Error('must not run'); },
    }),
    /OPENAI_API_KEY is missing/,
  );
  assert.equal(called, false);
});

test('OpenAI HTTP errors do not include raw server response content', async () => {
  await assert.rejects(
    requestOpenAIReview({ reports: [] }, {
      apiKey: 'test-only-not-a-real-key',
      fetchImpl: async () => new Response('secret internal error body', { status: 429 }),
    }),
    error => error.message.includes('HTTP 429') && !error.message.includes('secret internal error body'),
  );
});
