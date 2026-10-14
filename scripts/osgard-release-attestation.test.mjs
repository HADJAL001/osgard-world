import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/osgard-release-attestation.mjs');
async function fixture() {
  const base = await mkdtemp(join(tmpdir(), 'osgard-attest-'));
  const root = join(base, 'dist');
  const report = join(base, 'release-attestation.json');
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<!doctype html><title>fixture</title>');
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("ok");');
  return { base, root, report };
}
function run(command, root, report, contractReport = null, performanceReport = null) {
  const args = [script, command, '--root', root, command === 'create' ? '--output' : '--input', report];
  if (contractReport) args.push('--contract-report', contractReport);
  if (performanceReport) args.push('--performance-report', performanceReport);
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}
async function writePassingContractReport(path) {
  await writeFile(path, JSON.stringify({
    schema: 'osgard.contract-integrity.v1',
    generatedAt: '2026-10-14T00:00:00.000Z',
    status: 'ready',
    summary: { checks: 3, passed: 3, failed: 0, warnings: 0 },
    contract: { sha256: 'a'.repeat(64) },
    checks: [
      { id: 'catalog', title: 'catalog matches manifest', status: 'passed' },
      { id: 'routes', title: 'route matrix covers game launch paths', status: 'passed' },
      { id: 'privacy', title: 'analytics remains consent gated', status: 'passed' },
    ],
  }, null, 2) + '\n');
}
test('create and verify a valid static build', async () => {
  const f = await fixture();
  try {
    const created = run('create', f.root, f.report);
    assert.equal(created.status, 0, created.stderr);
    const attestation = JSON.parse(await readFile(f.report, 'utf8'));
    assert.equal(attestation.schema, 'osgard.release-attestation.v1');
    assert.equal(attestation.artifact.fileCount, 2);
    assert.match(attestation.artifact.rootSha256, /^[a-f0-9]{64}$/);
    assert.equal(attestation.files[0].path, 'assets/app.js');
    const verified = run('verify', f.root, f.report);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).status, 'verified');
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('release attestation binds the exact passing contract report', async () => {
  const f = await fixture();
  const contractReport = join(f.base, 'osgard-contract-audit.json');
  try {
    await writePassingContractReport(contractReport);
    const created = run('create', f.root, f.report, contractReport);
    assert.equal(created.status, 0, created.stderr);
    const attestation = JSON.parse(await readFile(f.report, 'utf8'));
    assert.equal(attestation.qualityGate.schema, 'osgard.contract-integrity.v1');
    assert.equal(attestation.qualityGate.contractFingerprint, 'a'.repeat(64));
    assert.match(attestation.qualityGate.reportSha256, /^[a-f0-9]{64}$/);
    assert.equal(attestation.qualityGate.checkCount, 3);
    const verified = run('verify', f.root, f.report, contractReport);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).qualityGateVerified, true);

    await writePassingContractReport(contractReport);
    await writeFile(contractReport, (await readFile(contractReport, 'utf8')).replace('catalog matches manifest', 'catalog was silently changed'));
    const mismatch = run('verify', f.root, f.report, contractReport);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /quality-gate report mismatch/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('release attestation refuses a blocked contract report', async () => {
  const f = await fixture();
  const contractReport = join(f.base, 'osgard-contract-audit.json');
  try {
    await writePassingContractReport(contractReport);
    const blocked = JSON.parse(await readFile(contractReport, 'utf8'));
    blocked.status = 'blocked';
    blocked.summary.failed = 1;
    blocked.summary.passed = 2;
    blocked.checks[0].status = 'failed';
    await writeFile(contractReport, JSON.stringify(blocked));
    const result = run('create', f.root, f.report, contractReport);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /quality gate is missing, blocked, or malformed/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
async function writePassingPerformanceReport(path) {
  await writeFile(path, JSON.stringify({
    schema: 'osgard.performance-budget.v1',
    generatedAt: '2026-10-14T00:00:00.000Z',
    status: 'ready',
    summary: { checks: 2, passed: 2, failed: 0, warnings: 0 },
    budgets: { criticalGzipBytes: 524288 },
    metrics: { criticalGzipBytes: 1234, js: { gzipBytes: 800 }, css: { gzipBytes: 200 } },
    budget: { sha256: 'd'.repeat(64) },
    checks: [
      { id: 'perf:js-total-gzip', title: 'JS bytes are within budget', status: 'passed' },
      { id: 'perf:critical-gzip', title: 'Critical transfer is within budget', status: 'passed' },
    ],
  }, null, 2) + '\n');
}
test('release attestation binds the exact passing performance report', async () => {
  const f = await fixture();
  const performanceReport = join(f.base, 'osgard-performance-budget.json');
  try {
    await writePassingPerformanceReport(performanceReport);
    const created = run('create', f.root, f.report, null, performanceReport);
    assert.equal(created.status, 0, created.stderr);
    const attestation = JSON.parse(await readFile(f.report, 'utf8'));
    assert.equal(attestation.performanceGate.schema, 'osgard.performance-budget.v1');
    assert.equal(attestation.performanceGate.budgetFingerprint, 'd'.repeat(64));
    assert.match(attestation.performanceGate.reportSha256, /^[a-f0-9]{64}$/);
    assert.equal(attestation.performanceGate.criticalGzipBytes, 1234);
    const verified = run('verify', f.root, f.report, null, performanceReport);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).performanceGateVerified, true);
    await writePassingPerformanceReport(performanceReport);
    const modified = JSON.parse(await readFile(performanceReport, 'utf8'));
    modified.metrics.criticalGzipBytes = 2345;
    await writeFile(performanceReport, JSON.stringify(modified));
    const mismatch = run('verify', f.root, f.report, null, performanceReport);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /performance report mismatch/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('release attestation refuses a blocked performance report', async () => {
  const f = await fixture();
  const performanceReport = join(f.base, 'osgard-performance-budget.json');
  try {
    await writePassingPerformanceReport(performanceReport);
    const blocked = JSON.parse(await readFile(performanceReport, 'utf8'));
    blocked.status = 'blocked';
    blocked.summary.failed = 1;
    blocked.summary.passed = 1;
    blocked.checks[0].status = 'failed';
    await writeFile(performanceReport, JSON.stringify(blocked));
    const result = run('create', f.root, f.report, null, performanceReport);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /performance budget is missing, blocked, or malformed/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('verification detects modified files', async () => {
  const f = await fixture();
  try {
    assert.equal(run('create', f.root, f.report).status, 0);
    await writeFile(join(f.root, 'assets', 'app.js'), 'console.log("changed");');
    const result = run('verify', f.root, f.report);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /integrity mismatch/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('verification detects an added or missing file', async () => {
  const f = await fixture();
  try {
    assert.equal(run('create', f.root, f.report).status, 0);
    await writeFile(join(f.root, 'added.txt'), 'unexpected');
    const added = run('verify', f.root, f.report);
    assert.notEqual(added.status, 0);
    await rm(join(f.root, 'added.txt'));
    await rm(join(f.root, 'assets', 'app.js'));
    const missing = run('verify', f.root, f.report);
    assert.notEqual(missing.status, 0);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('generation refuses credential-like filenames', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.root, '.env.production'), 'SHOULD_NOT_SHIP=true');
    const result = run('create', f.root, f.report);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Potential private configuration/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('generation refuses symlinks in the release tree', async () => {
  const f = await fixture();
  try {
    const outside = join(f.base, 'outside.txt');
    await writeFile(outside, 'outside');
    await symlink(outside, join(f.root, 'linked.txt'));
    const result = run('create', f.root, f.report);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Symbolic link/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('generation requires a non-empty root entry point', async () => {
  const f = await fixture();
  try {
    await rm(join(f.root, 'index.html'));
    const result = run('create', f.root, f.report);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /root index\.html/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('attestation cannot be written inside dist', async () => {
  const f = await fixture();
  try {
    const result = spawnSync(process.execPath, [script, 'create', '--root', f.root, '--output', join(f.root, 'attestation.json')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /outside the build root/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('malformed attestation cannot silently verify', async () => {
  const f = await fixture();
  try {
    await writeFile(f.report, JSON.stringify({ schema: 'wrong', files: [] }));
    const result = run('verify', f.root, f.report);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /malformed/i);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
