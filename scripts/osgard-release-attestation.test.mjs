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
function run(command, root, report) {
  const args = [script, command, '--root', root, command === 'create' ? '--output' : '--input', report];
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
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
test('root fingerprint is deterministic for identical artifact bytes', async () => {
  const f = await fixture();
  try {
    assert.equal(run('create', f.root, f.report).status, 0);
    const first = JSON.parse(await readFile(f.report, 'utf8'));
    assert.equal(run('create', f.root, f.report).status, 0);
    const second = JSON.parse(await readFile(f.report, 'utf8'));
    assert.equal(first.artifact.rootSha256, second.artifact.rootSha256);
    assert.deepEqual(first.files, second.files);
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('build inventory reports large JavaScript bundles without silently hiding them', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.root, 'assets', 'large.js'), 'x'.repeat(610 * 1024));
    assert.equal(run('create', f.root, f.report).status, 0);
    const report = JSON.parse(await readFile(f.report, 'utf8'));
    assert.ok(report.artifact.warnings.some(item => item.code === 'large-javascript' && item.path === 'assets/large.js'));
  } finally { await rm(f.base, { recursive: true, force: true }); }
});
test('attestation records hashes and paths but never embeds file contents', async () => {
  const f = await fixture();
  const sentinel = 'PRIVATE_CONTENT_SENTINEL_DO_NOT_EXPORT_9f2a';
  try {
    await writeFile(join(f.root, 'index.html'), '<!doctype html><p>' + sentinel + '</p>');
    const created = run('create', f.root, f.report);
    assert.equal(created.status, 0, created.stderr);
    const reportText = await readFile(f.report, 'utf8');
    assert.ok(!reportText.includes(sentinel), 'attestation must not store the contents of public build files');
    const report = JSON.parse(reportText);
    assert.ok(report.files.some(file => file.path === 'index.html' && /^[a-f0-9]{64}$/.test(file.sha256)));
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
