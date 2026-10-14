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

test('contract audit and artifact attestation are summarized for optional OpenAI review', () => {
  const contract = projectReport('osgard-contract-audit.json', {
    schema: 'osgard.contract-integrity.v1',
    status: 'ready',
    summary: { checks: 32, passed: 32, failed: 0, warnings: 0 },
    contract: { worldCount: 7, gameCount: 11, eventCount: 20, diagnosticCheckCount: 30, productionRouteCount: 112, sha256: 'a'.repeat(64) },
    checks: [
      { id: 'catalog:manifest', status: 'passed', title: 'Catalogue matches the canonical game manifest' },
      { id: 'privacy:consent', status: 'failed', title: 'Privacy check', detail: 'OPENAI_API_KEY=sk-this-secret-must-never-leak' },
    ],
  });
  const attestation = projectReport('release-attestation.json', {
    schema: 'osgard.release-attestation.v1',
    status: 'verified',
    artifact: { fileCount: 640, totalBytes: 12000000, rootSha256: 'b'.repeat(64), warnings: [], largestFiles: [] },
    qualityGate: {
      schema: 'osgard.contract-integrity.v1',
      reportSha256: 'c'.repeat(64),
      contractFingerprint: 'a'.repeat(64),
      checkCount: 32,
      passed: 32,
      warnings: 0,
    },
  });
  const packet = buildReviewPacket([contract, attestation]);
  const encoded = JSON.stringify(packet.payload);
  assert.equal(packet.payload.reports.length, 2);
  assert.equal(packet.payload.reports[0].contract.gameCount, 11);
  assert.equal(packet.payload.reports[0].checks.failed, 1);
  assert.equal(packet.payload.reports[1].qualityGate.contractFingerprint, 'a'.repeat(64));
  assert.equal(packet.payload.policy.sourceCodeIncluded, false);
  assert.equal(packet.payload.policy.playerDataIncluded, false);
  assert.equal(encoded.includes('sk-this-secret-must-never-leak'), false);
  assert.equal(encoded.includes('OPENAI_API_KEY='), false);
});
test('manual OpenAI workflow is opt-in and includes contract plus build-attestation evidence', async () => {
  const workflow = await readFile(resolve('.github/workflows/osgard-ai-release-review.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /type:\s*boolean\s*\n\s*default:\s*false/);
  assert.match(workflow, /if:\s*\$\{\{ inputs\.use_openai \}\}/);
  assert.ok(!/^\s{2}(?:pull_request|push):/m.test(workflow), 'OpenAI review must not run automatically on source pushes or PRs');
  assert.ok(workflow.includes('npm run qa:contracts'), 'review workflow must produce contract evidence');
  assert.ok(workflow.includes('npm run release:attest') && workflow.includes('npm run release:verify'), 'review workflow must verify the exact build attestation');
  assert.ok(workflow.includes('--report release-readiness.json --report osgard-contract-audit.json --report release-attestation.json --send-to-openai'),
    'review request must contain only the three minimized machine reports');
  assert.ok(workflow.includes('The full qa:contracts command did not pass'), 'contract-command failures must be encoded as blocked evidence');
  assert.ok(workflow.includes("status:'blocked'"), 'build/attestation failures must be encoded as blocked evidence');
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
