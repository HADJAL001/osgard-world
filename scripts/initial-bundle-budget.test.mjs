import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditInitialBundle, collectInitialJavaScriptRefs } from './initial-bundle-budget.mjs';

async function fixture(html) {
  const root = await mkdtemp(join(tmpdir(), 'osgard-performance-'));
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), html);
  return root;
}

test('initial bundle accounting counts entry and modulepreloads once', async () => {
  const root = await fixture('<link rel="modulepreload" href="/assets/react.js"><script type="module" src="/assets/index.js"></script><link rel="modulepreload" href="/assets/react.js">');
  try {
    await writeFile(join(root, 'assets', 'react.js'), 'r'.repeat(200));
    await writeFile(join(root, 'assets', 'index.js'), 'i'.repeat(300));
    await writeFile(join(root, 'assets', 'lazy.js'), 'l'.repeat(900));
    const report = await auditInitialBundle(root, { maxInitialJsBytes: 600, maxInitialChunkBytes: 400, maxAnyChunkBytes: 1000 });
    assert.equal(report.status, 'ready');
    assert.equal(report.initialJsBytes, 500);
    assert.equal(report.initialChunkCount, 2);
    assert.equal(report.allJavaScriptChunkCount, 3);
    assert.equal(report.largestChunk.path, 'assets/lazy.js');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('initial bundle budget blocks oversized entry bytes', async () => {
  const root = await fixture('<script type="module" src="/assets/index.js"></script>');
  try {
    await writeFile(join(root, 'assets', 'index.js'), 'x'.repeat(900));
    const report = await auditInitialBundle(root, { maxInitialJsBytes: 800, maxInitialChunkBytes: 1000, maxAnyChunkBytes: 1000 });
    assert.equal(report.status, 'blocked');
    assert.equal(report.checks.find(item => item.id === 'initial-js-budget').status, 'failed');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing modulepreload assets fail closed', async () => {
  const root = await fixture('<link rel="modulepreload" href="/assets/missing.js"><script type="module" src="/assets/index.js"></script>');
  try {
    await writeFile(join(root, 'assets', 'index.js'), 'ok');
    await assert.rejects(() => auditInitialBundle(root), /asset is missing/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('external and traversal module paths are rejected', () => {
  assert.throws(() => collectInitialJavaScriptRefs('<script type="module" src="https://evil.example/index.js"></script>'), /same-origin/i);
  assert.throws(() => collectInitialJavaScriptRefs('<script type="module" src="/assets/../secret.js"></script>'), /same-origin|unsafe/i);
});

test('zero-entry page cannot accidentally pass a budget', async () => {
  const root = await fixture('<html><head></head><body>No application entry</body></html>');
  try { await assert.rejects(() => auditInitialBundle(root), /No initial module script/i); }
  finally { await rm(root, { recursive: true, force: true }); }
});
