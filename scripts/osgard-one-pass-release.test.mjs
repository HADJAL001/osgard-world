import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { buildPlan, evaluateExternalReport, runStep, summarizeReport, validatePlan } from './osgard-one-pass-release.mjs';

test('the full one-pass plan has unique IDs, bounded timeouts, and valid npm targets', () => {
  const plan = buildPlan();
  const checked = validatePlan(plan);
  assert.ok(checked.count >= 20, 'plan should cover the whole ecosystem');
  assert.equal(new Set(checked.ids).size, checked.count);
  assert.ok(plan.every(step => Number.isSafeInteger(step.timeoutMs) && step.timeoutMs >= 1000 && step.timeoutMs <= 45 * 60 * 1000));
  assert.ok(plan.some(step => step.id === 'full-release-readiness' && step.critical));
  assert.ok(plan.some(step => step.id === 'external-homepage-http' && !step.critical));
});

test('plan validation rejects duplicate IDs and unknown npm scripts', () => {
  const base = { id: 'demo-step', label: 'Demo', command: 'node', args: ['-e', 'process.exit(0)'], critical: true };
  assert.throws(() => validatePlan([base, { ...base }], {}), /Duplicate one-pass step ID/);
  assert.throws(() => validatePlan([{ ...base, command: 'npm', args: ['run', 'made-up-script'] }], {}), /Undefined npm script/);
});

test('plan validation rejects unsafe timeout values', () => {
  const step = { id: 'demo-step', label: 'Demo', command: 'node', args: ['-e', '0'], timeoutMs: 20 };
  assert.throws(() => validatePlan([step], {}), /Invalid timeout/);
});

test('summary distinguishes blockers, review requirements, and all-pass source readiness', () => {
  assert.equal(summarizeReport([{status:'PASS'}, {status:'BLOCK'}]).status, 'BLOCKED');
  assert.equal(summarizeReport([{status:'PASS'}, {status:'REVIEW'}]).status, 'REVIEW_REQUIRED');
  assert.equal(summarizeReport([{status:'PASS'}]).status, 'SOURCE_READY_FOR_OPERATOR_REVIEW');
  assert.throws(() => summarizeReport(null), /steps must be an array/);
});

test('external health report rejects malformed, unsafe, or impossible counts', () => {
  assert.equal(evaluateExternalReport(null).status, 'REVIEW');
  assert.equal(evaluateExternalReport({projectCount: 0, reachableCount: 0}).status, 'REVIEW');
  assert.equal(evaluateExternalReport({projectCount: 4, reachableCount: 5}).status, 'REVIEW');
  assert.equal(evaluateExternalReport({projectCount: Number.MAX_SAFE_INTEGER + 1, reachableCount: 1}).status, 'REVIEW');
  assert.equal(evaluateExternalReport({projectCount: 4, reachableCount: 2, unavailableCount: -1}).status, 'REVIEW');
  assert.equal(evaluateExternalReport({projectCount: 4, reachableCount: 4, unavailableCount: 0}).status, 'PASS');
  assert.equal(evaluateExternalReport({projectCount: 4, reachableCount: 3, unavailableCount: 1}).status, 'REVIEW');
});

test('runStep records successful execution and process output', () => {
  const step = {
    id: 'unit-success', label: 'Unit success', command: process.execPath,
    args: ['-e', 'console.log("test-output"); process.exit(0)'], timeoutMs: 5000,
  };
  const record = runStep(step);
  assert.equal(record.status, 'PASS');
  assert.equal(record.exitCode, 0);
  assert.equal(record.timedOut, false);
  assert.match(record.outputTail, /test-output/);
  assert.equal(record.timeoutMs, 5000);
});

test('runStep blocks critical failures and redacts common secret patterns', () => {
  const step = {
    id: 'unit-failure', label: 'Unit failure', command: process.execPath,
    args: ['-e', 'console.error("sk_live_123456789abcdef"); process.exit(7)'], timeoutMs: 5000,
  };
  const record = runStep(step);
  assert.equal(record.status, 'BLOCK');
  assert.equal(record.exitCode, 7);
  assert.doesNotMatch(record.outputTail, /sk_live_123456789abcdef/);
  assert.match(record.outputTail, /\[REDACTED_SECRET\]/);
});

test('runStep stops a hung command at its timeout', () => {
  const step = {
    id: 'unit-timeout', label: 'Unit timeout', command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 5000)'], timeoutMs: 1000,
  };
  const record = runStep(step);
  assert.equal(record.timedOut, true);
  assert.equal(record.status, 'BLOCK');
  assert.match(record.detail, /timed out after 1000 ms/);
});

test('a timed-out optional external stage remains review-only', () => {
  const step = {
    id: 'unit-optional-timeout', label: 'Optional timeout', command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 5000)'], timeoutMs: 1000, critical: false, kind: 'qa',
  };
  const record = runStep(step);
  assert.equal(record.timedOut, true);
  assert.equal(record.status, 'REVIEW');
});

test('a failed external audit process cannot be overridden by a stale positive report', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'osgard-external-gate-'));
  const reportPath = path.join(base, 'external.json');
  try {
    await writeFile(reportPath, JSON.stringify({projectCount: 10, reachableCount: 10, unavailableCount: 0}));
    const step = {
      id: 'unit-external-failed', label: 'External failed', command: process.execPath,
      args: ['-e', 'process.exit(3)'], timeoutMs: 5000, critical: false, kind: 'external',
    };
    const record = runStep(step, { externalReportPath: reportPath });
    assert.equal(record.status, 'REVIEW');
    assert.match(record.detail, /process exited with code 1|process exited with code 3/);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('external report assessment does not imply promotion authorization', () => {
  const result = evaluateExternalReport({projectCount: 10, reachableCount: 10, paidPromotionReviewCount: 10});
  assert.equal(result.status, 'PASS');
  assert.match(result.detail, /human review/);
});

console.log('OSGARD one-pass runner tests: timeouts, allow-listed plan validation, redaction, report classification, external-health safety.');
