import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditPerformanceBudget } from './osgard-performance-budget.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'osgard-budget-'));
  await writeFile(join(root, 'index.html'), '<!doctype html><html><body>ok</body></html>');
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("ok");');
  await writeFile(join(root, 'assets', 'app.css'), 'body{margin:0}');
  return root;
}

test('healthy distribution passes and produces a stable contract fingerprint', async () => {
  const root = await fixture();
  try {
    const first = await auditPerformanceBudget(root);
    const second = await auditPerformanceBudget(root);
    assert.equal(first.status, 'ready');
    assert.equal(first.summary.failed, 0);
    assert.equal(first.transferEstimate.textAssets, 3);
    assert.ok(first.transferEstimate.gzipBytes > 0);
    assert.match(first.sha256, /^[a-f0-9]{64}$/);
    assert.equal(first.sha256, second.sha256, 'fingerprint excludes volatile generation time');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('an oversized JavaScript asset blocks the budget gate', async () => {
  const root = await fixture();
  try {
    await writeFile(join(root, 'assets', 'oversized.js'), Buffer.alloc(641 * 1024, 65));
    const report = await auditPerformanceBudget(root);
    assert.equal(report.status, 'blocked');
    assert.ok(report.checks.some(item => item.id === 'asset:javascript-file:assets/oversized.js' && item.status === 'failed'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing entrypoint blocks the distribution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'osgard-budget-empty-'));
  try {
    const report = await auditPerformanceBudget(root);
    assert.equal(report.status, 'blocked');
    assert.ok(report.checks.some(item => item.id === 'entrypoint:index-html' && item.status === 'failed'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('symbolic links are rejected instead of followed', async () => {
  const root = await fixture();
  const external = join(root, 'outside.txt');
  const link = join(root, 'assets', 'escape.js');
  try {
    await writeFile(external, 'not part of dist');
    await symlink(external, link);
    const report = await auditPerformanceBudget(root);
    assert.equal(report.status, 'blocked');
    assert.ok(report.checks.some(item => item.id === 'filesystem:no-symlinks:assets/escape.js' && item.status === 'failed'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('report is written as machine-readable JSON when requested', async () => {
  const root = await fixture();
  const reportPath = join(root, '..', 'osgard-budget-report.json');
  try {
    const report = await auditPerformanceBudget(root, { reportPath });
    const parsed = JSON.parse(await readFile(reportPath, 'utf8'));
    assert.equal(parsed.sha256, report.sha256);
    assert.equal(parsed.status, 'ready');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(reportPath, { force: true });
  }
});
